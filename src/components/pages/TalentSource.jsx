import { useEffect, useMemo, useState } from 'react'
import Icon from '../Icon.jsx'
import {
  getTalentSourceData,
  buildDbFilterOptions,
  filterDbRows,
  exportDatabaseToExcel,
  EXPORT_COLS,
  fStr,
  toProperCase,
  properPosisi,
  normalizeJK,
  normalizePendidikan,
  fmtTgl,
  scoreColor,
  DEV_LEVEL_CFG,
  PROJ_LEVEL_CFG,
} from '../../lib/talentSourceApi.js'

const TABS = [
  { id: 'database', label: 'Database', icon: 'database' },
]

// ── Badge 9-Box (persis .badge-hp/pr/sc/st/un/null di base.css) ──
const NB_CLASS = {
  'HIGH POTENTIAL': 'badge-hp',
  PROMOTABLE: 'badge-pr',
  'SOLID CONTRIBUTOR': 'badge-sc',
  'SLEEPING TIGER': 'badge-st',
  UNFIT: 'badge-un',
}
function NbBadge({ v }) {
  if (!v || v === '—') return <span className="badge badge-null">—</span>
  return <span className={`badge ${NB_CLASS[String(v).toUpperCase()] || 'badge-null'}`}>{v}</span>
}

function Dash() {
  return <span style={{ color: 'var(--dim)', fontSize: 11 }}>—</span>
}

// ── Skor + mini progress bar (persis scoreBar() index.html) ──
function ScoreBar({ v }) {
  if (v == null || isNaN(parseFloat(v))) return <Dash />
  const n = parseFloat(v)
  const color = scoreColor(n)
  const pct = Math.min(100, n)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 70 }}>
      <div style={{ flex: 1, height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 26, textAlign: 'right' }}>{n}</span>
    </div>
  )
}

