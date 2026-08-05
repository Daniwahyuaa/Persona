import { supabase } from './supabaseClient.js'

// ═══════════════════════════════════════════════════════════════
// TALENT SOURCE — data layer
// Meniru DB.database + buildAsesmenLookups() + getFilteredDbList() + doExport()
// di index.html asli, tapi sumber datanya dari Supabase (bukan Google Sheets).
// ═══════════════════════════════════════════════════════════════

// ─── FORMAT helpers (disalin persis dari index.html asli) ───
export const fStr = (v) => (v == null || v === '' ? '—' : String(v))

const UPPER_WORDS = ['QA', 'SDM', 'TMA', 'IT', 'PG', 'PTPN']
export function properPosisi(str) {
  if (!str || str === '—') return str
  return String(str)
    .split(/(\s+|\/)/)
    .map((w) => {
      if (/^\s+$/.test(w) || w === '/') return w
      const up = w.toUpperCase()
      if (UPPER_WORDS.includes(up)) return up
      if (w.length < 4) return w
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    })
    .join('')
}

export function toProperCase(str) {
  if (!str || str === '—') return str
  return String(str)
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\B\w/g, (c) => c.toLowerCase())
}

export function normalizeJK(val) {
  const v = String(val || '').trim().toUpperCase()
  if (/^FEMALE|^PEREMPUAN|^WANITA/.test(v) || v === 'P') return 'Female'
  if (/^MALE|^LAKI|^PRIA/.test(v) || v === 'L') return 'Male'
  return 'Lainnya'
}

export function normalizePendidikan(val) {
  const v = String(val || '').trim().toUpperCase()
  if (!v || v === '-' || v === '—') return 'Lain-lain'
  if (/^(SMP|SLTP)/.test(v)) return 'SMP/SLTP/Setara'
  if (/^(SMA|SLTA)/.test(v)) return 'SMA/SLTA/Setara'
  if (/^D\s?1\b/.test(v)) return 'D1'
  if (/^D\s?2\b/.test(v)) return 'D2'
  if (/^D\s?3\b/.test(v)) return 'D3'
  if (/^D\s?4\b/.test(v)) return 'D4'
  if (v === 'DIPLOMA') return 'D3'
  if (/^S\s?1\b/.test(v)) return 'S1'
  if (/^S\s?2\b/.test(v)) return 'S2'
  if (/^S\s?3\b/.test(v)) return 'S3'
  return 'Lain-lain'
}

const BULAN_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
export function fmtTgl(v) {
  if (!v || v === '—') return '—'
  const d = new Date(String(v))
  if (isNaN(d.getTime())) return String(v)
  const dd = String(d.getDate()).padStart(2, '0')
  const mmm = BULAN_ID[d.getMonth()]
  return `${dd}-${mmm}-${d.getFullYear()}`
}

// Level jabatan order: BOD-1, BOD-2, BOD-3, sisanya
const JABATAN_ORDER = ['BOD-1', 'BOD-2', 'BOD-3']
export function jabatanRank(j) {
  if (!j || j === '—') return 999
  const idx = JABATAN_ORDER.indexOf(String(j).toUpperCase().trim())
  return idx >= 0 ? idx : 100
}

export function scoreColor(v) {
  if (v == null) return 'var(--dim)'
  return v > 85 ? 'var(--accent)' : v >= 70 ? 'var(--accent3)' : 'var(--danger)'
}

// Sub-kategori development/project ditentukan dari teks achievement/tingkatan,
// karena tabel employee_history sudah tidak punya kolom "jenis" terpisah lagi.
function matchDevKey(text) {
  const t = String(text || '').toLowerCase()
  if (/action learning|alp/.test(t)) return 'alp'
  if (/pldp/.test(t)) return 'pldp'
  if (/sertifikasi/.test(t)) return 'sertifikasi'
  if (/workshop/.test(t)) return 'workshop'
  if (/webinar|self/.test(t)) return 'webinar'
  return 'lainnya'
}
function matchProjKey(text) {
  const t = String(text || '').toLowerCase()
  if (/internasional/.test(t)) return 'internasional'
  if (/nasional/.test(t)) return 'nasional'
  if (/ptpn/.test(t)) return 'ptpn'
  if (/bumn|danantara/.test(t)) return 'bumn'
  if (/perusahaan/.test(t)) return 'perusahaan'
  return 'lainnya'
}

