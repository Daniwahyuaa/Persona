import { supabase } from './supabaseClient.js'

// Kategori 9-Box, urutan & mapping ke class badge (meniru nbOrder di index.html)
export const NINEBOX_ORDER = [
  { key: 'HIGH POTENTIAL', badge: 'badge-hp' },
  { key: 'PROMOTABLE', badge: 'badge-pr' },
  { key: 'SOLID CONTRIBUTOR', badge: 'badge-sc' },
  { key: 'SLEEPING TIGER', badge: 'badge-st' },
  { key: 'UNFIT', badge: 'badge-un' },
]

export function nineboxBadgeClass(ninebox) {
  const found = NINEBOX_ORDER.find((n) => n.key === String(ninebox || '').toUpperCase())
  return found ? found.badge : 'badge-null'
}

// Marker "Top History" pada akhir teks achievement — disalin persis dari
// TP_TOP_RE di index.html asli. Dipakai untuk memisahkan item Top X dari
// riwayat biasa (development/project/awarding) tanpa perlu kolom baru di DB.
export const TOP_HISTORY_RE = /\s*\(Top History\)\s*$/i

/**
 * Cari karyawan berdasarkan nama/NIK + filter opsional (grup, unit kerja, level jabatan).
 * Meniru tpSearchSuggest()/tpDoSearch() di index.html.
 */
export async function searchKaryawan({ query = '', grup = '', unitKerja = '', level = '' } = {}) {
  let q = supabase.from('karyawan').select('nik, nama, posisi, grup, unit_kerja, level_jabatan').limit(30)

  if (query.trim()) {
    q = q.or(`nama.ilike.%${query.trim()}%,nik.ilike.%${query.trim()}%`)
  }
  if (grup) q = q.eq('grup', grup)
  if (unitKerja) q = q.eq('unit_kerja', unitKerja)
  if (level) q = q.eq('level_jabatan', level)

  const { data, error } = await q
  if (error) throw error
  return data || []
}

/** Ambil daftar unik untuk isi dropdown filter (Grup, Unit Kerja, Level Jabatan). */
export async function getKaryawanFilterOptions() {
  const { data, error } = await supabase.from('karyawan').select('grup, unit_kerja, level_jabatan')
  if (error) throw error
  const uniq = (field) => [...new Set((data || []).map((r) => r[field]).filter(Boolean))].sort()
  return {
    grup: uniq('grup'),
    unitKerja: uniq('unit_kerja'),
    level: uniq('level_jabatan'),
  }
}

/**
 * Ambil semua data untuk halaman Talent Profile satu orang (nik), gabungan dari
 * karyawan + asesmen + cli_soft + cli_hard + kpi + nine_box + employee_history
 * + job_rotation (Career Journey).
 * Meniru getAllData()+_filterDataForOwnNik() tapi query per-NIK langsung (lebih
 * ringan daripada tarik semua data lalu difilter di client).
 *
 * Catatan: tabel "asesmen" sekarang format panjang (1 baris = 1 kompetensi),
 * jadi 1 event asesmen (nik+jenis_asesmen+tanggal+lembaga) bisa berupa banyak
 * baris. asesmenTerakhir di bawah mengelompokkan baris-baris dengan
 * jenis_asesmen+tanggal+lembaga yang sama dari baris paling atas (nik sudah
 * diurutkan tanggal desc), lalu kumpulkan semua kompetensinya jadi satu event.
 */