function SanksiCell({ v }) {
  const sv = fStr(v)
  if (!v || sv === '—') return <Dash />
  if (/tidak ada/i.test(sv)) return <span style={{ fontSize: 12, color: 'var(--muted)' }}>{sv}</span>
  return (
    <span
      style={{
        background: '#fee2e2',
        color: '#991b1b',
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 10.5,
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      {sv}
    </span>
  )
}

function CountBadge({ n, color }) {
  if (n == null) return <Dash />
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 26,
        height: 26,
        padding: '0 6px',
        borderRadius: 13,
        background: color,
        color: '#fff',
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {n}
    </span>
  )
}

function CountPills({ counts, cfg }) {
  const entries = Object.entries(cfg).filter(([k]) => counts?.[k] > 0)
  if (!entries.length) return <Dash />
  return (
    <div style={{ display: 'flex', gap: 3, flexWrap: 'nowrap', justifyContent: 'center' }}>
      {entries.map(([k, c]) => (
        <span
          key={k}
          style={{
            background: c.bg,
            color: c.color,
            padding: '1px 5px',
            borderRadius: 4,
            fontSize: 9.5,
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          {c.label}:{counts[k]}
        </span>
      ))}
    </div>
  )
}

// ── Bar horizontal minimalis (persis statBars()/minimalBars() index.html) ──
function BarList({ labels, values, colors, showPct = true, dot = false }) {
  const tot = values.reduce((a, b) => a + b, 0)
  if (!tot) return <div style={{ color: 'var(--dim)', fontSize: 11.5 }}>Tidak ada data</div>
  const max = Math.max(...values, 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {labels.map((lbl, i) => {
        const pctWidth = Math.round((values[i] / max) * 100)
        const pct = Math.round((values[i] / tot) * 100)
        return (
          <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            {dot && (
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: colors[i % colors.length], flexShrink: 0 }} />
            )}
            <span
              style={{
                width: dot ? 92 : 108,
                flexShrink: 0,
                fontSize: 11,
                color: 'var(--muted)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={lbl}
            >
              {lbl}
            </span>
            <div style={{ flex: 1, height: 7, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden', minWidth: 0 }}>
              <div style={{ height: '100%', width: `${pctWidth}%`, background: colors[i % colors.length], borderRadius: 4 }} />
            </div>
            <span style={{ width: 30, flexShrink: 0, fontSize: 12, fontWeight: 700, color: 'var(--text)', textAlign: 'right' }}>
              {values[i]}
            </span>
            {showPct && (
              <span style={{ width: 32, flexShrink: 0, fontSize: 10, color: 'var(--dim)', textAlign: 'right' }}>{pct}%</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Bar chart stacked "Tercatat vs Belum Ada" (pengganti Chart.js chart-rating-trend) ──
function TrenRatingChart({ data }) {
  const max = Math.max(...data.map((d) => d.withRating + d.without), 1)
  const step = Math.max(1, Math.ceil(max / 5))
  const axisMax = step * 5
  const ticks = [0, 1, 2, 3, 4, 5].map((i) => i * step)
  const H = 150

  return (
    <div>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: H, paddingBottom: 20 }}>
          {[...ticks].reverse().map((t) => (
            <span key={t} style={{ fontSize: 9.5, color: 'var(--dim)', textAlign: 'right', minWidth: 16 }}>{t}</span>
          ))}
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 18, height: H, borderLeft: '1px solid var(--border)', paddingLeft: 10, position: 'relative' }}>
          {ticks.map((t) => (
            <div key={t} style={{ position: 'absolute', left: 10, right: 0, bottom: `${20 + (t / axisMax) * (H - 20)}px`, borderTop: '1px dashed var(--border)' }} />
          ))}
          {data.map((d) => {
            const total = d.withRating + d.without
            const totalH = (total / axisMax) * (H - 20)
            const withH = total ? (d.withRating / total) * totalH : 0
            return (
              <div key={d.tahun} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: H - 20, position: 'relative', zIndex: 1 }}>
                <div style={{ width: '60%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: totalH || 1 }}>
                  <div style={{ height: totalH - withH, background: '#e5e7eb', borderRadius: withH > 0 ? '0' : '4px 4px 0 0' }} />
                  <div style={{ height: withH, background: '#1a6e3c', borderRadius: '4px 4px 0 0' }} />
                </div>
                <span style={{ position: 'absolute', bottom: -20, fontSize: 11, color: 'var(--muted)' }}>{d.tahun}</span>
              </div>
            )
          })}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 12, fontSize: 10.5, color: 'var(--muted)' }}>
        <span><span style={{ display: 'inline-block', width: 9, height: 9, background: '#1a6e3c', borderRadius: 2, marginRight: 5 }} />Tercatat</span>
        <span><span style={{ display: 'inline-block', width: 9, height: 9, background: '#e5e7eb', borderRadius: 2, marginRight: 5 }} />Belum Ada</span>
      </div>
    </div>
  )
}

// ── DYNAMIC CHART — 6 panel breakdown di atas tabel Database, sync dengan filter aktif ──
const PEND_ORDER = ['S3', 'S2', 'S1', 'D4', 'D3', 'D2', 'D1', 'SMA/SLTA/Setara', 'SMP/SLTP/Setara', 'Lain-lain']
const NB_ORDER = ['HIGH POTENTIAL', 'PROMOTABLE', 'SOLID CONTRIBUTOR', 'SLEEPING TIGER', 'UNFIT', 'Belum Dinilai']
const JB_ORDER = ['BOD', 'BOD-1', 'BOD-2', 'BOD-3', 'BOD-4', 'BOD-5', 'STAF']
const HASIL_ORDER = ['Q', 'DS', 'DSP', 'NQ', 'TD']
const RATING_YEARS = ['2023', '2024', '2025']

function DynamicChart({ rows, isFiltered, onReset }) {
  const jkC = { Male: 0, Female: 0, Lainnya: 0 }
  rows.forEach((r) => { jkC[normalizeJK(r.jenis_kelamin)]++ })
  const jkEntries = Object.entries(jkC).filter(([, v]) => v > 0)

  const uC = { '< 30': 0, '30–40': 0, '41–50': 0, '> 50': 0 }
  rows.forEach((r) => {
    if (r.usia == null) return
    const a = parseFloat(r.usia)
    if (a < 30) uC['< 30']++
    else if (a <= 40) uC['30–40']++
    else if (a <= 50) uC['41–50']++
    else uC['> 50']++
  })

  const pC = {}
  rows.forEach((r) => { const k = normalizePendidikan(r.pendidikan); pC[k] = (pC[k] || 0) + 1 })
  const pKeys = PEND_ORDER.filter((k) => pC[k])

  const nC = {}
  rows.forEach((r) => {
    const nb = fStr(r.ninebox) === '—' ? 'Belum Dinilai' : String(r.ninebox).toUpperCase()
    const label = NB_ORDER.find((x) => x === nb) || nb
    nC[label] = (nC[label] || 0) + 1
  })
  const nbKeys = NB_ORDER.filter((k) => nC[k])

  const jbC = {}
  rows.forEach((r) => { const k = fStr(r.level_jabatan); if (k !== '—') jbC[k] = (jbC[k] || 0) + 1 })
  const jbKeys = [...JB_ORDER.filter((j) => jbC[j]), ...Object.keys(jbC).filter((k) => !JB_ORDER.includes(k.toUpperCase()))]

  const hasilC = {}
  rows.forEach((r) => { const k = r.hasilAs ? fStr(r.hasilAs) : 'Belum Ada'; hasilC[k] = (hasilC[k] || 0) + 1 })
  const hasilKeys = [...HASIL_ORDER.filter((k) => hasilC[k]), ...Object.keys(hasilC).filter((k) => !HASIL_ORDER.includes(k))]

  const trenData = RATING_YEARS.map((y) => {
    let withRating = 0
    rows.forEach((r) => {
      const rv = r.kpiByYear?.[y]?.rating
      if (rv && String(rv).trim() && String(rv).trim() !== '—' && String(rv).toLowerCase() !== 'null') withRating++
    })
    return { tahun: y, withRating, without: rows.length - withRating }
  })
  const latestTren = trenData[trenData.length - 1]

  const CardHeader = ({ title }) => <div className="card-title">{title}</div>

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--muted)' }}>Dynamic Chart</span>
        {isFiltered && (
          <span style={{ fontSize: 10, color: 'var(--muted)', opacity: 0.85, fontWeight: 600 }}>(Terfilter — {rows.length} karyawan)</span>
        )}
        {isFiltered && (
          <button className="btn-refresh" style={{ marginLeft: 'auto' }} onClick={onReset}>
            <Icon name="refresh" size={11} /> Reset
          </button>
        )}
      </div>
      <div className="three-col">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card">
            <CardHeader title="Jenis Kelamin" />
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 10 }}>
              Total <strong style={{ color: 'var(--text)', fontSize: 14 }}>{jkEntries.reduce((a, [, v]) => a + v, 0)}</strong> karyawan
            </div>
            <BarList labels={jkEntries.map(([k]) => k)} values={jkEntries.map(([, v]) => v)} colors={PALETTE} dot />
          </div>
          <div className="card">
            <CardHeader title="Usia" />
            <BarList labels={Object.keys(uC)} values={Object.values(uC)} colors={['#8aa9c9', '#5f9c7e', '#d9a441', '#9b8fc4']} showPct={false} />
          </div>
        </div>
        <div className="card">
          <CardHeader title="Pendidikan" />
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 10 }}>
            Jenjang terbanyak: <strong style={{ color: 'var(--text)' }}>{pKeys[0] || '—'}</strong>
          </div>
          <BarList labels={pKeys} values={pKeys.map((k) => pC[k])} colors={PALETTE} dot />
        </div>
        <div className="card">
          <CardHeader title="Tren Rating (2023–2025)" />
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 10 }}>
            {latestTren.tahun}: <strong style={{ color: 'var(--accent)' }}>{latestTren.withRating}</strong> tercatat,{' '}
            <strong style={{ color: 'var(--dim)' }}>{latestTren.without}</strong> belum ada
          </div>
          <TrenRatingChart data={trenData} />
        </div>

        <div className="card">
          <CardHeader title="Kategori 9-Box" />
          <BarList labels={nbKeys} values={nbKeys.map((k) => nC[k])} colors={['#1a6e3c', '#1a4f7a', '#d9a441', '#9b8fc4', '#c0392b', '#6b7280']} showPct={false} />
        </div>
        <div className="card">
          <CardHeader title="Level Jabatan" />
          <BarList labels={jbKeys} values={jbKeys.map((k) => jbC[k] || 0)} colors={['#4d8f7d', '#3f7fa8', '#9b8fc4', '#d9a441', '#c0392b', '#6b7280']} showPct={false} />
        </div>
        <div className="card">
          <CardHeader title="Hasil Asesmen Terakhir" />
          <BarList labels={hasilKeys} values={hasilKeys.map((k) => hasilC[k])} colors={['#6b7280', '#1a6e3c', '#1a4f7a', '#c0392b', '#d9a441']} showPct={false} />
        </div>
      </div>
    </div>
  )
}