export const DEV_LEVEL_CFG = {
  alp: { label: 'ALP', bg: '#7c3aed', color: '#fff' },
  pldp: { label: 'PLDP', bg: '#1d4ed8', color: '#fff' },
  sertifikasi: { label: 'Sertifikasi', bg: '#0369a1', color: '#fff' },
  workshop: { label: 'Workshop', bg: '#15803d', color: '#fff' },
  webinar: { label: 'Webinar/SL', bg: '#d97706', color: '#fff' },
  lainnya: { label: 'Lain', bg: '#9ca3af', color: '#fff' },
}
export const PROJ_LEVEL_CFG = {
  internasional: { label: 'Internasional', bg: '#7c3aed', color: '#fff' },
  nasional: { label: 'Nasional', bg: '#1d4ed8', color: '#fff' },
  bumn: { label: 'BUMN', bg: '#0369a1', color: '#fff' },
  ptpn: { label: 'PTPN Group', bg: '#0f766e', color: '#fff' },
  perusahaan: { label: 'Perusahaan', bg: '#15803d', color: '#fff' },
  lainnya: { label: 'Lainnya', bg: '#9ca3af', color: '#fff' },
}

/**
 * Tarik & gabungkan semua tabel yang dibutuhkan tab Talent Source, meniru
 * DB.database/DB.asesmen/DB.cli/DB.kpi/DB.job_rotation/DB.development/
 * DB.project/DB.awarding di index.html asli — tapi query ke Supabase.
 * Dipanggil sekali saat TalentSource dibuka; hasilnya dipakai semua sub-tab.
 */
