import { supabase } from './supabaseClient.js'

// Pilihan dropdown — disalin persis dari Data Validation di sheet "Kolektif"
// pada 00_Form_Coach_-_SGN_CONEXT.xlsx (kolom Evaluasi Kinerja, Topik Lain,
// Rencana Aktivitas -> Aktivitas).
export const EVALUASI_KINERJA_OPTIONS = ['Kinerja/Performance']

export const TOPIK_LAIN_OPTIONS = [
  'Pengembangan Kompetensi',
  'Persiapan Promosi',
  'Persiapan Rotasi',
  'Pengembangan Karier',
  'Tindak Lanjut Assessment',
  'Lain-lain',
]

export const AKTIVITAS_OPTIONS = [
  'Training',
  'Coaching',
  'Mentoring',
  'Job Assignment',
  'Project Assignment',
  'Self Learning',
  'Lain-lain',
]

/** Baris kosong baru untuk 1 pasang Topik Lain + Hasil Diskusinya (dipakai
 *  saat "+ Tambah Topik Lain" diklik — 1 coachee bisa punya beberapa pasang). */
export function emptyTopikLainRow() {
  return {
    _key: `topik-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    topik: TOPIK_LAIN_OPTIONS[0],
    hasil_diskusi: '',
  }
}

/** Baris coachee kosong baru, dipakai saat menambah baris di tabel form. */
export function emptyCoacheeRow() {
  return {
    _key: `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    coachee_query: '',
    coachee_nik: '',
    coachee_nama: '',
    coachee_jabatan: '',
    waktu: '',
    evaluasi_kinerja: EVALUASI_KINERJA_OPTIONS[0],
    hasil_diskusi_kinerja: '',
    // Topik Lain sekarang bisa lebih dari 1 pasang (Topik + Hasil Diskusinya
    // sendiri-sendiri) -> disimpan sbg array di form. Saat disimpan, semua
    // pasangan digabung jadi 1 kolom topik_lain ("A, B") dan 1 kolom
    // hasil_diskusi_topik ("A: ...\nB: ...") supaya tidak perlu ubah skema tabel.
    topikLainRows: [emptyTopikLainRow()],
    aktivitas: AKTIVITAS_OPTIONS[0],
    deskripsi_aktivitas: '',
  }
}

/** Pisah kembali string "A, B, C" dari kolom topik_lain jadi array, dipakai
 *  saat menampilkan riwayat sesi coaching yang sudah tersimpan. */