const PALETTE = ['#1a6e3c', '#1a4f7a', '#d9a441', '#9b8fc4', '#c0392b', '#6b7280', '#0891b2', '#c2185b']

function Pagination({ page, totalPages, onGoPage, extraLeft }) {
  const btnStyle = (active) => ({
    padding: '5px 11px',
    borderRadius: 7,
    border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border2)'}`,
    background: active ? 'var(--accent)' : 'var(--bg2)',
    color: active ? '#fff' : 'var(--muted)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  })
  if (totalPages <= 1) return <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>{extraLeft}</div>

  let sp = Math.max(1, page - 2)
  let ep = Math.min(totalPages, sp + 4)
  if (ep - sp < 4) sp = Math.max(1, ep - 4)
  const pages = []
  for (let p = sp; p <= ep; p++) pages.push(p)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
      {extraLeft}
      <button style={btnStyle(false)} onClick={() => onGoPage(page - 1)} disabled={page === 1}>
        &lsaquo; Prev
      </button>
      {sp > 1 && (
        <>
          <button style={btnStyle(false)} onClick={() => onGoPage(1)}>1</button>
          <span style={{ color: 'var(--dim)' }}>…</span>
        </>
      )}
      {pages.map((p) => (
        <button key={p} style={btnStyle(p === page)} onClick={() => onGoPage(p)}>
          {p}
        </button>
      ))}
      {ep < totalPages && (
        <>
          <span style={{ color: 'var(--dim)' }}>…</span>
          <button style={btnStyle(false)} onClick={() => onGoPage(totalPages)}>{totalPages}</button>
        </>
      )}
      <button style={btnStyle(false)} onClick={() => onGoPage(page + 1)} disabled={page === totalPages}>
        Next &rsaquo;
      </button>
    </div>
  )
}

