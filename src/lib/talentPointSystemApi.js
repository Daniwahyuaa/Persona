import { supabase } from './supabaseClient.js'

// ═══════════════════════════════════════════════════════════════
// TALENT POINT SYSTEM — mesin skoring
// Meniru persis FORMULA_DEFAULT + muRunAnalyze() (calcPendidikanScore,
// calcSanksiScore, calcNineboxScore, calcCLIScore, calcKPIScore,
// calcPerfScore, calcAsesmenScore, calcRotasiScore, calcDevProjAwdScore)
// di index.html asli — tapi bobot/tier dibaca dari tabel "formula" Supabase
// (bukan variabel JS statis), supaya perubahan di tab Formula langsung
// berlaku di sini.
// ═══════════════════════════════════════════════════════════════

// Dipakai kalau tabel formula di Supabase masih kosong — persis FORMULA_DEFAULT.
const FORMULA_DEFAULT = [
  { key: 'pendidikan', bobot: 5, tiers: [
    { nilai: 'S3 / Doktor', poin: 100 }, { nilai: 'S2 / Master', poin: 80 },
    { nilai: 'S1 / Sarjana', poin: 60 }, { nilai: 'D3 / Diploma', poin: 40 },
    { nilai: 'D1-D2 / SMA', poin: 20 },
  ]},
  { key: 'sanksi', bobot: 10, tiers: [
    { nilai: 'Tidak Ada Sanksi', poin: 100 }, { nilai: 'Ada Sanksi', poin: 0 },
  ]},
  { key: 'ninebox', bobot: 20, tiers: [
    { nilai: 'HIGH POTENTIAL', poin: 100 }, { nilai: 'PROMOTABLE', poin: 80 },
    { nilai: 'SLEEPING TIGER', poin: 60 }, { nilai: 'SOLID CONTRIBUTOR', poin: 40 },
    { nilai: 'UNFIT', poin: 20 }, { nilai: 'Tidak Ada', poin: 0 },
  ]},
  { key: 'cli', bobot: 12, tiers: [
    { nilai: '> 85', poin: 100 }, { nilai: '70-85', poin: 80 }, { nilai: '< 70', poin: 60 }, { nilai: 'Tidak Ada', poin: 0 },
  ]},
  { key: 'kpi', bobot: 12, tiers: [
    { nilai: '> 85', poin: 100 }, { nilai: '70-85', poin: 80 }, { nilai: '< 70', poin: 60 }, { nilai: 'Tidak Ada', poin: 0 },
  ]},
  { key: 'perf', bobot: 9, tiers: [
    { nilai: 'Outstanding', poin: 100 }, { nilai: 'Above', poin: 80 }, { nilai: 'On Target', poin: 60 },
    { nilai: 'Below', poin: 40 }, { nilai: 'Poor', poin: 20 }, { nilai: 'Tidak Ada', poin: 0 },
  ]},
  { key: 'asesmen', bobot: 12, tiers: [
    { nilai: 'Q / DS (Disarankan)', poin: 100 }, { nilai: 'DSP (Disarankan Dengan Pengembangan)', poin: 80 },
    { nilai: 'NQ / TD (Tidak Disarankan)', poin: 65 }, { nilai: 'Tidak Ada', poin: 0 },
  ]},
  { key: 'rotasi', bobot: 5, tiers: [
    { nilai: '>= 5 kali', poin: 100 }, { nilai: '4 kali', poin: 80 }, { nilai: '3 kali', poin: 60 },
    { nilai: '2 kali', poin: 40 }, { nilai: '1 kali', poin: 20 }, { nilai: '0 kali', poin: 0 },
  ]},
  { key: 'dev', bobot: 5, tiers: [
    { nilai: 'Action Learning Program', poin: 100 }, { nilai: 'PLDP', poin: 80 },
    { nilai: 'Sertifikasi', poin: 60 }, { nilai: 'Workshop', poin: 40 }, { nilai: 'Webinar / Self Learning', poin: 20 },
  ]},
  { key: 'project', bobot: 5, tiers: [
    { nilai: 'Internasional', poin: 100 }, { nilai: 'Nasional', poin: 80 }, { nilai: 'BUMN/Danantara', poin: 60 },
    { nilai: 'PTPN Group', poin: 40 }, { nilai: 'Perusahaan', poin: 20 },
  ]},
  { key: 'awarding', bobot: 5, tiers: [
    { nilai: 'Internasional', poin: 100 }, { nilai: 'Nasional', poin: 80 }, { nilai: 'BUMN/Danantara', poin: 60 },
    { nilai: 'PTPN Group', poin: 40 }, { nilai: 'Perusahaan', poin: 20 },
  ]},
]