export async function getTalentSourceData() {
  const [karyawanRes, asesmenRes, cliSoftRes, cliHardRes, kpiRes, nineBoxRes, jobRotRes, historyRes] =
    await Promise.all([
      supabase.from('karyawan').select('*'),
      supabase.from('asesmen').select('*'),
      supabase.from('cli_soft').select('*'),
      supabase.from('cli_hard').select('*'),
      supabase.from('kpi').select('*'),
      supabase.from('nine_box').select('*'),
      supabase.from('job_rotation').select('*'),
      supabase.from('employee_history').select('*'),
    ])

  const firstError = [karyawanRes, asesmenRes, cliSoftRes, cliHardRes, kpiRes, nineBoxRes, jobRotRes, historyRes].find(
    (r) => r.error
  )
  if (firstError) throw firstError.error

  const karyawan = karyawanRes.data || []
  // Skema kolom tabel "asesmen" di Supabase kadang berbeda dari schema.sql
  // (ada yang pakai tipe_asesmen/hasil_asesmen, ada yang jenis_asesmen/rekomendasi
  // — format per-kompetensi). Normalisasi di sini supaya sisa kode di bawah &
  // di TalentSource.jsx tetap bisa pakai nama field yang konsisten.
  const asesmenRaw = asesmenRes.data || []
  const asesmen = asesmenRaw.map((r) => ({
    ...r,
    tipe_asesmen: r.tipe_asesmen ?? r.jenis_asesmen ?? null,
    hasil_asesmen: r.hasil_asesmen ?? r.rekomendasi ?? null,
  }))
  const cliSoft = cliSoftRes.data || []
  const cliHard = cliHardRes.data || []
  const kpi = kpiRes.data || []
  const nineBox = nineBoxRes.data || []
  const jobRotation = jobRotRes.data || []
  const history = (historyRes.data || []).filter((r) => r.hidden !== true)

  // ── Lookup: nine_box resmi (override kolom karyawan.ninebox kalau ada) ──
  const nikToNinebox = {}
  karyawan.forEach((r) => {
    if (r.nik && r.ninebox) nikToNinebox[String(r.nik)] = String(r.ninebox).toUpperCase()
  })
  nineBox.forEach((r) => {
    if (r.nik && r.box_label) nikToNinebox[String(r.nik)] = String(r.box_label).toUpperCase()
  })

  // ── Lookup: asesmen terbaru per NIK (lintas semua tipe) — asesmenOverallLatestArr() ──
  const nikToAsesmenLatest = {}
  asesmen.forEach((r) => {
    const nk = String(r.nik || '')
    if (!nk) return
    const existing = nikToAsesmenLatest[nk]
    if (!existing || String(r.tanggal || '') > String(existing.tanggal || '')) nikToAsesmenLatest[nk] = r
  })

  // ── Lookup: CLI rerata (% hasil=1) per NIK ──
  function rerataCli(rows) {
    const byNik = {}
    rows.forEach((r) => {
      const nk = String(r.nik || '')
      if (!nk) return
      if (!byNik[nk]) byNik[nk] = { total: 0, benar: 0 }
      byNik[nk].total++
      if (r.hasil === 1) byNik[nk].benar++
    })
    const out = {}
    Object.entries(byNik).forEach(([nk, v]) => {
      out[nk] = v.total > 0 ? Math.round((v.benar / v.total) * 100) : null
    })
    return out
  }
  const nikToCliSoft = rerataCli(cliSoft)
  const nikToCliHard = rerataCli(cliHard)

  // ── Lookup: KPI per tahun + skor/rating "terkini" (tahun terbesar) per NIK ──
  const nikToKpiByYear = {}
  kpi.forEach((r) => {
    const nk = String(r.nik || '')
    if (!nk) return
    if (!nikToKpiByYear[nk]) nikToKpiByYear[nk] = {}
    nikToKpiByYear[nk][String(r.tahun)] = { skor: r.skor, rating: r.perf_rating }
  })
  const nikToKpiTerkini = {}
  Object.entries(nikToKpiByYear).forEach(([nk, byYear]) => {
    const tahun = Object.keys(byYear).sort().pop()
    if (tahun) nikToKpiTerkini[nk] = byYear[tahun]
  })

  // ── Lookup: jumlah rotasi jabatan per NIK — job_rotation_count ──
  const nikToJobRot = {}
  jobRotation.forEach((r) => {
    const nk = String(r.nik || '')
    if (!nk) return
    nikToJobRot[nk] = (nikToJobRot[nk] || 0) + 1
  })

  // ── Lookup: development/project/awarding (dari employee_history) ──
  const nikToDev = {}
  const nikToProj = {}
  const nikToAwd = {}
  history.forEach((r) => {
    const nk = String(r.nik || '')
    if (!nk) return
    if (r.kategori === 'development') {
      if (!nikToDev[nk]) nikToDev[nk] = { counts: {}, total: 0 }
      const key = matchDevKey(r.achievement || r.tingkatan)
      nikToDev[nk].counts[key] = (nikToDev[nk].counts[key] || 0) + 1
      nikToDev[nk].total++
    } else if (r.kategori === 'project') {
      if (!nikToProj[nk]) nikToProj[nk] = { counts: {}, total: 0 }
      const key = matchProjKey(r.tingkatan || r.achievement)
      nikToProj[nk].counts[key] = (nikToProj[nk].counts[key] || 0) + 1
      nikToProj[nk].total++
    } else if (r.kategori === 'awarding') {
      if (!nikToAwd[nk]) nikToAwd[nk] = { counts: {}, total: 0 }
      const key = matchProjKey(r.tingkatan || r.achievement)
      nikToAwd[nk].counts[key] = (nikToAwd[nk].counts[key] || 0) + 1
      nikToAwd[nk].total++
    }
  })

  // ── Gabungkan jadi baris "Database" (persis kolom tabel di index.html) ──
  const rows = karyawan.map((r) => {
    const nik = String(r.nik || '')
    const asLatest = nikToAsesmenLatest[nik] || null
    const kpiTerkini = nikToKpiTerkini[nik] || null
    return {
      ...r,
      ninebox: nikToNinebox[nik] || r.ninebox || null,
      cliSoft: nikToCliSoft[nik] ?? null,
      cliHard: nikToCliHard[nik] ?? null,
      kpiByYear: nikToKpiByYear[nik] || {},
      kpiSkor: kpiTerkini?.skor ?? null,
      perfRating: kpiTerkini?.rating ?? null,
      hasilAs: asLatest?.hasil_asesmen ?? null,
      waktuAs: asLatest?.tanggal ?? null,
      lmbgAs: asLatest?.lembaga ?? null,
      jobRotCount: nikToJobRot[nik] ?? null,
      dev: nikToDev[nik] || null,
      proj: nikToProj[nik] || null,
      awd: nikToAwd[nik] || null,
    }
  })

  rows.sort((a, b) => {
    const ra = jabatanRank(a.level_jabatan)
    const rb = jabatanRank(b.level_jabatan)
    if (ra !== rb) return ra - rb
    return fStr(a.unit_kerja).localeCompare(fStr(b.unit_kerja))
  })

  return { rows, asesmen, cliSoft, cliHard, kpi, jobRotation, history }
}