// ════════════════════════════════════════
// DATABASE TAB
// ════════════════════════════════════════
function DatabaseTab({ rows }) {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({})
  const [pageSize, setPageSize] = useState(20)
  const [page, setPage] = useState(1)
  const [exportOpen, setExportOpen] = useState(false)
  const [selectedCols, setSelectedCols] = useState(() => new Set(EXPORT_COLS.map((c) => c.key)))
  const [exporting, setExporting] = useState(false)

  const filterOptions = useMemo(() => buildDbFilterOptions(rows), [rows])
  const filtered = useMemo(() => filterDbRows(rows, { search, filters }), [rows, search, filters])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageList = filtered.slice((safePage - 1) * pageSize, (safePage - 1) * pageSize + pageSize)

  function setFilter(key, val) {
    setFilters((f) => ({ ...f, [key]: val }))
    setPage(1)
  }

  function toggleCol(key) {
    setSelectedCols((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  async function handleExport() {
    setExporting(true)
    try {
      await exportDatabaseToExcel(filtered, selectedCols)
      setExportOpen(false)
    } finally {
      setExporting(false)
    }
  }

  const isFiltered = !!search || Object.values(filters).some((v) => v)
  function handleReset() {
    setSearch('')
    setFilters({})
    setPage(1)
  }

  const filterCol = (options, filterKey, minWidth = 90) => (
    <th style={{ minWidth, background: 'var(--bg3)', padding: '4px 6px' }}>
      {options.length > 0 && (
        <select
          value={filters[filterKey] || ''}
          onChange={(e) => setFilter(filterKey, e.target.value)}
          className={filters[filterKey] ? 'active-filter' : ''}
          style={{
            width: '100%',
            minWidth,
            padding: '3px 20px 3px 6px',
            fontSize: 10.5,
            background: 'var(--bg2)',
            border: '1px solid var(--border2)',
            borderRadius: 5,
            color: 'var(--text)',
            cursor: 'pointer',
          }}
        >
          <option value="">— Semua —</option>
          {options.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      )}
    </th>
  )

  const freezeStyle = (left, extra = {}) => ({
    position: 'sticky',
    left,
    background: 'var(--bg2)',
    zIndex: 2,
    ...extra,
  })

  return (
    <div>
      <DynamicChart rows={filtered} isFiltered={isFiltered} onReset={handleReset} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, marginTop: 4 }}>
        <div className="card-title-icon" style={{ background: '#dcfce7' }}>🗄️</div>
        <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--muted)' }}>
          Database
        </span>
      </div>

      <div className="toolbar">
        <input
          type="text"
          className="search-input"
          placeholder="🔍 Cari NIK, nama, posisi, unit kerja…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          style={{ maxWidth: 360 }}
        />
        <select
          className="fselect"
          value={pageSize}
          onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(1) }}
          style={{ minWidth: 70 }}
        >
          {[10, 20, 30, 40, 50, 100].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <span className="count-badge">{filtered.length} dari {rows.length} karyawan</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        <button className="btn-refresh" onClick={handleReset}>
          <Icon name="refresh" size={11} /> Reset
        </button>
        <div className="export-dropdown" style={{ position: 'relative', display: 'inline-flex' }}>
          <button
            className="btn-refresh"
            style={{ background: 'var(--accent2)', color: '#fff', borderColor: 'var(--accent2)' }}
            onClick={() => setExportOpen((v) => !v)}
          >
            <Icon name="download" size={11} /> Export ▾
          </button>
          {exportOpen && (
            <div className="export-menu open">
              <div className="export-menu-header">Pilih Kolom Export</div>
              <div className="export-menu-cols">
                <div style={{ padding: '6px 14px 8px', fontSize: 11, color: 'var(--muted)' }}>
                  Export <strong>{filtered.length}</strong> baris (sesuai filter yang aktif)
                </div>
                {EXPORT_COLS.map((c) => (
                  <label key={c.key} className="export-menu-col">
                    <input type="checkbox" checked={selectedCols.has(c.key)} onChange={() => toggleCol(c.key)} />
                    {c.label}
                  </label>
                ))}
              </div>
              <div className="export-menu-footer">
                <button className="export-btn-selall" onClick={() => setSelectedCols(new Set(EXPORT_COLS.map((c) => c.key)))}>
                  Pilih Semua
                </button>
                <button className="export-btn-go" onClick={handleExport} disabled={exporting}>
                  {exporting ? 'Memproses…' : '⬇ Download XLSX'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="tbl-wrap" style={{ position: 'relative', maxHeight: 560 }}>
        <table>
          <thead>
            <tr>
              <th style={freezeStyle(0, { width: 38, minWidth: 38, textAlign: 'center' })}>No</th>
              <th style={freezeStyle(38, { minWidth: 90 })}>NIK</th>
              <th style={freezeStyle(128, { minWidth: 145, borderRight: '2px solid var(--border2)', boxShadow: '2px 0 4px rgba(0,0,0,.05)' })}>Nama</th>
              <th>Posisi</th>
              <th style={{ textAlign: 'center' }}>Level Jabatan</th>
              <th>Unit Kerja</th>
              <th>Grup Job Function</th>
              <th style={{ minWidth: 100 }}>Tgl Lahir</th>
              <th style={{ minWidth: 48 }}>Usia</th>
              <th style={{ textAlign: 'center' }}>Jenis Kelamin</th>
              <th style={{ textAlign: 'center' }}>Pendidikan</th>
              <th style={{ textAlign: 'center' }}>Sanksi</th>
              <th style={{ textAlign: 'center' }}>Waktu Sanksi</th>
              <th style={{ textAlign: 'center' }}>9-Box</th>
              <th>Soft CLI</th>
              <th>Hard CLI</th>
              <th style={{ textAlign: 'center' }}>Skor KPI</th>
              <th style={{ textAlign: 'center' }}>Perf. Rating</th>
              <th style={{ textAlign: 'center' }}>Hasil Asesmen Terakhir</th>
              <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Waktu Asesmen</th>
              <th style={{ textAlign: 'center' }}>Lembaga Asesmen</th>
              <th style={{ textAlign: 'center' }}>Job Rotation</th>
              <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Development</th>
              <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Project Involvement</th>
              <th style={{ textAlign: 'center' }}>Awarding</th>
            </tr>
            <tr>
              <th style={freezeStyle(0, { background: 'var(--bg3)' })}></th>
              <th style={freezeStyle(38, { background: 'var(--bg3)' })}></th>
              <th style={freezeStyle(128, { background: 'var(--bg3)' })}></th>
              <th style={{ background: 'var(--bg3)' }}></th>
              {filterCol(filterOptions.jabatan, 'jabatan', 100)}
              {filterCol(filterOptions.unit, 'unit', 110)}
              {filterCol(filterOptions.grup, 'grup', 110)}
              <th style={{ background: 'var(--bg3)' }}></th>
              <th style={{ background: 'var(--bg3)' }}></th>
              {filterCol(filterOptions.jk, 'jk', 75)}
              {filterCol(filterOptions.pend, 'pend', 85)}
              {filterCol(filterOptions.sanksi, 'sanksi', 85)}
              <th style={{ background: 'var(--bg3)' }}></th>
              {filterCol(filterOptions.ninebox, 'ninebox', 100)}
              <th style={{ minWidth: 80, background: 'var(--bg3)', padding: '4px 6px' }}>
                <select value={filters.cli || ''} onChange={(e) => setFilter('cli', e.target.value)} style={{ width: '100%', fontSize: 10.5 }}>
                  <option value="">— Semua —</option>
                  <option value="&gt;85">&gt; 85</option>
                  <option value="70-85">70 – 85</option>
                  <option value="&lt;70">&lt; 70</option>
                </select>
              </th>
              <th style={{ background: 'var(--bg3)' }}></th>
              <th style={{ minWidth: 80, background: 'var(--bg3)', padding: '4px 6px' }}>
                <select value={filters.kpi || ''} onChange={(e) => setFilter('kpi', e.target.value)} style={{ width: '100%', fontSize: 10.5 }}>
                  <option value="">— Semua —</option>
                  <option value="&gt;85">&gt; 85</option>
                  <option value="70-85">70 – 85</option>
                  <option value="&lt;70">&lt; 70</option>
                </select>
              </th>
              <th style={{ background: 'var(--bg3)' }}></th>
              {filterCol(filterOptions.hasil_as, 'hasil_as', 110)}
              <th style={{ background: 'var(--bg3)' }}></th>
              {filterCol(filterOptions.lmbg_as, 'lmbg_as', 110)}
              <th style={{ minWidth: 90, background: 'var(--bg3)', padding: '4px 6px' }}>
                <select value={filters.jobrot || ''} onChange={(e) => setFilter('jobrot', e.target.value)} style={{ width: '100%', fontSize: 10.5 }}>
                  <option value="">Semua</option>
                  <option value="1">1 kali</option>
                  <option value="2">2 kali</option>
                  <option value="&lt;5">&lt; 5 kali</option>
                  <option value="&gt;5">&gt; 5 kali</option>
                </select>
              </th>
              <th style={{ background: 'var(--bg3)' }}></th>
              <th style={{ background: 'var(--bg3)' }}></th>
              <th style={{ background: 'var(--bg3)' }}></th>
            </tr>
          </thead>
          <tbody>
            {pageList.map((r, idx) => {
              const rowNum = (safePage - 1) * pageSize + idx + 1
              return (
                <tr key={r.nik}>
                  <td style={freezeStyle(0, { fontSize: 11, color: 'var(--dim)', textAlign: 'center' })}>{rowNum}</td>
                  <td style={freezeStyle(38, { fontSize: 11, color: 'var(--muted)' })}>{fStr(r.nik)}</td>
                  <td style={freezeStyle(128, { fontWeight: 700, whiteSpace: 'nowrap' })}>{toProperCase(fStr(r.nama))}</td>
                  <td style={{ fontSize: 12, whiteSpace: 'nowrap' }} title={fStr(r.posisi)}>{properPosisi(fStr(r.posisi))}</td>
                  <td style={{ fontSize: 11.5, color: 'var(--muted)', textAlign: 'center' }}>{fStr(r.level_jabatan)}</td>
                  <td style={{ fontSize: 11.5, color: 'var(--muted)', whiteSpace: 'nowrap', minWidth: 130 }}>{properPosisi(fStr(r.unit_kerja))}</td>
                  <td style={{ whiteSpace: 'nowrap', minWidth: 180 }}>
                    <span style={{ background: 'var(--bg3)', padding: '2px 8px', borderRadius: 4, fontSize: 10.5, fontWeight: 600, color: 'var(--muted)' }}>
                      {fStr(r.grup)}
                    </span>
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--dim)', whiteSpace: 'nowrap', minWidth: 100 }}>{fmtTgl(r.tgl_lahir)}</td>
                  <td style={{ fontSize: 12, textAlign: 'center' }}>{r.usia != null ? Math.round(parseFloat(r.usia)) : '—'}</td>
                  <td style={{ textAlign: 'center', fontSize: 12 }}>{normalizeJK(r.jenis_kelamin)}</td>
                  <td style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>{normalizePendidikan(r.pendidikan)}</td>
                  <td style={{ whiteSpace: 'nowrap', textAlign: 'center' }}><SanksiCell v={r.sanksi} /></td>
                  <td style={{ fontSize: 11, color: 'var(--dim)', textAlign: 'center' }}>{fStr(r.waktu_sanksi)}</td>
                  <td style={{ textAlign: 'center' }}><NbBadge v={r.ninebox} /></td>
                  <td><ScoreBar v={r.cliSoft} /></td>
                  <td><ScoreBar v={r.cliHard} /></td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>{r.kpiSkor != null ? r.kpiSkor : <Dash />}</td>
                  <td style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{fStr(r.perfRating)}</td>
                  <td style={{ textAlign: 'center' }}>
                    {r.hasilAs ? (
                      <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: 4, fontSize: 10.5, fontWeight: 700 }}>
                        {fStr(r.hasilAs)}
                      </span>
                    ) : <Dash />}
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--dim)', textAlign: 'center', whiteSpace: 'nowrap' }}>{fmtTgl(r.waktuAs)}</td>
                  <td style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>{fStr(r.lmbgAs)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <CountBadge n={r.jobRotCount} color={r.jobRotCount >= 3 ? 'var(--accent)' : r.jobRotCount === 2 ? 'var(--accent3)' : 'var(--accent2)'} />
                  </td>
                  <td style={{ textAlign: 'center' }}><CountPills counts={r.dev?.counts} cfg={DEV_LEVEL_CFG} /></td>
                  <td style={{ textAlign: 'center' }}><CountPills counts={r.proj?.counts} cfg={PROJ_LEVEL_CFG} /></td>
                  <td style={{ textAlign: 'center' }}>
                    {r.awd?.total ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 28, height: 28, padding: '0 8px', borderRadius: 14, background: '#b45309', color: '#fff', fontSize: 12, fontWeight: 700 }}>
                        {r.awd.total}
                      </span>
                    ) : <Dash />}
                  </td>
                </tr>
              )
            })}
            {pageList.length === 0 && (
              <tr><td colSpan={25} style={{ textAlign: 'center', padding: 24, color: 'var(--dim)' }}>Tidak ada data yang cocok.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={safePage} totalPages={totalPages} onGoPage={setPage} />
    </div>
  )
}