/**
 * Ambil bobot & tier formula dari tabel "formula" (1 baris = 1 tier), lalu
 * kelompokkan per komponen jadi { key, bobot, tiers:[{nilai,poin}] } —
 * persis shape formulaWeights di index.html asli. Fallback ke default kalau
 * tabel formula kosong/gagal.
 */
export async function getFormulaWeights() {
  try {
    const { data, error } = await supabase.from('formula').select('*').order('urutan', { ascending: true })
    if (error) throw error
    if (!data || data.length === 0) return FORMULA_DEFAULT

    const byKomponen = {}
    data.forEach((r) => {
      const key = r.komponen
      if (!key) return
      if (!byKomponen[key]) byKomponen[key] = { key, bobot: Number(r.bobot) || 0, tiers: [] }
      byKomponen[key].tiers.push({ nilai: r.tier_nilai || '', poin: Number(r.poin_dasar) || 0 })
    })
    const weights = Object.values(byKomponen)
    return weights.length ? weights : FORMULA_DEFAULT
  } catch {
    return FORMULA_DEFAULT
  }
}

function getW(formulaWeights, key) {
  const f = formulaWeights.find((fw) => fw.key === key)
  return f ? f.bobot / 100 : 0
}

// Poin dev/project/awarding: nilai TERTINGGI dari tingkatan yang dimiliki, di-cap ke bobot komponen.
function calcDevProjAwdScore(intl, nas, bumn, ptpn, perus) {
  const raw = (intl >= 1 ? 5 : 0) || (nas >= 1 ? 4 : 0) || (bumn >= 1 ? 3 : 0) || (ptpn >= 1 ? 2 : 0) || (perus >= 1 ? 1 : 0)
  const acc = Math.min(5, intl * 5 + nas * 4 + bumn * 3 + ptpn * 2 + perus * 1)
  return Math.min(5, Math.max(raw, acc))
}

function calcSanksiScore(formulaWeights, sanksi) {
  const s = String(sanksi || '').toLowerCase().trim()
  const noSanksi = !s || s === '—' || s === 'null' || s === 'none' || s === '-' || s === 'nihil' || s === 'bersih' || s.includes('tidak ada') || s === 'tidak'
  const fw = formulaWeights.find((f) => f.key === 'sanksi')
  const wSanksi = getW(formulaWeights, 'sanksi')
  const tiers = fw?.tiers || []
  const tier = tiers.find((x) => {
    const nl = String(x.nilai || '').toLowerCase()
    return noSanksi ? nl.includes('tidak') : !nl.includes('tidak') && nl.includes('sanksi')
  })
  const poinDasar = tier ? parseFloat(tier.poin) || 0 : noSanksi ? 100 : 0
  return parseFloat(((poinDasar / 100) * wSanksi * 100).toFixed(2))
}

function calcPendidikanScore(formulaWeights, pend) {
  const p = String(pend || '').toLowerCase().trim()
  const wPend = getW(formulaWeights, 'pendidikan') * 100
  if (p.includes('s3') || p.includes('doktor')) return parseFloat(wPend.toFixed(2))
  if (p.includes('s2') || p.includes('magister') || p.includes('master')) return 4
  if (p.includes('s1') || p.includes('sarjana') || p.includes('d4')) return 3
  if (p.includes('d3') || p.includes('diploma')) return parseFloat((wPend * 0.4).toFixed(2))
  if (p.includes('sma') || p.includes('smk') || p.includes('smp') || p.includes('sd') || p.includes('slta') || p.includes('sltp'))
    return parseFloat((wPend * 0.2).toFixed(2))
  return 0
}

function calcCLIScore(formulaWeights, cli) {
  if (cli == null || isNaN(parseFloat(cli))) return 0
  const w = getW(formulaWeights, 'cli') * 100
  return parseFloat(Math.min(w, (parseFloat(cli) * w) / 100).toFixed(2))
}
function calcKPIScore(formulaWeights, kpi) {
  if (kpi == null || isNaN(parseFloat(kpi))) return 0
  const w = getW(formulaWeights, 'kpi') * 100
  return parseFloat(Math.min(w, (parseFloat(kpi) * w) / 100).toFixed(2))
}