/** Opsi unik untuk dropdown filter kolom — dipakai tab Database. */
export function buildDbFilterOptions(rows) {
  const uniq = (arr) => [...new Set(arr.filter((v) => v && v !== '—'))].sort((a, b) => String(a).localeCompare(String(b)))
  return {
    jabatan: [
      ...JABATAN_ORDER.filter((j) => rows.some((r) => String(r.level_jabatan || '').toUpperCase() === j)),
      ...uniq(rows.map((r) => fStr(r.level_jabatan)).filter((v) => !JABATAN_ORDER.includes(v.toUpperCase()))),
    ],
    unit: uniq(rows.map((r) => properPosisi(fStr(r.unit_kerja)))),
    grup: uniq(rows.map((r) => fStr(r.grup))),
    jk: uniq(rows.map((r) => normalizeJK(r.jenis_kelamin))),
    pend: uniq(rows.map((r) => normalizePendidikan(r.pendidikan))),
    sanksi: uniq(rows.map((r) => fStr(r.sanksi))),
    ninebox: uniq(rows.map((r) => fStr(r.ninebox))),
    hasil_as: uniq(rows.map((r) => fStr(r.hasilAs))),
    lmbg_as: uniq(rows.map((r) => fStr(r.lmbgAs))),
  }
}