// ════════════════════════════════════════
// ASESMEN TAB
// ════════════════════════════════════════
function AsesmenTab({ asesmen, rows }) {
  const [search, setSearch] = useState('')
  const [fTipe, setFTipe] = useState('')
  const [fNb, setFNb] = useState('')

  const nikToNama = useMemo(() => {
    const m = {}
    rows.forEach((r) => { m[String(r.nik)] = r.nama })
    return m
  }, [rows])

  const tipeOptions = useMemo(() => [...new Set(asesmen.map((a) => a.tipe_asesmen).filter(Boolean))], [asesmen])

  const filtered = useMemo(() => {
    return asesmen.filter((a) => {
      const nama = nikToNama[String(a.nik)] || ''
      if (search) {
        const q = search.toLowerCase()
        if (!nama.toLowerCase().includes(q) && !String(a.nik || '').toLowerCase().includes(q)) return false
      }
      if (fTipe && a.tipe_asesmen !== fTipe) return false
      if (fNb && String(a.ninebox || '').toUpperCase() !== fNb) return false
      return true
    })
  }, [asesmen, search, fTipe, fNb, nikToNama])

  const tipeCount = {}
  filtered.forEach((a) => { const k = fStr(a.tipe_asesmen); tipeCount[k] = (tipeCount[k] || 0) + 1 })
  const nbCount = {}
  filtered.forEach((a) => { const k = fStr(a.ninebox).toUpperCase() || 'BELUM DINILAI'; nbCount[k] = (nbCount[k] || 0) + 1 })
  const lembagaCount = {}
  filtered.forEach((a) => { const k = fStr(a.lembaga); lembagaCount[k] = (lembagaCount[k] || 0) + 1 })
  const tahunCount = {}
  filtered.forEach((a) => { const k = a.tanggal ? String(a.tanggal).slice(0, 4) : '—'; tahunCount[k] = (tahunCount[k] || 0) + 1 })

  const uniqNik = new Set(filtered.map((a) => a.nik)).size

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left"><h2>Asesmen</h2><p>Data asesmen terakhir per karyawan</p></div>
      </div>
      <div className="stats-grid">
        <div className="stat-card s-green"><span className="stat-icon">📋</span><div className="stat-label">Total Event Asesmen</div><div className="stat-value">{filtered.length}</div></div>
        <div className="stat-card s-blue"><span className="stat-icon">👥</span><div className="stat-label">Karyawan Dinilai</div><div className="stat-value">{uniqNik}</div></div>
        <div className="stat-card s-orange"><span className="stat-icon">🏛️</span><div className="stat-label">Lembaga</div><div className="stat-value">{Object.keys(lembagaCount).length}</div></div>
      </div>
      <div className="two-col">
        <div className="card">
          <div className="card-title"><div className="card-title-icon" style={{ background: '#dcfce7' }}>📊</div>Tipe Assessment</div>
          <div style={{ padding: '14px 18px 18px' }}><BarList labels={Object.keys(tipeCount)} values={Object.values(tipeCount)} colors={PALETTE} /></div>
        </div>
        <div className="card">
          <div className="card-title"><div className="card-title-icon" style={{ background: '#dbeafe' }}>🌟</div>Kategori 9-Box</div>
          <div style={{ padding: '14px 18px 18px' }}><BarList labels={Object.keys(nbCount)} values={Object.values(nbCount)} colors={PALETTE} /></div>
        </div>
      </div>
      <div className="two-col">
        <div className="card">
          <div className="card-title"><div className="card-title-icon" style={{ background: '#fef3c7' }}>🏛️</div>Lembaga Assessment</div>
          <div style={{ padding: '14px 18px 18px' }}><BarList labels={Object.keys(lembagaCount)} values={Object.values(lembagaCount)} colors={PALETTE} showPct={false} /></div>
        </div>
        <div className="card">
          <div className="card-title"><div className="card-title-icon" style={{ background: '#ede9fe' }}>📅</div>Tahun Assessment</div>
          <div style={{ padding: '14px 18px 18px' }}><BarList labels={Object.keys(tahunCount)} values={Object.values(tahunCount)} colors={PALETTE} showPct={false} /></div>
        </div>
      </div>
      <div className="toolbar">
        <input type="text" className="search-input" placeholder="🔍 Cari nama, NIK…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="fselect" value={fTipe} onChange={(e) => setFTipe(e.target.value)}>
          <option value="">Semua Tipe</option>
          {tipeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="fselect" value={fNb} onChange={(e) => setFNb(e.target.value)}>
          <option value="">Semua 9-Box</option>
          <option>HIGH POTENTIAL</option><option>PROMOTABLE</option>
          <option>SOLID CONTRIBUTOR</option><option>SLEEPING TIGER</option><option>UNFIT</option>
        </select>
        <span className="count-badge">{filtered.length} data</span>
      </div>
    </div>
  )
}

