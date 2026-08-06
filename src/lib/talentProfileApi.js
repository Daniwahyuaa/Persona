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
 * Upload foto profil ke Supabase Storage (bucket "profile-photos") lalu
 * simpan URL publiknya ke kolom karyawan.foto_url. Path file selalu
 * "{nik}/foto.<ext>" — replace file lama di path yang sama (upsert) supaya
 * tidak menumpuk file yatim tiap kali ganti foto.
 */
export async function uploadProfilePhoto(nik, file) {
  if (!nik) throw new Error('NIK belum terhubung ke akun Anda — hubungi admin.')
  if (!file) throw new Error('Pilih file foto terlebih dahulu.')
  if (!file.type?.startsWith('image/')) throw new Error('File harus berupa gambar (JPG/PNG).')
  if (file.size > 3 * 1024 * 1024) throw new Error('Ukuran foto maksimal 3MB.')

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${nik}/foto.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('profile-photos')
    .upload(path, file, { upsert: true, cacheControl: '3600', contentType: file.type })
  if (uploadError) {
    // Storage bucket "profile-photos" belum dibuat di project Supabase ini —
    // ini konfigurasi project, bukan bug di kode. Beri pesan yang jelas
    // supaya admin tahu harus menjalankan bagian "STORAGE" di
    // supabase/schema.sql (SQL Editor) untuk membuat bucket + policy-nya.
    if (/bucket not found/i.test(uploadError.message || '')) {
      throw new Error(
        'Storage bucket "profile-photos" belum ada di project Supabase ini. Minta admin menjalankan bagian STORAGE pada supabase/schema.sql lewat Supabase SQL Editor, lalu coba lagi.'
      )
    }
    throw uploadError
  }

  const { data: pub } = supabase.storage.from('profile-photos').getPublicUrl(path)
  // Tempel cache-buster (timestamp) di URL supaya browser tidak menampilkan foto lama dari cache
  // setelah ganti foto dengan nama file yang sama persis.
  const fotoUrl = `${pub.publicUrl}?t=${Date.now()}`

  const { error: updateError } = await supabase.from('karyawan').update({ foto_url: fotoUrl }).eq('nik', nik)
  if (updateError) throw updateError

  return fotoUrl
}

/** Hapus foto profil (set foto_url jadi null; file di storage dibiarkan, tidak wajib dihapus). */
export async function removeProfilePhoto(nik) {
  if (!nik) throw new Error('NIK belum terhubung ke akun Anda — hubungi admin.')
  const { error } = await supabase.from('karyawan').update({ foto_url: null }).eq('nik', nik)
  if (error) throw error
}

// Kolom karyawan yang boleh diubah sendiri lewat menu Edit Profile. Sengaja
// dibatasi di sisi aplikasi (bukan hanya RLS) supaya user tidak bisa
// menyelundupkan perubahan ke kolom sensitif (sanksi, ninebox, dst.) lewat
// pemanggilan langsung — lihat juga komentar RLS "karyawan: user boleh
// update profil sendiri" di supabase/schema.sql.
const SELF_EDITABLE_FIELDS = ['grup', 'unit_kerja', 'level_jabatan', 'golongan', 'pendidikan']

/** Update data identitas milik sendiri (Grup Job Function, Unit Kerja, Level Jabatan, Golongan, Pendidikan). */
export async function updateOwnProfile(nik, fields) {
  if (!nik) throw new Error('NIK belum terhubung ke akun Anda — hubungi admin.')
  const payload = {}
  for (const key of SELF_EDITABLE_FIELDS) {
    if (key in fields) payload[key] = fields[key]?.trim ? fields[key].trim() : fields[key]
  }
  if (Object.keys(payload).length === 0) return
  const { error } = await supabase.from('karyawan').update(payload).eq('nik', nik)
  if (error) throw error
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