function calcPerfScore(formulaWeights, perf) {
  const p = String(perf || '').toLowerCase().trim()
  const fw = formulaWeights.find((f) => f.key === 'perf')
  const wPerf = getW(formulaWeights, 'perf')
  const t = fw?.tiers || []
  const getTP = (idx) => ((t[idx]?.poin ?? [100, 80, 60, 40, 20, 0][idx]) / 100) * wPerf * 100
  if (p.includes('outstanding')) return parseFloat(getTP(0).toFixed(2))
  if (p.includes('above')) return parseFloat(getTP(1).toFixed(2))
  if (p.includes('on target') || p === 'on') return parseFloat(getTP(2).toFixed(2))
  if (p.includes('below')) return parseFloat(getTP(3).toFixed(2))
  if (p.includes('poor')) return parseFloat(getTP(4).toFixed(2))
  return 0
}

function calcNineboxScore(formulaWeights, nb) {
  const n = String(nb || '').toLowerCase().trim()
  const fw = formulaWeights.find((f) => f.key === 'ninebox')
  const wNb = getW(formulaWeights, 'ninebox')
  const t = fw?.tiers || []
  const getTP = (idx) => ((t[idx]?.poin ?? [100, 80, 60, 40, 20, 0][idx]) / 100) * wNb * 100
  if (n.includes('high potential') || n === 'hp') return parseFloat(getTP(0).toFixed(2))
  if (n.includes('promotable')) return parseFloat(getTP(1).toFixed(2))
  if (n.includes('sleeping tiger')) return parseFloat(getTP(2).toFixed(2))
  if (n.includes('solid contributor')) return parseFloat(getTP(3).toFixed(2))
  if (n.includes('unfit')) return parseFloat(getTP(4).toFixed(2))
  return 0
}

function calcRotasiScore(formulaWeights, rot) {
  const n = parseInt(rot, 10) || 0
  const wRot = getW(formulaWeights, 'rotasi') * 100
  if (n >= 5) return parseFloat((wRot * 1).toFixed(2))
  if (n === 4) return parseFloat((wRot * 0.8).toFixed(2))
  if (n === 3) return parseFloat((wRot * 0.6).toFixed(2))
  if (n === 2) return parseFloat((wRot * 0.4).toFixed(2))
  if (n === 1) return parseFloat((wRot * 0.2).toFixed(2))
  return 0
}

function calcAsesmenScore(formulaWeights, hasil) {
  const h = String(hasil || '').toLowerCase().trim()
  const fw = formulaWeights.find((f) => f.key === 'asesmen')
  const wAs = getW(formulaWeights, 'asesmen')
  const t = fw?.tiers || []
  const findTierPoin = (codes, fallback) => {
    const tier = t.find((x) => {
      const nilaiLower = String(x.nilai || '').toLowerCase()
      return codes.some((c) => new RegExp('\\b' + c + '\\b').test(nilaiLower))
    })
    return (tier?.poin ?? fallback) / 100
  }
  if (h === 'q' || h === 'qualified' || h === 'ds' || h === 'disarankan') return parseFloat((findTierPoin(['q', 'ds'], 100) * wAs * 100).toFixed(2))
  if (h === 'dsp') return parseFloat((findTierPoin(['dsp'], 80) * wAs * 100).toFixed(2))
  if (h === 'nq' || h === 'not qualified' || h === 'td' || h === 'tidak disarankan') return parseFloat((findTierPoin(['nq', 'td'], 65) * wAs * 100).toFixed(2))
  return 0
}

/**
 * Bangun "profile" siap-skor dari 1 baris karyawan (shape getTalentSourceData().rows),
 * persis muGetProfile() di index.html asli.
 */