// ════════════════════════════════════════
// CLI TAB
// ════════════════════════════════════════
function CliTab({ cliSoft, rows }) {
  const [selectedKompetensi, setSelectedKompetensi] = useState('')

  const rerataSoft = rows.filter((r) => r.cliSoft != null)
  const avgSoft = rerataSoft.length ? Math.round(rerataSoft.reduce((a, r) => a + r.cliSoft, 0) / rerataSoft.length) : null
  const rerataHard = rows.filter((r) => r.cliHard != null)
  const avgHard = rerataHard.length ? Math.round(rerataHard.reduce((a, r) => a + r.cliHard, 0) / rerataHard.length) : null

  const perKompetensi = useMemo(() => {
    const byComp = {}
    cliSoft.forEach((r) => {
      const k = r.nama_kompetensi || '—'
      if (!byComp[k]) byComp[k] = { total: 0, benar: 0 }
      byComp[k].total++
      if (r.hasil === 1) byComp[k].benar++
    })
    return Object.entries(byComp)
      .map(([nama, v]) => ({ nama, pct: v.total ? Math.round((v.benar / v.total) * 100) : 0, total: v.total }))
      .sort((a, b) => b.pct - a.pct)
  }, [cliSoft])

  const chips = perKompetensi.slice(0, 20)
  const selected = chips.find((c) => c.nama === selectedKompetensi)

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left"><h2>CLI — Competency Level Index</h2><p>Nilai kompetensi (soft &amp; hard) per karyawan</p></div>
      </div>
      <div className="stats-grid">
        <div className="stat-card s-green"><span className="stat-icon">📊</span><div className="stat-label">Rerata Soft CLI</div><div className="stat-value">{avgSoft ?? '—'}</div></div>
        <div className="stat-card s-blue"><span className="stat-icon">🛠️</span><div className="stat-label">Rerata Hard CLI</div><div className="stat-value">{avgHard ?? '—'}</div></div>
        <div className="stat-card s-orange"><span className="stat-icon">👥</span><div className="stat-label">Karyawan Terukur</div><div className="stat-value">{rerataSoft.length}</div></div>
      </div>
      <div className="card">
        <div className="card-title"><div className="card-title-icon" style={{ background: '#dbeafe' }}>📊</div>Rata-rata Nilai per Kompetensi (Soft CLI)</div>
        <div style={{ padding: '14px 18px 18px' }}>
          <BarList labels={perKompetensi.map((c) => c.nama)} values={perKompetensi.map((c) => c.pct)} colors={PALETTE} />
        </div>
      </div>
      <div className="card">
        <div className="card-title"><div className="card-title-icon" style={{ background: '#dcfce7' }}>🔍</div>Filter &amp; Perbandingan per Kompetensi</div>
        <div style={{ padding: '10px 18px 18px' }}>
          <div style={{ marginBottom: 10, fontSize: 12, color: 'var(--muted)' }}>Pilih kompetensi untuk melihat detail:</div>
          <div className="filter-chips">
            {chips.map((c) => (
              <span
                key={c.nama}
                onClick={() => setSelectedKompetensi(c.nama === selectedKompetensi ? '' : c.nama)}
                className="fselect"
                style={{
                  cursor: 'pointer',
                  background: c.nama === selectedKompetensi ? 'var(--accent)' : 'var(--bg2)',
                  color: c.nama === selectedKompetensi ? '#fff' : 'var(--text)',
                  padding: '5px 10px',
                  fontSize: 11.5,
                }}
              >
                {c.nama}
              </span>
            ))}
          </div>
          {selected && (
            <div style={{ marginTop: 14 }}>
              <BarList labels={[selected.nama]} values={[selected.pct]} colors={[selected.pct >= 85 ? '#1a6e3c' : selected.pct >= 70 ? '#d97706' : '#c0392b']} />
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>{selected.total} karyawan diukur pada kompetensi ini</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════
// KPI TAB
// ════════════════════════════════════════
function KpiTab({ rows }) {
  const [search, setSearch] = useState('')
  const [fGrup, setFGrup] = useState('')

  const withKpi = rows.filter((r) => r.kpiSkor != null)
  const filtered = withKpi.filter((r) => {
    if (search) {
      const q = search.toLowerCase()
      if (!fStr(r.nama).toLowerCase().includes(q) && !fStr(r.nik).toLowerCase().includes(q)) return false
    }
    if (fGrup && r.grup !== fGrup) return false
    return true
  })

  const grupOptions = [...new Set(rows.map((r) => r.grup).filter(Boolean))]

  const bins = { '< 70': 0, '70 – 85': 0, '> 85': 0 }
  filtered.forEach((r) => {
    const s = parseFloat(r.kpiSkor)
    if (s < 70) bins['< 70']++
    else if (s <= 85) bins['70 – 85']++
    else bins['> 85']++
  })

  const top10 = [...filtered].sort((a, b) => b.kpiSkor - a.kpiSkor).slice(0, 10)

  const grupAvg = {}
  const grupCount = {}
  filtered.forEach((r) => {
    const g = fStr(r.grup)
    grupAvg[g] = (grupAvg[g] || 0) + parseFloat(r.kpiSkor)
    grupCount[g] = (grupCount[g] || 0) + 1
  })
  const grupAvgFinal = Object.fromEntries(Object.entries(grupAvg).map(([g, sum]) => [g, Math.round(sum / grupCount[g])]))

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left"><h2>KPI — Key Performance Indicator</h2><p>Skor KPI karyawan (tahun terkini)</p></div>
      </div>
      <div className="stats-grid">
        <div className="stat-card s-green"><span className="stat-icon">🎯</span><div className="stat-label">Karyawan Bernilai KPI</div><div className="stat-value">{filtered.length}</div></div>
        <div className="stat-card s-blue"><span className="stat-icon">📈</span><div className="stat-label">Rerata Skor</div>
          <div className="stat-value">{filtered.length ? Math.round(filtered.reduce((a, r) => a + parseFloat(r.kpiSkor), 0) / filtered.length) : '—'}</div>
        </div>
        <div className="stat-card s-orange"><span className="stat-icon">🏆</span><div className="stat-label">Skor Tertinggi</div>
          <div className="stat-value">{top10[0]?.kpiSkor ?? '—'}</div>
        </div>
      </div>
      <div className="two-col">
        <div className="card">
          <div className="card-title"><div className="card-title-icon" style={{ background: '#dcfce7' }}>📊</div>Distribusi Nilai KPI</div>
          <div style={{ padding: '14px 18px 18px' }}><BarList labels={Object.keys(bins)} values={Object.values(bins)} colors={['#c0392b', '#d97706', '#1a6e3c']} /></div>
        </div>
        <div className="card">
          <div className="card-title"><div className="card-title-icon" style={{ background: '#fef3c7' }}>🏆</div>Top 10 KPI Tertinggi</div>
          <div style={{ padding: '14px 18px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {top10.map((r, i) => (
              <div key={r.nik} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <span style={{ width: 18, color: 'var(--dim)', fontWeight: 700 }}>{i + 1}</span>
                <span style={{ flex: 1, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{toProperCase(fStr(r.nama))}</span>
                <span style={{ fontWeight: 800, color: 'var(--accent)' }}>{r.kpiSkor}</span>
              </div>
            ))}
            {top10.length === 0 && <div style={{ color: 'var(--dim)', fontSize: 11.5 }}>Tidak ada data</div>}
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-title"><div className="card-title-icon" style={{ background: '#dbeafe' }}>📈</div>Rata-rata KPI per Grup</div>
        <div style={{ padding: '14px 18px 18px' }}>
          <BarList labels={Object.keys(grupAvgFinal)} values={Object.values(grupAvgFinal)} colors={PALETTE} showPct={false} />
        </div>
      </div>
      <div className="toolbar">
        <input type="text" className="search-input" placeholder="🔍 Cari nama, NIK…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="fselect" value={fGrup} onChange={(e) => setFGrup(e.target.value)}>
          <option value="">Semua Grup</option>
          {grupOptions.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <span className="count-badge">{filtered.length} data</span>
      </div>
    </div>
  )
}

// ════════════════════════════════════════
// JOB ROTATION TAB
// ════════════════════════════════════════
function JobRotTab({ rows }) {
  const [search, setSearch] = useState('')
  const [fJumlah, setFJumlah] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 20

  let list = rows
    .filter((r) => r.jobRotCount > 0)
    .map((r) => ({ nik: r.nik, nama: r.nama, posisi: r.posisi, unit_kerja: r.unit_kerja, jumlah: r.jobRotCount }))

  if (search) {
    const q = search.toLowerCase()
    list = list.filter((r) => fStr(r.nik).toLowerCase().includes(q) || fStr(r.nama).toLowerCase().includes(q) || fStr(r.posisi).toLowerCase().includes(q))
  }
  if (fJumlah === 'ge3') list = list.filter((r) => r.jumlah >= 3)
  else if (fJumlah === '2') list = list.filter((r) => r.jumlah === 2)
  else if (fJumlah === '1') list = list.filter((r) => r.jumlah === 1)

  list.sort((a, b) => b.jumlah - a.jumlah || fStr(a.nama).localeCompare(fStr(b.nama)))

  const totalPages = Math.max(1, Math.ceil(list.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageList = list.slice((safePage - 1) * pageSize, (safePage - 1) * pageSize + pageSize)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div className="card-title-icon" style={{ background: '#dbeafe' }}>🔄</div>
        <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--muted)' }}>Job Rotation</span>
        <span className="count-badge">{list.length} karyawan pernah rotasi</span>
      </div>
      <div className="toolbar">
        <input type="text" className="search-input" placeholder="🔍 Cari NIK, nama…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} style={{ maxWidth: 300 }} />
        <select className="fselect" value={fJumlah} onChange={(e) => { setFJumlah(e.target.value); setPage(1) }}>
          <option value="">Semua Jumlah Rotasi</option>
          <option value="ge3">≥ 3 kali</option>
          <option value="2">2 kali</option>
          <option value="1">1 kali</option>
        </select>
      </div>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ textAlign: 'center', width: 40 }}>No</th>
              <th>NIK</th>
              <th>Nama</th>
              <th>Posisi</th>
              <th>Unit Kerja</th>
              <th style={{ textAlign: 'center' }}>Jumlah Rotasi</th>
            </tr>
          </thead>
          <tbody>
            {pageList.map((r, i) => (
              <tr key={r.nik}>
                <td style={{ textAlign: 'center', fontSize: 11, color: 'var(--dim)' }}>{(safePage - 1) * pageSize + i + 1}</td>
                <td style={{ fontSize: 11.5, color: 'var(--muted)' }}>{r.nik}</td>
                <td style={{ fontWeight: 700, fontSize: 13 }}>{toProperCase(fStr(r.nama))}</td>
                <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{properPosisi(fStr(r.posisi))}</td>
                <td style={{ fontSize: 12, color: 'var(--muted)' }}>{properPosisi(fStr(r.unit_kerja))}</td>
                <td style={{ textAlign: 'center' }}>
                  <CountBadge n={r.jumlah} color={r.jumlah >= 3 ? 'var(--accent)' : r.jumlah === 2 ? 'var(--accent3)' : 'var(--accent2)'} />
                </td>
              </tr>
            ))}
            {pageList.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, color: 'var(--dim)' }}>Tidak ada data.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={safePage} totalPages={totalPages} onGoPage={setPage} />
    </div>
  )
}

// ════════════════════════════════════════
// ROOT
// ════════════════════════════════════════
export default function TalentSource() {
  const [activeTab, setActiveTab] = useState('database')
  const [state, setState] = useState({ loading: true, error: null, data: null })

  useEffect(() => {
    let alive = true
    getTalentSourceData()
      .then((data) => { if (alive) setState({ loading: false, error: null, data }) })
      .catch((error) => { if (alive) setState({ loading: false, error, data: null }) })
    return () => { alive = false }
  }, [])

  const counts = {
    database: state.data?.rows.length || 0,
    asesmen: state.data?.asesmen.length || 0,
    cli: state.data?.cliSoft.length || 0,
    kpi: state.data?.kpi.length || 0,
    jobrot: state.data?.rows.filter((r) => r.jobRotCount > 0).length || 0,
  }

  return (
    <div>
      <div className="topbar">
        {TABS.map((t) => (
          <div key={t.id} className={`top-tab${activeTab === t.id ? ' active' : ''}`} onClick={() => setActiveTab(t.id)}>
            <Icon name={t.icon} size={14} />
            {t.label}
            <span className="tab-count">{counts[t.id]}</span>
          </div>
        ))}
      </div>

      <div className="content">
        <div className="page active">
          {state.loading && (
            <div className="empty-state">
              <div className="es-icon">⏳</div>
              <div className="es-title">Memuat data…</div>
            </div>
          )}

          {!state.loading && state.error && (
            <div className="empty-state">
              <div className="es-icon">⚠️</div>
              <div className="es-title">Gagal memuat data</div>
              <div className="es-sub">{state.error.message || String(state.error)}</div>
            </div>
          )}

          {!state.loading && !state.error && state.data && state.data.rows.length === 0 && (
            <div className="empty-state">
              <div className="es-icon">🗄️</div>
              <div className="es-title">Belum ada data Database</div>
              <div className="es-sub">Upload data karyawan terlebih dahulu (menu Upload Excel).</div>
            </div>
          )}

          {!state.loading && !state.error && state.data && state.data.rows.length > 0 && (
            <>
              {activeTab === 'database' && <DatabaseTab rows={state.data.rows} />}
              {activeTab === 'asesmen' && <AsesmenTab asesmen={state.data.asesmen} rows={state.data.rows} />}
              {activeTab === 'cli' && <CliTab cliSoft={state.data.cliSoft} rows={state.data.rows} />}
              {activeTab === 'kpi' && <KpiTab rows={state.data.rows} />}
              {activeTab === 'jobrot' && <JobRotTab rows={state.data.rows} />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
