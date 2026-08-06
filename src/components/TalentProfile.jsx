import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { isDataLockedToSelf } from '../data/navItems.js'
import {
  getKaryawanFilterOptions,
  getTalentProfile,
  searchKaryawan,
} from '../lib/talentProfileApi.js'
import Topbar from './Topbar.jsx'
import Icon from './Icon.jsx'

// Grid referensi 9-Box (9 sel tetap + legenda), disalin persis dari NINEBOX_GRID /
// NINEBOX_LEGEND di index.html asli (tpRenderNineboxGrid()).
const NINEBOX_GRID = [
  { roman: 'V', bg: '#fde3c8', border: '#d9822b' },
  { roman: 'II', bg: '#cfe2fb', border: '#3b5bdb' },
  { roman: 'I', bg: '#c8f5d0', border: '#2f9e44' },
  { roman: 'VI', bg: '#fde3c8', border: '#d9822b' },
  { roman: 'IV', bg: '#cfe2fb', border: '#3b5bdb' },
  { roman: 'III', bg: '#cfe2fb', border: '#3b5bdb' },
  { roman: 'IX', bg: '#e3e3e3', border: '#6b7280' },
  { roman: 'VIII', bg: '#fbf6c4', border: '#c9a227' },
  { roman: 'VII', bg: '#fbf6c4', border: '#c9a227' },
]
const NINEBOX_LEGEND = [
  { label: 'High Potential', bg: '#c8f5d0', border: '#2f9e44' },
  { label: 'Promotable', bg: '#cfe2fb', border: '#3b5bdb' },
  { label: 'Solid Contributor', bg: '#fbf6c4', border: '#c9a227' },
  { label: 'Sleeping Tiger', bg: '#fde3c8', border: '#d9822b' },
  { label: 'Unfit', bg: '#e3e3e3', border: '#6b7280' },
]

const TIPE_COLOR = { Q: '#15803d', DS: '#1d4ed8', DSP: '#b45309', NQ: '#b91c1c', TD: '#7c3aed' }
const TIPE_BG = { Q: '#dcfce7', DS: '#dbeafe', DSP: '#fef3c7', NQ: '#fee2e2', TD: '#ede9fe' }

function TipePill({ v }) {
  if (!v || v === '—') return <span className="type-pill type-na">—</span>
  const k = String(v).toUpperCase()
  return (
    <span
      style={{
        background: TIPE_BG[k] || '#f3f4f6', color: TIPE_COLOR[k] || '#9ca3af', padding: '2px 8px',
        borderRadius: 4, fontFamily: 'var(--font-m)', fontSize: 10.5, fontWeight: 600,
      }}
    >
      {v}
    </span>
  )
}

function IdentityItem({ label, value }) {
  return (
    <div className="tp-identity-box">
      <div className="tp-identity-label">{label}</div>
      <div className="tp-identity-value">{value || '—'}</div>
    </div>
  )
}

// Baris label/value dalam kotak abu-abu — disalin persis dari tpInfoRow() di
// index.html asli (dipakai untuk Hasil/Tanggal/Lembaga pada kartu Hasil Asesmen Terakhir).
function InfoRow({ label, value }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8,
        background: 'var(--bg3)', borderRadius: 7, padding: 9,
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--muted)', flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ fontSize: 12.5, fontWeight: 400, color: 'var(--text)', textAlign: 'right' }}>{value}</span>
    </div>
  )
}