export async function getTalentProfile(nik) {
  if (!nik) return null

  // Karyawan wajib berhasil — kalau ini gagal, memang tidak ada datanya untuk ditampilkan.
  const karyawanRes = await supabase.from('karyawan').select('*').eq('nik', nik).maybeSingle()
  if (karyawanRes.error) throw karyawanRes.error
  const karyawan = karyawanRes.data
  if (!karyawan) return null

  // Query lainnya bersifat pelengkap — kalau salah satu tabel belum ada/gagal
  // (misalnya tabel "nine_box" belum dibuat di Supabase), JANGAN sampai
  // menggagalkan seluruh profil. Cukup anggap kosong untuk bagian itu saja,
  // supaya Career Journey/Development/Project/Awarding tetap tampil normal.
  const safeQuery = async (promise, fallback) => {
    try {
      const { data, error } = await promise
      if (error) {
        console.warn('[talentProfileApi] query gagal, dilewati:', error.message || error)
        return fallback
      }
      return data ?? fallback
    } catch (e) {
      console.warn('[talentProfileApi] query gagal, dilewati:', e?.message || e)
      return fallback
    }
  }

  const [asesmenRows, cliSoftRows, cliHardRows, kpiRows, nineBoxData, history, jobRotationRows] = await Promise.all([
    safeQuery(supabase.from('asesmen').select('*').eq('nik', nik).order('tanggal', { ascending: false }), []),
    safeQuery(supabase.from('cli_soft').select('nama_kompetensi, nilai, hasil').eq('nik', nik), []),
    safeQuery(supabase.from('cli_hard').select('nama_kompetensi, nilai, hasil').eq('nik', nik), []),
    safeQuery(supabase.from('kpi').select('tahun, skor, perf_rating').eq('nik', nik).order('tahun', { ascending: true }), []),
    safeQuery(supabase.from('nine_box').select('*').eq('nik', nik).maybeSingle(), null),
    safeQuery(
      supabase.from('employee_history').select('*').eq('nik', nik).eq('hidden', false).order('tahun', { ascending: false }),
      []
    ),
    // Career Journey — tabel job_rotation, 1 baris = 1 periode jabatan (kolom
    // sesuai job_rotation.csv: posisi, unit_kerja, tanggal_mulai, tanggal_selesai, dst).
    safeQuery(
      supabase.from('job_rotation').select('*').eq('nik', nik).order('tanggal_mulai', { ascending: false }),
      []
    ),
  ])

  // Kategori 9-box resmi datang dari sheet "Sumber 9box" (tabel nine_box).
  // Kalau belum ada datanya, fallback ke kolom karyawan.ninebox (biasanya kosong).
  if (nineBoxData?.box_label) {
    karyawan.ninebox = nineBoxData.box_label.toUpperCase()
  }

  // Kelompokkan baris-baris asesmen (format panjang per-kompetensi) milik
  // event terbaru (jenis_asesmen + tanggal + lembaga yang sama) jadi 1 objek.
  let asesmenTerakhir = null
  if (asesmenRows.length > 0) {
    const top = asesmenRows[0]
    const kompetensi = asesmenRows.filter(
      (r) => r.jenis_asesmen === top.jenis_asesmen && r.tanggal === top.tanggal && r.lembaga === top.lembaga
    )
    asesmenTerakhir = {
      tipe_asesmen: top.jenis_asesmen,
      tanggal: top.tanggal,
      lembaga: top.lembaga,
      rekomendasi: top.rekomendasi,
      kompetensi: kompetensi.map((k) => ({ kode: k.kode_kompetensi, nama: k.kompetensi, skor: k.skor })),
    }
  }

  const summarizeCli = (rows) => {
    const diukur = rows?.length || 0
    const benar = rows?.filter((r) => r.hasil === 1).length || 0
    const rerata = diukur > 0 ? Math.round((benar / diukur) * 100) : null
    return { diukur, benar, rerata, items: rows || [] }
  }

  const byKategori = (kategori) => history.filter((h) => h.kategori === kategori)

  // "Top History" ditandai dengan suffix " (Top History)" pada achievement saat
  // disimpan lewat Edit Profile — disalin persis dari TP_TOP_RE di index.html asli.
  // Item yang bertanda ini dipisah ke kartu "Top X" tersendiri (suffix dibuang
  // sebelum ditampilkan), sisanya tetap di kartu biasa.
  const splitTopHistory = (items) => {
    const regular = []
    const top = []
    for (const it of items) {
      if (TOP_HISTORY_RE.test(it.achievement || '')) {
        top.push({ ...it, achievement: (it.achievement || '').replace(TOP_HISTORY_RE, '') })
      } else {
        regular.push(it)
      }
    }
    return { regular, top }
  }

  const devSplit = splitTopHistory(byKategori('development'))
  const projSplit = splitTopHistory(byKategori('project'))
  const awdSplit = splitTopHistory(byKategori('awarding'))

  // Career Journey — dari tabel job_rotation (bukan employee_history lagi).
  // 1 baris job_rotation = 1 periode jabatan; tahun diambil dari tanggal_mulai
  // (fallback tanggal_selesai kalau tanggal_mulai kosong), sudah diurutkan
  // terbaru dulu oleh query di atas supaya jabatan terkini tampil di kiri.
  const careerJourney = jobRotationRows.map((r, i) => {
    const yearSource = r.tanggal_mulai || r.tanggal_selesai || ''
    return {
      id: r.id ?? i,
      tahun: yearSource ? String(yearSource).slice(0, 4) : '—',
      achievement: r.posisi || r.level_jabatan || '—',
      tingkatan: r.unit_kerja || '',
    }
  })

  return {
    karyawan,
    asesmenTerakhir,
    nineBox: nineBoxData || null,
    cliSoft: summarizeCli(cliSoftRows),
    cliHard: summarizeCli(cliHardRows),
    kpiRiwayat: kpiRows || [],
    careerJourney,
    development: devSplit.regular,
    developmentTop: devSplit.top,
    project: projSplit.regular,
    projectTop: projSplit.top,
    awarding: awdSplit.regular,
    awardingTop: awdSplit.top,
  }
}
