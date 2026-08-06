import { useEffect, useMemo, useState, Fragment } from 'react'
import Icon from '../Icon.jsx'
import { supabase } from '../../lib/supabaseClient.js'
import { getTalentSourceData, toProperCase, properPosisi, fStr } from '../../lib/talentSourceApi.js'
import {
  getFormulaWeights,
  buildCandidateProfile,
  scoreCandidates,
  getScoreComponents,
} from '../../lib/talentPointSystemApi.js'
import { avatarColor, initials } from '../../lib/avatar.js'

const RANK_EMOJI = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣']
const MEDAL_COLOR = ['#d97706', '#6b7280', '#92400e', '#1a4f7a', '#7c3aed']

function scoreColor(n) {
  return n > 85 ? 'var(--accent)' : n >= 70 ? 'var(--accent3)' : 'var(--danger)'
}

// ════════════════════════════════════════
// FORMULA TAB (sudah ada sebelumnya, dipertahankan)
// ════════════════════════════════════════
function FormulaTab() {
  const [rows, setRows] = useState(null)

  useEffect(() => {
    supabase
      .from('formula')
      .select('*')
      .order('urutan', { ascending: true })
      .then(({ data }) => setRows(data || []))
  }, [])

  const uniqueKomponen = [...new Map((rows || []).map((r) => [r.komponen, r])).values()]
  const total = uniqueKomponen.reduce((s, r) => s + (Number(r.bobot) || 0), 0)

  return (
    <div className="page active" style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>⚖️ Formula Penilaian</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
          Bobot (%) tiap komponen penilaian. Total harus = 100%. Dipakai langsung sebagai formula skoring di tab{' '}
          <strong>Talent Point System</strong>. Perubahan disimpan ke tabel <strong>formula</strong> di Supabase.
        </div>
      </div>

      {rows === null ? (
        <div style={{ color: 'var(--muted)', fontSize: 12, padding: '16px 0' }}>Memuat formula…</div>
      ) : rows.length === 0 ? (
        <div className="empty-state" style={{ background: 'var(--card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <div className="es-icon">⚖️</div>
          <div className="es-title">Belum ada data Formula</div>
          <div className="es-sub">Isi tabel <strong>formula</strong> di Supabase terlebih dahulu.</div>
        </div>
      ) : (
        <>
          <div className="tbl-wrap" style={{ marginBottom: 16 }}>
            <table>
              <thead>
                <tr>
                  <th>Komponen / Nilai</th>
                  <th>Deskripsi</th>
                  <th style={{ textAlign: 'center' }}>Bobot %</th>
                  <th style={{ textAlign: 'center' }}>Nilai Dasar</th>
                  <th>Keterangan Tier</th>
                </tr>
              </thead>
              <tbody>
                {uniqueKomponen.map((head) => (
                  <Fragment key={head.komponen}>
                    <tr style={{ borderTop: '2px solid var(--border2)', background: 'var(--bg2)' }}>
                      <td style={{ fontWeight: 800, whiteSpace: 'nowrap' }}>{head.label || head.komponen}</td>
                      <td style={{ fontSize: 11.5, color: 'var(--muted)', maxWidth: 280 }}>{head.deskripsi || ''}</td>
                      <td style={{ textAlign: 'center', fontWeight: 800, color: 'var(--accent)' }}>{head.bobot}%</td>
                      <td style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted)' }}>—</td>
                      <td style={{ fontSize: 11, color: 'var(--muted)' }}>Maks = bobot%</td>
                    </tr>
                    {rows.filter((r) => r.komponen === head.komponen).map((t, ti) => (
                      <tr key={t.id ?? `${head.komponen}-${ti}`} style={{ background: 'var(--bg3)' }}>
                        <td style={{ paddingLeft: 36, whiteSpace: 'nowrap' }}>
                          <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', opacity: 0.4, marginRight: 7 }} />
                          {t.tier_nilai}
                        </td>
                        <td style={{ fontSize: 11, color: 'var(--dim)' }}>{t.keterangan_tier || '—'}</td>
                        <td style={{ textAlign: 'center', color: 'var(--dim)' }}>—</td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{t.poin_dasar}<span style={{ fontSize: 10, color: 'var(--dim)' }}>/100</span></td>
                        <td style={{ fontSize: 11, color: 'var(--dim)' }}>
                          {t.poin_dasar} × {head.bobot}% / 100 = {parseFloat(((Number(t.poin_dasar) || 0) * (Number(head.bobot) || 0) / 100).toFixed(3))} poin
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: total === 100 ? 'var(--accent)' : 'var(--danger)' }}>
            Total bobot: {total}% {total === 100 ? '✅' : '⚠️ Harus = 100%'}
          </div>
        </>
      )}
    </div>
  )
}

// ════════════════════════════════════════
// SELECTOR SLOT (1 kartu kandidat / 1 kotak cari)
// ════════════════════════════════════════
function SlotCard({ index, nik, rows, takenNiks, onPick, onRemove }) {
  const [query, setQuery] = useState('')

  if (nik) {
    const r = rows.find((x) => String(x.nik) === String(nik))
    const nama = toProperCase(fStr(r?.nama))
    const av = avatarColor(nama)
    return (
      <div style={{ background: 'var(--bg2)', border: '2px solid var(--accent)', borderRadius: 12, padding: 14, position: 'relative' }}>
        <button
          onClick={() => onRemove(index)}
          style={{
            position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: '50%',
            border: '1px solid var(--border2)', background: 'var(--bg3)', cursor: 'pointer', fontSize: 13,
            color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ×
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 26 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: av, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
            {initials(nama)}
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 12.5 }}>{nama}</div>
            <div style={{ fontSize: 9.5, color: 'var(--muted)', marginTop: 2 }}>{fStr(r?.level_jabatan)}</div>
            <div style={{ fontSize: 9.5, color: 'var(--dim)' }}>{properPosisi(fStr(r?.unit_kerja))}</div>
          </div>
        </div>
      </div>
    )
  }

  const q = query.trim().toLowerCase()
  const hits = q
    ? rows.filter((r) => !takenNiks.includes(String(r.nik)) && (fStr(r.nama).toLowerCase().includes(q) || fStr(r.nik).toLowerCase().includes(q))).slice(0, 8)
    : []

  return (
    <div style={{ background: 'var(--bg3)', border: '2px dashed var(--border2)', borderRadius: 12, padding: 14, minHeight: 155, display: 'flex', flexDirection: 'column', gap: 8, position: 'relative' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>Karyawan {index + 1}</div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="🔍 Nama atau NIK…"
        autoComplete="off"
        style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border2)', borderRadius: 7, fontSize: 12, background: 'var(--bg2)', color: 'var(--text)', boxSizing: 'border-box' }}
      />
      {hits.length > 0 && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 8, maxHeight: 160, overflowY: 'auto', boxShadow: '0 4px 16px rgba(0,0,0,.12)', position: 'absolute', left: 14, right: 14, top: 78, zIndex: 20 }}>
          {hits.map((r) => (
            <div
              key={r.nik}
              onClick={() => { onPick(index, r.nik); setQuery('') }}
              style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid var(--border)' }}
            >
              <div style={{ fontWeight: 700 }}>{toProperCase(fStr(r.nama))}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>{fStr(r.nik)} · {properPosisi(fStr(r.posisi))}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════
// TABEL PERBANDINGAN
// ════════════════════════════════════════
const COMPARE_FIELDS = [
  { k: 'posisi', label: 'Posisi Jabatan', num: false },
  { k: 'jabatan', label: 'Level Jabatan', num: false },
  { k: 'unit', label: 'Unit Kerja', num: false },
  { k: 'usia', label: 'Usia', num: true },
  { k: 'pendidikan', label: 'Pendidikan', num: false },
  { k: 'sanksi', label: 'Sanksi', num: false },
  { k: 'ninebox', label: 'Kategori 9-Box', num: false },
  { k: 'cli', label: 'Soft CLI', num: true },
  { k: 'kpi', label: 'Skor KPI', num: true },
  { k: 'perf', label: 'Performance Rating', num: false },
  { k: 'hasil_as', label: 'Asesmen Terakhir', num: false },
  { k: 'rotasi', label: 'Job Rotation (×)', num: true },
  { k: 'dev_total', label: 'Development', num: true },
  { k: 'proj_total', label: 'Project Involvement', num: true },
  { k: 'awd_total', label: 'Awarding', num: true },
]

function CompareTable({ profiles }) {
  return (
    <div className="tbl-wrap" style={{ marginBottom: 22 }}>
      <table>
        <thead>
          <tr>
            <th style={{ minWidth: 170 }}>Aspek</th>
            {profiles.map((p) => {
              const av = avatarColor(p.nama)
              return (
                <th key={p.nik} style={{ minWidth: 155, textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                    <div style={{ width: 27, height: 27, borderRadius: '50%', background: av, color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {initials(p.nama)}
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div>{p.nama}</div>
                      <div style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 500 }}>{p.jabatan} · {p.nik}</div>
                    </div>
                  </div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {COMPARE_FIELDS.map((f) => {
            const vals = profiles.map((p) => p[f.k])
            let best = null
            if (f.num) {
              const nums = vals.map((v) => (v != null ? parseFloat(v) : null)).filter((v) => v != null)
              if (nums.length > 1) best = Math.max(...nums)
            }
            return (
              <tr key={f.k}>
                <td style={{ fontWeight: 600, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{f.label}</td>
                {vals.map((v, i) => {
                  const num = f.num && v != null ? parseFloat(v) : null
                  const isBest = f.num && num != null && num === best && best > 0
                  let disp
                  if (v == null || v === '—' || v === '') disp = <span style={{ color: 'var(--dim)' }}>—</span>
                  else if (f.k === 'cli' || f.k === 'kpi') {
                    const col = scoreColor(num)
                    disp = (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
                        <div style={{ width: 48, height: 6, background: 'var(--border2)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, num)}%`, height: '100%', background: col, borderRadius: 3 }} />
                        </div>
                        <strong style={{ color: col }}>{f.k === 'cli' ? num.toFixed(2) : num}</strong>
                      </div>
                    )
                  } else if (f.num && num != null) disp = <strong>{num}</strong>
                  else disp = <span style={{ fontSize: 12 }}>{v}</span>
                  return (
                    <td key={i} style={{ textAlign: 'center', background: isBest ? 'rgba(26,110,60,.06)' : undefined }}>
                      {isBest && <span style={{ fontSize: 10, marginRight: 3 }}>🏆</span>}
                      {disp}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ════════════════════════════════════════
// HASIL ANALISIS (leaderboard + rincian + rekomendasi)
// ════════════════════════════════════════
function AnalysisResult({ ranked, formulaWeights }) {
  const top = ranked[0]
  const components = getScoreComponents(formulaWeights)
  const gap = ranked.length > 1 ? top.totalScore - ranked[ranked.length - 1].totalScore : 0
  const promoList = ranked.filter((p) => p.ninebox && (p.ninebox.toUpperCase().includes('HIGH POTENTIAL') || p.ninebox.toUpperCase().includes('PROMOTABLE')))
  const needDevList = ranked.filter((p) => p.s_cli < 12 * 0.7 || p.s_kpi < 12 * 0.7)
  const sanksiList = ranked.filter((p) => {
    const s = String(p.sanksi || '').toLowerCase().trim()
    const noSanksi = !s || s === '—' || s === 'null' || s === 'none' || s === '-' || s === 'nihil' || s === 'bersih' || s.includes('tidak ada') || s === 'tidak'
    return !noSanksi
  })
  const sanksiMax = components.find((c) => c.key === 's_sanksi')?.max || 10
  const kuatTop = [
    top.s_nb >= 20 * 0.8 ? `9-Box (${top.s_nb}/20)` : '',
    top.s_cli >= 12 * 0.8 ? `CLI (${top.s_cli}/12)` : '',
    top.s_kpi >= 12 * 0.8 ? `KPI (${top.s_kpi}/12)` : '',
    top.s_sanksi >= sanksiMax ? `Bersih sanksi (${top.s_sanksi})` : '',
    top.s_as >= 12 * 0.8 ? `Asesmen (${top.s_as}/12)` : '',
  ].filter(Boolean).join(', ')

  return (
    <div className="card">
      <div className="card-title">Analisis Talent Point System</div>

      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)', margin: '18px 0 10px', padding: '8px 14px', background: 'rgba(26,110,60,.06)', borderLeft: '3px solid var(--accent)', borderRadius: '0 7px 7px 0' }}>
        1. Ranking Akhir
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ranked.map((p, i) => {
          const col = MEDAL_COLOR[i] || 'var(--muted)'
          const av = avatarColor(p.nama)
          const pct = Math.min(100, p.totalScore)
          return (
            <div key={p.nik} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 15px', background: i === 0 ? 'rgba(26,110,60,.06)' : 'var(--bg3)', borderRadius: 10, border: `1.5px solid ${i === 0 ? 'var(--accent)' : 'var(--border)'}` }}>
              <div style={{ fontSize: 22, minWidth: 30, textAlign: 'center' }}>{RANK_EMOJI[i] || `#${i + 1}`}</div>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: av, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
                {initials(p.nama)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: i === 0 ? 'var(--accent)' : col, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nama}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>{p.jabatan} · {p.unit}</div>
                <div style={{ marginTop: 5, width: '100%', height: 6, background: 'var(--border2)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: i === 0 ? 'var(--accent)' : col, borderRadius: 3 }} />
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: i === 0 ? 'var(--accent)' : col }}>{p.totalScore}</div>
                <div style={{ fontSize: 9, color: 'var(--dim)' }}>/ 100 poin</div>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)', margin: '18px 0 10px', padding: '8px 14px', background: 'rgba(26,110,60,.06)', borderLeft: '3px solid var(--accent)', borderRadius: '0 7px 7px 0' }}>
        2. Rincian Poin per Komponen
      </div>
      <div className="tbl-wrap" style={{ marginBottom: 4 }}>
        <table>
          <thead>
            <tr>
              <th style={{ minWidth: 130 }}>Komponen</th>
              <th style={{ textAlign: 'center' }}>Maks</th>
              {ranked.map((p, i) => (
                <th key={p.nik} style={{ textAlign: 'center', minWidth: 120, color: MEDAL_COLOR[i] || 'var(--muted)' }}>
                  {RANK_EMOJI[i]} {p.nama}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {components.map((k) => {
              const vals = ranked.map((p) => p[k.key])
              const best = Math.max(...vals)
              return (
                <tr key={k.key}>
                  <td style={{ fontWeight: 600 }}>{k.label}</td>
                  <td style={{ textAlign: 'center', fontSize: 11, color: 'var(--dim)' }}>{k.max}</td>
                  {ranked.map((p, i) => {
                    const v = p[k.key]
                    const isBest = v === best && best > 0
                    const col = isBest ? '#0f9d4a' : v >= k.max * 0.8 ? 'var(--accent)' : v >= k.max * 0.5 ? 'var(--accent3)' : 'var(--danger)'
                    const pct = k.max > 0 ? Math.min(100, (v / k.max) * 100) : 0
                    return (
                      <td key={i} style={{ textAlign: 'center', background: isBest ? 'rgba(15,157,74,.07)' : undefined }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <div style={{ width: 44, height: 5, background: 'var(--border2)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: col, borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 11.5, fontWeight: 800, color: col }}>{v}</span>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
            <tr style={{ background: 'rgba(26,110,60,.04)' }}>
              <td style={{ fontWeight: 800, color: 'var(--accent)', borderTop: '2px solid var(--accent)' }}>TOTAL POIN</td>
              <td style={{ textAlign: 'center', borderTop: '2px solid var(--accent)', fontWeight: 700, color: 'var(--accent)' }}>100</td>
              {ranked.map((p, i) => {
                const col = MEDAL_COLOR[i] || 'var(--muted)'
                return (
                  <td key={i} style={{ textAlign: 'center', borderTop: '2px solid var(--accent)' }}>
                    <div style={{ fontSize: 17, fontWeight: 900, color: i === 0 ? 'var(--accent)' : col }}>{p.totalScore}</div>
                    <div style={{ fontSize: 9, color: 'var(--dim)' }}>/ 100</div>
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)', margin: '18px 0 10px', padding: '8px 14px', background: 'rgba(26,110,60,.06)', borderLeft: '3px solid var(--accent)', borderRadius: '0 7px 7px 0' }}>
        3. Rekomendasi
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ padding: '12px 14px', background: 'rgba(26,110,60,.05)', borderRadius: 9, borderLeft: '3px solid var(--accent)' }}>
          <div style={{ fontWeight: 800, fontSize: 12.5, color: 'var(--accent)', marginBottom: 4 }}>{top.nama} — Unggul dengan {top.totalScore} poin</div>
          <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.7 }}>Komponen terkuat: {kuatTop || '—'}</div>
          {gap > 10 && (
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Selisih {gap.toFixed(1)} poin dari kandidat terlemah — keunggulan signifikan.</div>
          )}
        </div>

        {promoList.length > 0 && (
          <div style={{ padding: '10px 14px', background: 'rgba(26,79,122,.05)', borderRadius: 9, borderLeft: '3px solid var(--accent2)' }}>
            <div style={{ fontWeight: 700, fontSize: 11.5, color: 'var(--accent2)', marginBottom: 3 }}>Kandidat Siap Promosi</div>
            <div style={{ fontSize: 12, color: 'var(--text)' }}>
              {promoList.map((p) => `${p.nama} (${p.ninebox}, ${p.totalScore} poin)`).join(' · ')}
            </div>
          </div>
        )}

        {needDevList.length > 0 && (
          <div style={{ padding: '10px 14px', background: 'rgba(217,119,6,.05)', borderRadius: 9, borderLeft: '3px solid var(--accent3)' }}>
            <div style={{ fontWeight: 700, fontSize: 11.5, color: 'var(--accent3)', marginBottom: 3 }}>Prioritas Pengembangan Kompetensi</div>
            <div style={{ fontSize: 12, color: 'var(--text)' }}>
              {needDevList.map((p) => `${p.nama} (CLI: ${p.s_cli}/12, KPI: ${p.s_kpi}/12)`).join(' · ')}
            </div>
          </div>
        )}

        {sanksiList.length > 0 && (
          <div style={{ padding: '10px 14px', background: 'rgba(192,57,43,.05)', borderRadius: 9, borderLeft: '3px solid var(--danger)' }}>
            <div style={{ fontWeight: 700, fontSize: 11.5, color: 'var(--danger)', marginBottom: 3 }}>⚠️ Catatan Sanksi</div>
            <div style={{ fontSize: 12, color: 'var(--text)' }}>
              {sanksiList.map((p) => `${p.nama} (${p.sanksi}) — ${p.s_sanksi} poin`).join(', ')} pada komponen Sanksi.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════
// TALENT POINT SYSTEM — TAB UTAMA
// ════════════════════════════════════════
function TalentPointSystemTab() {
  const [state, setState] = useState({ loading: true, error: null, rows: [], formulaWeights: [] })
  const [slots, setSlots] = useState(['', '', null, null, null])
  const [analyzing, setAnalyzing] = useState(false)
  const [ranked, setRanked] = useState(null)
  const [analyzeError, setAnalyzeError] = useState(null)

  useEffect(() => {
    let alive = true
    Promise.all([getTalentSourceData(), getFormulaWeights()])
      .then(([data, formulaWeights]) => {
        if (alive) setState({ loading: false, error: null, rows: data.rows, formulaWeights })
      })
      .catch((error) => {
        if (alive) setState((s) => ({ ...s, loading: false, error }))
      })
    return () => { alive = false }
  }, [])

  const filledNiks = slots.filter((n) => n && n !== '')
  const filledCount = filledNiks.length
  const canAdd = slots.includes(null) && filledCount < 5

  function handlePick(index, nik) {
    setSlots((prev) => {
      if (prev.includes(nik)) return prev
      const next = [...prev]
      next[index] = nik
      return next
    })
    setRanked(null)
    setAnalyzeError(null)
  }
  function handleRemove(index) {
    setSlots((prev) => { const next = [...prev]; next[index] = null; return next })
    setRanked(null)
    setAnalyzeError(null)
  }
  function handleAddSlot() {
    setSlots((prev) => { const idx = prev.indexOf(null); if (idx < 0) return prev; const next = [...prev]; next[idx] = ''; return next })
  }
  function handleResetAll() {
    setSlots(['', '', null, null, null])
    setRanked(null)
    setAnalyzeError(null)
  }

  const profiles = useMemo(
    () => filledNiks.map((nik) => buildCandidateProfile(state.rows.find((r) => String(r.nik) === String(nik)) || { nik })),
    [filledNiks, state.rows]
  )

  function handleAnalyze() {
    if (profiles.length < 2) return
    setAnalyzing(true)
    setAnalyzeError(null)
    setTimeout(() => {
      // Dibungkus try/catch: sebelumnya kalau scoreCandidates melempar error
      // (mis. karena data karyawan tidak lengkap/format tak terduga), tombol
      // macet selamanya di "Menganalisis…" dan bagian "Analisis Talent Point
      // System" tidak pernah muncul, TANPA pesan apapun ke user. Sekarang
      // errornya ditangkap, ditampilkan jelas, dan di-log ke console untuk
      // ditelusuri lebih lanjut kalau masih terjadi.
      try {
        const scored = scoreCandidates(profiles, state.formulaWeights)
        setRanked([...scored].sort((a, b) => b.totalScore - a.totalScore))
      } catch (err) {
        console.error('[TalentPointSystem] Gagal menganalisis:', err)
        setAnalyzeError(err?.message || 'Terjadi kesalahan tak terduga saat menganalisis.')
        setRanked(null)
      } finally {
        setAnalyzing(false)
      }
    }, 10)
  }

  if (state.loading) {
    return <div style={{ color: 'var(--muted)', fontSize: 12, padding: '16px 0' }}>Memuat data…</div>
  }
  if (!state.rows.length) {
    return (
      <div className="empty-state">
        <div className="es-icon">⚡</div>
        <div className="es-title">Belum ada data</div>
        <div className="es-sub">Muat data dari Talent Source terlebih dahulu</div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>Talent Point System</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
            Pilih 2–5 karyawan → bandingkan semua data → klik <strong>Analyze</strong> untuk rekomendasi
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {filledCount >= 2 && (
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 24px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: analyzing ? 0.7 : 1 }}
            >
              <Icon name="search" size={15} />
              {analyzing ? 'Menganalisis…' : 'Analyze'}
            </button>
          )}
          {filledCount > 0 && (
            <button
              onClick={handleResetAll}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: 'transparent', border: '1.5px solid var(--danger)', color: 'var(--danger)', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              <Icon name="trash" size={13} />
              Reset Semua
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 12, marginBottom: 16 }}>
        {slots.map((nik, i) =>
          nik === null ? null : (
            <SlotCard key={i} index={i} nik={nik} rows={state.rows} takenNiks={filledNiks} onPick={handlePick} onRemove={handleRemove} />
          )
        )}
        {canAdd && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button
              onClick={handleAddSlot}
              style={{ padding: '10px 18px', border: '1.5px dashed var(--border2)', borderRadius: 9, background: 'transparent', color: 'var(--muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              + Tambah Karyawan
            </button>
          </div>
        )}
      </div>

      <div style={{ marginBottom: 20, fontSize: 11, color: 'var(--dim)' }}>
        {filledCount > 0 ? `${filledCount} karyawan dipilih (min 2, max 5)` : ''}
      </div>

      {filledCount >= 2 && <CompareTable profiles={profiles} />}

      {analyzeError && (
        <div
          style={{
            padding: '12px 16px', marginBottom: 16, background: 'rgba(192,57,43,.07)',
            border: '1px solid var(--danger)', borderRadius: 9, color: 'var(--danger)', fontSize: 12.5,
          }}
        >
          <strong>Gagal menganalisis:</strong> {analyzeError}
          <div style={{ marginTop: 4, color: 'var(--muted)', fontSize: 11 }}>
            Coba klik <strong>Analyze</strong> lagi. Kalau tetap gagal, cek console browser (F12) untuk detail errornya.
          </div>
        </div>
      )}

      {ranked && <AnalysisResult ranked={ranked} formulaWeights={state.formulaWeights} />}
    </div>
  )
}

// ════════════════════════════════════════
// ROOT
// ════════════════════════════════════════
export default function TalentPointSystem() {
  const [tab, setTab] = useState('tps')

  return (
    <div>
      <div className="topbar">
        <div className={`top-tab${tab === 'tps' ? ' active' : ''}`} onClick={() => setTab('tps')}>
          <Icon name="users" size={14} />
          Talent Point System
        </div>
        <div className={`top-tab${tab === 'formula' ? ' active' : ''}`} onClick={() => setTab('formula')}>
          <Icon name="fileText" size={14} />
          Formula
        </div>
      </div>
      <div className="content">
        {/* Kedua tab TETAP dimount (disembunyikan pakai display:none, bukan
            unmount/conditional render) — supaya slot karyawan yang sudah
            dipilih & hasil Analyze di tab "Talent Point System" TIDAK reset
            saat pindah ke tab "Formula" lalu balik lagi. */}
        <div className="page active" style={{ display: tab === 'tps' ? 'block' : 'none' }}>
          <TalentPointSystemTab />
        </div>
        <div style={{ display: tab === 'formula' ? 'block' : 'none' }}>
          <FormulaTab />
        </div>
      </div>
    </div>
  )
}
