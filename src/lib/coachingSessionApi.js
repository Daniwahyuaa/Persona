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

/** Baris coachee kosong baru, dipakai saat menambah baris di tabel form. */
export function emptyCoacheeRow() {
  return {
    _key: `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    coachee_nik: '',
    coachee_nama: '',
    coachee_jabatan: '',
    waktu: '',
    evaluasi_kinerja: EVALUASI_KINERJA_OPTIONS[0],
    hasil_diskusi_kinerja: '',
    topik_lain: TOPIK_LAIN_OPTIONS[0],
    hasil_diskusi_topik: '',
    aktivitas: AKTIVITAS_OPTIONS[0],
    deskripsi_aktivitas: '',
  }
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
    .select('nik, nama, posisi, usia')
    .eq('nik', nikTrim)
    .maybeSingle()
  if (error) throw error
  return data
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

  const payload = rows.map((r, idx) => ({
    session_id: session.id,
    coachee_nik: r.coachee_nik.trim(),
    coachee_nama: r.coachee_nama.trim(),
    coachee_jabatan: r.coachee_jabatan?.trim() || null,
    waktu: r.waktu || null,
    evaluasi_kinerja: r.evaluasi_kinerja || null,
    hasil_diskusi_kinerja: r.hasil_diskusi_kinerja?.trim() || null,
    topik_lain: r.topik_lain || null,
    hasil_diskusi_topik: r.hasil_diskusi_topik?.trim() || null,
    aktivitas: r.aktivitas || null,
    deskripsi_aktivitas: r.deskripsi_aktivitas?.trim() || null,
    urutan: idx,
  }))

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