/** Terapkan search + filter kolom, urutan sama seperti getFilteredDbList(). */
export function filterDbRows(rows, { search = '', filters = {} } = {}) {
  const q = search.toLowerCase().trim()
  let list = rows.filter((r) => {
    if (q) {
      const match =
        fStr(r.nama).toLowerCase().includes(q) ||
        fStr(r.nik).toLowerCase().includes(q) ||
        fStr(r.posisi).toLowerCase().includes(q) ||
        fStr(r.unit_kerja).toLowerCase().includes(q) ||
        fStr(r.grup).toLowerCase().includes(q) ||
        fStr(r.level_jabatan).toLowerCase().includes(q)
      if (!match) return false
    }
    if (filters.jabatan && fStr(r.level_jabatan) !== filters.jabatan) return false
    if (filters.unit && properPosisi(fStr(r.unit_kerja)) !== filters.unit) return false
    if (filters.grup && fStr(r.grup) !== filters.grup) return false
    if (filters.jk && normalizeJK(r.jenis_kelamin) !== filters.jk) return false
    if (filters.pend && normalizePendidikan(r.pendidikan) !== filters.pend) return false
    if (filters.sanksi && fStr(r.sanksi) !== filters.sanksi) return false
    if (filters.ninebox && fStr(r.ninebox) !== filters.ninebox) return false
    if (filters.hasil_as && fStr(r.hasilAs) !== filters.hasil_as) return false
    if (filters.lmbg_as && fStr(r.lmbgAs) !== filters.lmbg_as) return false
    if (filters.cli) {
      const s = r.cliSoft
      if (filters.cli === '>85' && !(s > 85)) return false
      if (filters.cli === '70-85' && !(s != null && s >= 70 && s <= 85)) return false
      if (filters.cli === '<70' && !(s != null && s < 70)) return false
    }
    if (filters.kpi) {
      const s = r.kpiSkor != null ? parseFloat(r.kpiSkor) : null
      if (filters.kpi === '>85' && !(s > 85)) return false
      if (filters.kpi === '70-85' && !(s != null && s >= 70 && s <= 85)) return false
      if (filters.kpi === '<70' && !(s != null && s < 70)) return false
    }
    if (filters.jobrot) {
      const jrc = r.jobRotCount ?? null
      if (filters.jobrot === '1' && jrc !== 1) return false
      if (filters.jobrot === '2' && jrc !== 2) return false
      if (filters.jobrot === '<5' && !(jrc != null && jrc < 5)) return false
      if (filters.jobrot === '>5' && !(jrc != null && jrc > 5)) return false
    }
    return true
  })
  list.sort((a, b) => {
    const ra = jabatanRank(a.level_jabatan)
    const rb = jabatanRank(b.level_jabatan)
    if (ra !== rb) return ra - rb
    return fStr(a.unit_kerja).localeCompare(fStr(b.unit_kerja))
  })
  return list
}

// ─── EXPORT EXCEL — persis EXPORT_COLS + doExport() di index.html asli ───
export const EXPORT_COLS = [
  { key: 'no', label: 'No' },
  { key: 'nik', label: 'NIK' },
  { key: 'nama', label: 'Nama' },
  { key: 'posisi', label: 'Posisi' },
  { key: 'jabatan', label: 'Level Jabatan' },
  { key: 'unit', label: 'Unit Kerja' },
  { key: 'grup', label: 'Grup Job Function' },
  { key: 'tgl', label: 'Tgl Lahir' },
  { key: 'usia', label: 'Usia' },
  { key: 'jk', label: 'Jenis Kelamin' },
  { key: 'pend', label: 'Pendidikan' },
  { key: 'sanksi', label: 'Sanksi' },
  { key: 'wsanksi', label: 'Waktu Sanksi' },
  { key: 'ninebox', label: '9-Box' },
  { key: 'cli_soft', label: 'Soft CLI' },
  { key: 'cli_hard', label: 'Hard CLI' },
  { key: 'kpi', label: 'Skor KPI' },
  { key: 'perf', label: 'Performance Rating' },
  { key: 'hasil_as', label: 'Hasil Asesmen Terakhir' },
  { key: 'waktu_as', label: 'Waktu Asesmen Terakhir' },
  { key: 'lmbg_as', label: 'Lembaga Asesmen Terakhir' },
  { key: 'jobrot', label: 'Job Rotation' },
  { key: 'dev_alp', label: 'Development ALP' },
  { key: 'dev_pldp', label: 'Development PLDP' },
  { key: 'dev_sert', label: 'Development Sertifikasi' },
  { key: 'dev_ws', label: 'Development Workshop' },
  { key: 'dev_web', label: 'Development Webinar/SL' },
  { key: 'dev_total', label: 'Development Total' },
  { key: 'proj_int', label: 'Project Internasional' },
  { key: 'proj_nas', label: 'Project Nasional' },
  { key: 'proj_bumn', label: 'Project BUMN/Danantara' },
  { key: 'proj_per', label: 'Project Perusahaan' },
  { key: 'proj_total', label: 'Project Total' },
  { key: 'awd_total', label: 'Awarding Total' },
]