export function buildCandidateProfile(row) {
  return {
    nik: row.nik,
    nama: row.nama || row.nik,
    posisi: row.posisi || '—',
    jabatan: row.level_jabatan || '—',
    unit: row.unit_kerja || '—',
    usia: row.usia != null ? Math.round(parseFloat(row.usia)) : null,
    pendidikan: row.pendidikan || '—',
    sanksi: row.sanksi || '—',
    ninebox: row.ninebox || '—',
    cli: row.cliSoft ?? null,
    kpi: row.kpiSkor ?? null,
    perf: row.perfRating || '—',
    hasil_as: row.hasilAs || '—',
    waktu_as: row.waktuAs || '—',
    lembaga_as: row.lmbgAs || '—',
    rotasi: row.jobRotCount ?? null,
    dev_alp: row.dev?.counts?.alp || 0,
    dev_pldp: row.dev?.counts?.pldp || 0,
    dev_sert: row.dev?.counts?.sertifikasi || 0,
    dev_ws: row.dev?.counts?.workshop || 0,
    dev_web: row.dev?.counts?.webinar || 0,
    dev_total: row.dev?.total ?? null,
    proj_int: row.proj?.counts?.internasional || 0,
    proj_nas: row.proj?.counts?.nasional || 0,
    proj_bumn: row.proj?.counts?.bumn || 0,
    proj_ptpn: row.proj?.counts?.ptpn || 0,
    proj_perus: row.proj?.counts?.perusahaan || 0,
    proj_total: row.proj?.total ?? null,
    awd_int: row.awd?.counts?.internasional || 0,
    awd_nas: row.awd?.counts?.nasional || 0,
    awd_bumn: row.awd?.counts?.bumn || 0,
    awd_ptpn: row.awd?.counts?.ptpn || 0,
    awd_perus: row.awd?.counts?.perusahaan || 0,
    awd_total: row.awd?.total ?? null,
  }
}

/**
 * Hitung skor tiap komponen (max 100 poin total) untuk 2-5 kandidat, persis
 * blok "SISTEM SKORING PRESISI" di muRunAnalyze() index.html asli.
 * Return: array kandidat (urutan sama seperti input) + field s_* dan totalScore.
 */
export function scoreCandidates(profiles, formulaWeights) {
  return profiles.map((p) => {
    const s_awd = parseFloat(calcDevProjAwdScore(p.awd_int, p.awd_nas, p.awd_bumn, p.awd_ptpn, p.awd_perus).toFixed(2))
    const s_dev = parseFloat(calcDevProjAwdScore(p.dev_alp, p.dev_pldp, p.dev_sert, p.dev_ws, p.dev_web).toFixed(2))
    const s_proj = parseFloat(calcDevProjAwdScore(p.proj_int, p.proj_nas, p.proj_bumn, p.proj_ptpn, p.proj_perus).toFixed(2))
    const s_sanksi = calcSanksiScore(formulaWeights, p.sanksi)
    const s_pend = calcPendidikanScore(formulaWeights, p.pendidikan)
    const s_cli = calcCLIScore(formulaWeights, p.cli)
    const s_kpi = calcKPIScore(formulaWeights, p.kpi)
    const s_perf = calcPerfScore(formulaWeights, p.perf)
    const s_nb = calcNineboxScore(formulaWeights, p.ninebox)
    const s_rot = calcRotasiScore(formulaWeights, p.rotasi)
    const s_as = calcAsesmenScore(formulaWeights, p.hasil_as)
    const totalScore = parseFloat((s_awd + s_dev + s_proj + s_sanksi + s_pend + s_cli + s_kpi + s_perf + s_nb + s_rot + s_as).toFixed(2))
    return { ...p, s_awd, s_dev, s_proj, s_sanksi, s_pend, s_cli, s_kpi, s_perf, s_nb, s_rot, s_as, totalScore }
  })
}

// Komponen detail + nilai maks — persis KOMPONEN di index.html asli (total 100).
export const SCORE_COMPONENTS = [
  { label: 'Pendidikan', max: 5, key: 's_pend' },
  { label: 'Sanksi', max: 10, key: 's_sanksi' },
  { label: '9-Box', max: 20, key: 's_nb' },
  { label: 'CLI', max: 12, key: 's_cli' },
  { label: 'KPI', max: 12, key: 's_kpi' },
  { label: 'Performance Rating', max: 9, key: 's_perf' },
  { label: 'Asesmen Terakhir', max: 12, key: 's_as' },
  { label: 'Job Rotation', max: 5, key: 's_rot' },
  { label: 'Development', max: 5, key: 's_dev' },
  { label: 'Project Involvement', max: 5, key: 's_proj' },
  { label: 'Awarding', max: 5, key: 's_awd' },
]