function HistoryList({ items }) {
  if (!items || items.length === 0) {
    return <div style={{ color: '#dc2626', fontSize: 12 }}>Belum ada data</div>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.slice(0, 20).map((it) => (
        <div key={it.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 12, borderBottom: '1px solid var(--border2)', paddingBottom: 6 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600 }}>{it.achievement || '—'}</div>
            {it.tingkatan && <div style={{ color: 'var(--muted)', fontSize: 10.5, marginTop: 1 }}>{it.tingkatan}</div>}
          </div>
          {it.tahun && (
            <div style={{ flexShrink: 0, paddingLeft: 10, borderLeft: '1px solid var(--border2)', fontSize: 10.5, fontWeight: 700, color: 'var(--dim)', fontFamily: 'var(--font-m)' }}>
              {it.tahun}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// "Top X" — item yang ditandai khusus (bukan sekadar tahun terbaru); disalin
// dari perilaku tpTopHistoryHtml() di index.html asli. Sumbernya adalah
// profile.developmentTop/projectTop/awardingTop dari talentProfileApi.js.
function TopHistoryList({ items }) {
  if (!items || items.length === 0) {
    return <div style={{ color: '#dc2626', fontSize: 12, fontStyle: 'italic' }}>Belum ada Top data</div>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((it) => (
        <div key={it.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 12, borderBottom: '1px solid var(--border2)', paddingBottom: 6 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700 }}>{it.achievement || '—'}</div>
            {it.tingkatan && <div style={{ color: 'var(--muted)', fontSize: 10.5, marginTop: 1 }}>{it.tingkatan}</div>}
          </div>
          {it.tahun && (
            <div style={{ flexShrink: 0, paddingLeft: 10, borderLeft: '1px solid var(--border2)', fontSize: 10.5, fontWeight: 700, color: 'var(--dim)', fontFamily: 'var(--font-m)' }}>
              {it.tahun}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// Sparkline SVG ringan untuk tren KPI, tanpa dependensi chart library.
// Career Journey — timeline horizontal (scroll), jabatan terkini di kiri.
// Sumber data: employee_history kategori "job_rotation" (achievement = posisi/
// level saat itu, tahun = tahun jabatan), diurutkan tahun terbaru dulu.
function CareerJourneyTimeline({ items }) {
  if (!items || items.length === 0) {
    return <div style={{ color: '#dc2626', fontSize: 12 }}>Belum ada data career journey</div>
  }
  return (
    <div style={{ overflowX: 'auto', paddingBottom: 6 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: 'max-content', padding: '4px 4px 4px' }}>
        {items.map((h, i) => {
          const isCurrent = i === 0
          const nodeColor = isCurrent ? 'var(--accent)' : 'var(--accent2)'
          return (
            <div key={h.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, width: 148, flexShrink: 0, minHeight: 90 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 0.4, paddingLeft: 46 }}>
                {h.tahun || '—'}
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div
                  style={{
                    width: 38, height: 38, borderRadius: '50%', background: isCurrent ? nodeColor : 'var(--bg3)',
                    border: `2px solid ${nodeColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon name="user" size={16} strokeWidth={2} style={{ color: isCurrent ? '#fff' : nodeColor }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 400, color: isCurrent ? 'var(--accent)' : 'var(--text)', lineHeight: 1.3 }}>
                    {h.achievement || '—'}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--dim)', lineHeight: 1.3 }}>{h.tingkatan || ''}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function KpiSparkline({ data }) {
  if (!data || data.length < 2) return null
  const w = 220
  const h = 90
  const pad = 8
  const vals = data.map((d) => Number(d.skor) || 0)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const range = max - min || 1
  const points = vals
    .map((v, i) => {
      const x = pad + (i / (vals.length - 1)) * (w - pad * 2)
      const y = h - pad - ((v - min) / range) * (h - pad * 2)
      return `${x},${y}`
    })
    .join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h}>
      <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {vals.map((v, i) => {
        const x = pad + (i / (vals.length - 1)) * (w - pad * 2)
        const y = h - pad - ((v - min) / range) * (h - pad * 2)
        return <circle key={i} cx={x} cy={y} r="3" fill="var(--accent)" />
      })}
    </svg>
  )
}

export default function TalentProfile() {
  const { user } = useAuth()
  const lockedToSelf = isDataLockedToSelf(user?.role)

  const [filterOptions, setFilterOptions] = useState({ grup: [], unitKerja: [], level: [] })
  const [query, setQuery] = useState('')
  const [grup, setGrup] = useState('')
  const [unitKerja, setUnitKerja] = useState('')
  const [level, setLevel] = useState('')

  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selectedNik, setSelectedNik] = useState(lockedToSelf ? user?.nik || null : null)

  const [profile, setProfile] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!lockedToSelf) {
      getKaryawanFilterOptions().then(setFilterOptions).catch(() => {})
    }
  }, [lockedToSelf])

  // Kalau role dikunci ke NIK sendiri, selalu ikuti NIK dari akun yang sedang
  // login (bukan cuma sekali saat mount) — supaya tetap benar walau data user
  // baru selesai dimuat setelah komponen ini sempat render lebih dulu.
  useEffect(() => {
    if (lockedToSelf) setSelectedNik(user?.nik || null)
  }, [lockedToSelf, user?.nik])

  useEffect(() => {
    if (!selectedNik) return
    setLoadingProfile(true)
    setError('')
    getTalentProfile(selectedNik)
      .then((data) => {
        if (!data) setError('Data karyawan dengan NIK ini tidak ditemukan.')
        setProfile(data)
      })
      .catch((e) => setError(e.message || 'Gagal memuat data'))
      .finally(() => setLoadingProfile(false))
  }, [selectedNik])

  async function handleSearch(e) {
    e.preventDefault()
    setSearching(true)
    setError('')
    try {
      const rows = await searchKaryawan({ query, grup, unitKerja, level })
      setResults(rows)
    } catch (e) {
      setError(e.message || 'Gagal mencari data')
    } finally {
      setSearching(false)
    }
  }

  const k = profile?.karyawan
  const a = profile?.asesmenTerakhir

  return (
    <div>
      <Topbar icon="user" title="Talent Profile" />
      <div className="content">
        <div id="tp-page">
          {/* -- Search panel -- */}
          {!lockedToSelf && (
            <div className="card" style={{ marginBottom: 18, overflow: 'visible' }} id="tp-search-card">
              <div className="card-title">Cari Karyawan</div>
              <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>
                    Nama / NIK
                  </div>
                  <input
                    type="text"
                    className="search-input"
                    style={{ maxWidth: '100%', width: '100%' }}
                    placeholder="Ketik nama atau NIK karyawan…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <div style={{ minWidth: 180 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>
                    Grup Job Function
                  </div>
                  <select className="fselect" style={{ width: '100%', minWidth: 180 }} value={grup} onChange={(e) => setGrup(e.target.value)}>
                    <option value="">Semua Grup</option>
                    {filterOptions.grup.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div style={{ minWidth: 160 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>
                    Unit Kerja
                  </div>
                  <select className="fselect" style={{ width: '100%', minWidth: 160 }} value={unitKerja} onChange={(e) => setUnitKerja(e.target.value)}>
                    <option value="">Semua Unit</option>
                    {filterOptions.unitKerja.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div style={{ minWidth: 160 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>
                    Level Jabatan
                  </div>
                  <select className="fselect" style={{ width: '100%', minWidth: 160 }} value={level} onChange={(e) => setLevel(e.target.value)}>
                    <option value="">Semua Level</option>
                    {filterOptions.level.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={searching}
                  style={{
                    padding: '9px 22px', borderRadius: 8, border: 'none', background: 'var(--accent)',
                    color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', height: 38, whiteSpace: 'nowrap',
                  }}
                >
                  {searching ? 'Mencari...' : 'Cari'}
                </button>
              </form>

              {results.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--muted)', marginBottom: 8 }}>
                    Hasil Pencarian <span style={{ color: 'var(--accent)' }}>({results.length})</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
                    {results.map((r) => (
                      <div
                        key={r.nik}
                        className={`tp-result-item${selectedNik === r.nik ? ' selected' : ''}`}
                        onClick={() => setSelectedNik(r.nik)}
                      >
                        <span>{r.nama} <span style={{ color: 'var(--dim)' }}>· {r.nik}</span></span>
                        <span style={{ color: 'var(--dim)', fontSize: 11 }}>{r.posisi}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {error && <div className="login-error" style={{ marginBottom: 14 }}>{error}</div>}
          {loadingProfile && <div style={{ fontSize: 13, color: 'var(--dim)' }}>Memuat profil…</div>}

          {/* -- Profile wrap -- */}
          {!loadingProfile && profile && (
            <div id="tp-profile-wrap">
              <div className="tp-outer-title">Profile</div>
              <div className="card" style={{ marginBottom: 14, padding: 0, overflow: 'hidden' }}>
                <div className="tp-profile-header" style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>
                  <div className="tp-profile-avatar" style={{ background: 'linear-gradient(135deg,var(--accent) 0%,#1d7a4e 100%)', minWidth: 140, overflow: 'hidden', display: 'flex' }}>
                    {k.foto_url ? (
                      <img
                        src={k.foto_url}
                        alt={k.nama || 'Foto profil'}
                        style={{ width: 140, height: '100%', minHeight: 140, objectFit: 'cover', display: 'block' }}
                      />
                    ) : (
                      <div style={{ width: 140, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38, fontWeight: 800, color: '#fff', letterSpacing: -1 }}>
                        {(k.nama || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="tp-profile-info" style={{ flex: 1, padding: '20px 22px' }}>
                    <div style={{ fontFamily: 'var(--font-d)', fontSize: 26, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{k.nama}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 12 }}>{k.posisi}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 8 }}>
                      <IdentityItem label="NIK" value={k.nik} />
                      <IdentityItem label="Grup Job Function" value={k.grup} />
                      <IdentityItem label="Unit Kerja" value={k.unit_kerja} />
                      <IdentityItem label="Level Jabatan" value={k.level_jabatan} />
                      <IdentityItem label="Golongan" value={k.golongan} />
                      <IdentityItem label="Pendidikan" value={k.pendidikan} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--dim)', lineHeight: 1.5, marginTop: 10 }}>
                      *) Data di atas bisa Anda perbarui sendiri lewat menu <strong>Edit Profile</strong>. Untuk data resmi
                      dari SAP (di luar field yang bisa diedit sendiri), hubungi SDM Unit Kerja masing-masing.
                    </div>
                  </div>
                </div>
              </div>

              {/* -- Hasil Pengukuran -- */}
              <div className="tp-outer-title">Hasil Pengukuran</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 1fr', gap: 14, marginBottom: 14 }} id="tp-pengukuran-grid">
                <div className="card">
                  <div className="card-title">Hasil Asesmen Terakhir</div>
                  {a ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {String(user?.role || '').toLowerCase() !== 'user' && (
                        <InfoRow label="Hasil" value={<TipePill v={a.rekomendasi} />} />
                      )}
                      <InfoRow label="Tanggal" value={a.tanggal || '—'} />
                      <InfoRow label="Lembaga" value={a.lembaga || '—'} />
                    </div>
                  ) : (
                    <div style={{ color: '#dc2626', fontSize: 12 }}>Belum ada data asesmen</div>
                  )}

                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border2)' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--muted)', marginBottom: 8 }}>
                      9-Box Talent Grid
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: 9, fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        Capacity
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="tp-nb-grid">
                          {NINEBOX_GRID.map((cell, i) => (
                            <div key={i} style={{ background: cell.bg, border: `1.5px solid ${cell.border}`, borderRadius: 7, minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <div style={{ fontSize: 10, fontWeight: 800, color: cell.border }}>{cell.roman}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                          Performance
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '5px 12px', fontSize: 10 }}>
                      {NINEBOX_LEGEND.map((l) => (
                        <div key={l.label} className="tp-nb-legend-item">
                          <span className="tp-nb-legend-dot" style={{ background: l.bg, border: `1.3px solid ${l.border}` }} />
                          <span>{l.label}</span>
                        </div>
                      ))}
                    </div>
                    {k.ninebox && (
                      <div style={{ marginTop: 10 }}>
                        <span className={`badge ${
                          { 'HIGH POTENTIAL': 'badge-hp', PROMOTABLE: 'badge-pr', 'SOLID CONTRIBUTOR': 'badge-sc', 'SLEEPING TIGER': 'badge-st', UNFIT: 'badge-un' }[k.ninebox] || 'badge-null'
                        }`}>
                          {k.ninebox}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="card">
                    <div className="card-title">Hasil CLI Terakhir</div>
                    <div style={{ fontSize: 10.5, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 10, textAlign: 'justify' }}>
                      Hasil CLI menampilkan pengukuran Competency Level Index berupa jumlah kompetensi yang diukur
                      dibanding dengan jumlah yang tercapai, dinyatakan sebagai <strong>%Ketercapaian</strong> (jumlah
                      tercapai / jumlah diukur).
                    </div>
                    <div className="tp-cli-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                      <div style={{ paddingRight: 14, borderRight: '2px solid var(--border2)' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--muted)', marginBottom: 8 }}>Soft CLI</div>
                        <CliMini cli={profile.cliSoft} label="Soft CLI" />
                      </div>
                      <div style={{ paddingLeft: 14 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--muted)', marginBottom: 8 }}>Hard CLI</div>
                        <CliMini cli={profile.cliHard} label="Hard CLI" />
                      </div>
                    </div>
                    <div style={{ marginTop: 10, fontSize: 10, color: 'var(--dim)', lineHeight: 1.5 }}>
                      Detail per kompetensi akan tersedia di menu Kamus Kompetensi.
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-title">Hasil KPI</div>
                    <div style={{ fontSize: 11, color: 'var(--dim)', lineHeight: 1.5, marginBottom: profile.kpiRiwayat.length ? 12 : 0 }}>
                      Skor performa kerja yang diukur setiap tahun.
                    </div>
                    {profile.kpiRiwayat.length > 0 && (
                      <div className="tp-kpi-grid" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20, alignItems: 'start' }}>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--dim)', marginBottom: 8 }}>
                            Tren Skor KPI
                          </div>
                          <KpiSparkline data={profile.kpiRiwayat} />
                        </div>
                        <div className="tp-kpi-list" style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 20, borderLeft: '1.5px solid var(--border2)' }}>
                          {profile.kpiRiwayat.slice().reverse().map((kp) => (
                            <div key={kp.tahun} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, gap: 8 }}>
                              <span>KPI {kp.tahun}</span>
                              <span style={{ fontWeight: 700 }}>
                                {kp.skor ?? '—'} <span style={{ color: 'var(--dim)', fontWeight: 400 }}>({kp.perf_rating || '—'})</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="card-title">Aspirasi Diri</div>
                  <div style={{ flex: 1, overflowY: 'auto', fontSize: 12 }}>
                    {k.aspirasi ? (
                      <>
                        <div>{k.aspirasi}</div>
                        {k.alasan && <div style={{ marginTop: 8, color: 'var(--dim)' }}>Alasan: {k.alasan}</div>}
                      </>
                    ) : (
                      <div style={{ color: '#dc2626' }}>Data tidak ditemukan, silahkan Anda mengisi di SGN Conext</div>
                    )}
                  </div>
                </div>
              </div>

              {/* -- Career Journey -- */}
              <div className="card" style={{ marginBottom: 14 }}>
                <div className="card-title" style={{ justifyContent: 'space-between' }}>
                  <span>Career Journey</span>
                  {profile.careerJourney?.length > 0 && (
                    <span style={{ fontSize: 10.5, color: 'var(--title-text)', opacity: 0.85 }}>
                      {profile.careerJourney.length} riwayat
                    </span>
                  )}
                </div>
                <CareerJourneyTimeline items={profile.careerJourney} />
              </div>

              {/* -- Employee History -- */}
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.7, color: 'var(--muted)', marginBottom: 10 }}>
                Employee History
              </div>
              <div className="three-col">
                <div className="card">
                  <div className="card-title">Development</div>
                  <HistoryList items={profile.development} />
                </div>
                <div className="card">
                  <div className="card-title">Project Involvement</div>
                  <HistoryList items={profile.project} />
                </div>
                <div className="card">
                  <div className="card-title">Awarding</div>
                  <HistoryList items={profile.awarding} />
                </div>
              </div>
              <div className="three-col">
                <div className="card">
                  <div className="card-title card-title-gold">Top Development</div>
                  <TopHistoryList items={profile.developmentTop} />
                </div>
                <div className="card">
                  <div className="card-title card-title-gold">Top Project Involvement</div>
                  <TopHistoryList items={profile.projectTop} />
                </div>
                <div className="card">
                  <div className="card-title card-title-gold">Top Awarding</div>
                  <TopHistoryList items={profile.awardingTop} />
                </div>
              </div>
            </div>
          )}

          {/* -- Empty state -- */}
          {!loadingProfile && !profile && !error && (
            <div className="empty-state" style={{ padding: '60px 24px' }}>
              {lockedToSelf ? (
                <>
                  <div className="es-title">NIK Anda belum terhubung ke akun ini</div>
                  <div className="es-sub">Hubungi admin untuk mengaitkan NIK karyawan ke akun Anda.</div>
                </>
              ) : (
                <>
                  <div className="es-title">Pilih karyawan untuk melihat profil</div>
                  <div className="es-sub">Gunakan pencarian di atas, lalu klik <strong>Cari</strong></div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CliMini({ cli, label }) {
  if (!cli || cli.diukur === 0) {
    return <div style={{ color: '#dc2626', fontSize: 12 }}>Belum ada data {label}</div>
  }
  const pct = cli.rerata
  const color = pct > 85 ? 'var(--accent)' : pct >= 70 ? 'var(--accent3)' : 'var(--danger)'
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <div style={{ background: 'var(--bg3)', borderRadius: 7, padding: 9, textAlign: 'center' }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>Diukur</div>
          <div style={{ fontSize: 12.5, color: 'var(--text)' }}>{cli.diukur}</div>
        </div>
        <div style={{ background: 'var(--bg3)', borderRadius: 7, padding: 9, textAlign: 'center' }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>Tercapai</div>
          <div style={{ fontSize: 12.5, color: 'var(--text)' }}>{cli.benar}</div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 9, background: 'var(--bg3)', borderRadius: 7 }}>
        <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--muted)' }}>%Ketercapaian</span>
        <span style={{ fontSize: 15, fontWeight: 800, color }}>{pct}%</span>
      </div>
    </div>
  )
}