export function parseTopikLain(value) {
  return String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * Cari data karyawan by NIK (dipakai autofill Nama/Jabatan/Usia saat NIK
 * SAP Coach atau NIK SAP Coachee diketik).
 */
export async function getKaryawanByNik(nik) {
  const nikTrim = String(nik || '').trim()
  if (!nikTrim) return null
  const { data, error } = await supabase
    .from('karyawan')
    .select('nik, nama, posisi, usia, unit_kerja')
    .eq('nik', nikTrim)
    .maybeSingle()
  if (error) throw error
  return data
}

// Ratakan string unit kerja supaya perbandingan tidak gagal cuma karena beda
// besar/kecil huruf atau spasi ganda — data "Unit Kerja" hasil input manual
// sering tidak 100% konsisten antar baris (mis. "HO Mkso Tebu" vs "HO MKSO
// TEBU " dengan spasi nyangkut di akhir).
function normalizeUnit(v) {
  return String(v || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Cari karyawan (calon coachee) berdasarkan nama/NIK, DIBATASI ke satu Unit
 * Kerja tertentu — coach hanya boleh mencari orang di unit kerjanya sendiri.
 * Tanpa unitKerja (belum diketahui / kosong), sengaja tidak mengembalikan
 * apa-apa supaya tidak bocor ke unit lain.
 *
 * Perbandingan unit kerja dilakukan di client (bukan `.eq()` di query) dan
 * dinormalisasi (trim + lowercase + rapatkan spasi) supaya tetap cocok
 * walau ada perbedaan kapitalisasi/spasi kecil pada data — ini penyebab
 * paling umum kenapa hasil pencarian tampak kosong/nama tidak muncul
 * walau orangnya sebenarnya ada di unit kerja yang sama.
 */
export async function searchKaryawanByUnitKerja(query, unitKerja) {
  const unit = normalizeUnit(unitKerja)
  const q = String(query || '').trim()
  if (!unit) return []

  let req = supabase.from('karyawan').select('nik, nama, posisi, unit_kerja').limit(200)
  if (q) req = req.or(`nama.ilike.%${q}%,nik.ilike.%${q}%`)
  const { data, error } = await req
  if (error) throw error

  return (data || []).filter((k) => normalizeUnit(k.unit_kerja) === unit).slice(0, 20)
}

/**
 * Simpan 1 sesi Coaching Session: 1 baris header (data coach) + N baris
 * coachee. Kalau insert coachee gagal, sesi header yang sudah terlanjur
 * dibuat ikut dihapus supaya tidak menyisakan sesi kosong tanpa coachee.
 */
export async function saveCoachingSession({ header, coachees, userId }) {
  if (!header.unit_kerja?.trim()) throw new Error('Unit Kerja wajib diisi.')
  if (!header.coach_nik?.trim()) throw new Error('NIK SAP Coach wajib diisi.')
  if (!header.coach_nama?.trim()) throw new Error('Nama Coach wajib diisi.')

  const rows = (coachees || []).filter(
    (c) => c.coachee_nik?.trim() || c.coachee_nama?.trim()
  )
  if (rows.length === 0) {
    throw new Error('Tambahkan minimal 1 coachee sebelum menyimpan.')
  }
  for (const r of rows) {
    if (!r.coachee_nik?.trim()) throw new Error('NIK SAP Coachee wajib diisi di setiap baris.')
    if (!r.coachee_nama?.trim()) throw new Error('Nama Coachee wajib diisi di setiap baris.')
  }

  const { data: session, error: sessionError } = await supabase
    .from('coaching_sessions')
    .insert({
      created_by: userId,
      unit_kerja: header.unit_kerja.trim(),
      coach_nik: header.coach_nik.trim(),
      coach_nama: header.coach_nama.trim(),
      coach_jabatan: header.coach_jabatan?.trim() || null,
      coach_usia: header.coach_usia ? Number(header.coach_usia) : null,
    })
    .select('id')
    .single()

  if (sessionError) throw sessionError

  const payload = rows.map((r, idx) => {
    const topikRows = (r.topikLainRows || []).filter((t) => t.topik || t.hasil_diskusi?.trim())
    return {
      session_id: session.id,
      coachee_nik: r.coachee_nik.trim(),
      coachee_nama: r.coachee_nama.trim(),
      coachee_jabatan: r.coachee_jabatan?.trim() || null,
      waktu: r.waktu || null,
      evaluasi_kinerja: r.evaluasi_kinerja || null,
      hasil_diskusi_kinerja: r.hasil_diskusi_kinerja?.trim() || null,
      topik_lain: topikRows.map((t) => t.topik).filter(Boolean).join(', ') || null,
      hasil_diskusi_topik:
        topikRows
          .filter((t) => t.hasil_diskusi?.trim())
          .map((t) => `${t.topik}: ${t.hasil_diskusi.trim()}`)
          .join('\n') || null,
      aktivitas: r.aktivitas || null,
      deskripsi_aktivitas: r.deskripsi_aktivitas?.trim() || null,
      urutan: idx,
    }
  })

  const { error: coacheeError } = await supabase.from('coaching_session_coachees').insert(payload)

  if (coacheeError) {
    // Rollback manual — hapus header yatim supaya tidak ada sesi kosong.
    await supabase.from('coaching_sessions').delete().eq('id', session.id)
    throw coacheeError
  }

  return session.id
}

/**
 * Ambil riwayat sesi coaching yang pernah diisi user yang sedang login
 * (created_by = uid sendiri), terbaru dulu, lengkap dengan baris coachee-nya.
 */
export async function getMyCoachingSessions() {
  const { data: sessions, error } = await supabase
    .from('coaching_sessions')
    .select('id, unit_kerja, coach_nik, coach_nama, coach_jabatan, coach_usia, created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  if (!sessions || sessions.length === 0) return []

  const ids = sessions.map((s) => s.id)
  const { data: coachees, error: coacheeError } = await supabase
    .from('coaching_session_coachees')
    .select('*')
    .in('session_id', ids)
    .order('urutan', { ascending: true })
  if (coacheeError) throw coacheeError

  return sessions.map((s) => ({
    ...s,
    coachees: (coachees || []).filter((c) => c.session_id === s.id),
  }))
}