function buildExportObj(r, i, selectedCols) {
  const obj = {}
  selectedCols.forEach((col) => {
    switch (col.key) {
      case 'no': obj[col.label] = i + 1; break
      case 'nik': obj[col.label] = fStr(r.nik); break
      case 'nama': obj[col.label] = toProperCase(fStr(r.nama)); break
      case 'posisi': obj[col.label] = fStr(r.posisi); break
      case 'jabatan': obj[col.label] = fStr(r.level_jabatan); break
      case 'unit': obj[col.label] = fStr(r.unit_kerja); break
      case 'grup': obj[col.label] = fStr(r.grup); break
      case 'tgl': obj[col.label] = fmtTgl(r.tgl_lahir); break
      case 'usia': obj[col.label] = r.usia != null ? Math.round(parseFloat(r.usia)) : ''; break
      case 'jk': obj[col.label] = normalizeJK(r.jenis_kelamin); break
      case 'pend': obj[col.label] = normalizePendidikan(r.pendidikan); break
      case 'sanksi': obj[col.label] = fStr(r.sanksi); break
      case 'wsanksi': obj[col.label] = fStr(r.waktu_sanksi); break
      case 'ninebox': obj[col.label] = fStr(r.ninebox); break
      case 'cli_soft': obj[col.label] = r.cliSoft != null ? r.cliSoft : ''; break
      case 'cli_hard': obj[col.label] = r.cliHard != null ? r.cliHard : ''; break
      case 'kpi': obj[col.label] = r.kpiSkor != null ? r.kpiSkor : ''; break
      case 'perf': obj[col.label] = fStr(r.perfRating); break
      case 'hasil_as': obj[col.label] = fStr(r.hasilAs); break
      case 'waktu_as': obj[col.label] = fStr(r.waktuAs); break
      case 'lmbg_as': obj[col.label] = fStr(r.lmbgAs); break
      case 'jobrot': obj[col.label] = r.jobRotCount != null ? r.jobRotCount : ''; break
      case 'dev_alp': obj[col.label] = r.dev?.counts?.alp || ''; break
      case 'dev_pldp': obj[col.label] = r.dev?.counts?.pldp || ''; break
      case 'dev_sert': obj[col.label] = r.dev?.counts?.sertifikasi || ''; break
      case 'dev_ws': obj[col.label] = r.dev?.counts?.workshop || ''; break
      case 'dev_web': obj[col.label] = r.dev?.counts?.webinar || ''; break
      case 'dev_total': obj[col.label] = r.dev?.total || ''; break
      case 'proj_int': obj[col.label] = r.proj?.counts?.internasional || ''; break
      case 'proj_nas': obj[col.label] = r.proj?.counts?.nasional || ''; break
      case 'proj_bumn': obj[col.label] = r.proj?.counts?.bumn || ''; break
      case 'proj_per': obj[col.label] = r.proj?.counts?.perusahaan || ''; break
      case 'proj_total': obj[col.label] = r.proj?.total || ''; break
      case 'awd_total': obj[col.label] = r.awd?.total || ''; break
      default: break
    }
  })
  return obj
}

/**
 * Export baris (hasil filter yang sedang tampil) ke file .xlsx, persis doExport()
 * di index.html asli — dropdown pilih kolom, auto-fit lebar kolom, nama file
 * bertanggal. Butuh dependency "xlsx" (SheetJS) — lihat package.json.
 */
export async function exportDatabaseToExcel(rows, selectedColKeys) {
  const XLSX = await import('xlsx')
  const selectedCols = EXPORT_COLS.filter((c) => selectedColKeys.has(c.key))
  const sheetData = rows.map((r, i) => buildExportObj(r, i, selectedCols))

  const ws = XLSX.utils.json_to_sheet(sheetData, { header: selectedCols.map((c) => c.label) })
  const colWidths = selectedCols.map((col) => {
    const maxLen = Math.max(col.label.length, ...sheetData.map((row) => String(row[col.label] ?? '').length))
    return { wch: Math.min(maxLen + 2, 45) }
  })
  ws['!cols'] = colWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Database')
  const filename = 'persona_database_' + new Date().toISOString().slice(0, 10) + '.xlsx'
  XLSX.writeFile(wb, filename)

  return { rows: rows.length, cols: selectedCols.length, filename }
}
