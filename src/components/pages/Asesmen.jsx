import { useEffect, useState } from 'react'
import Topbar from '../Topbar.jsx'
import RadarChart from '../RadarChart.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { getTalentProfile, searchKaryawan } from '../../lib/talentProfileApi.js'
import { avatarColor, initials } from '../../lib/avatar.js'
import { isDataLockedToSelf } from '../../data/navItems.js'

const RCL = 3 // disalin dari index.html asli: RCL tetap = 3, khusus jenis asesmen "10 Kompetensi BUMN"

export default function Asesmen() {
  const { user } = useAuth()
  const lockedToSelf = isDataLockedToSelf(user?.role)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)

  // Untuk role 'user': panel pencarian disembunyikan, data langsung dikunci
  // & dimuat otomatis berdasarkan NIK akun yang sedang login.
  useEffect(() => {
    if (!lockedToSelf || !user?.nik) return
    setLoading(true)
    getTalentProfile(user.nik)
      .then(setSelected)
      .finally(() => setLoading(false))
  }, [lockedToSelf, user?.nik])

  async function handleInput(e) {
    const v = e.target.value
    setQuery(v)
    if (!v.trim()) {
      setResults([])
      return
    }
    try {
      const rows = await searchKaryawan({ query: v })
      setResults(rows)
    } catch {
      setResults([])
    }
  }

  async function handleSelect(row) {
    setResults([])
    setQuery('')
    setLoading(true)
    try {
      const data = await getTalentProfile(row.nik)
      setSelected(data)
    } finally {
      setLoading(false)
    }
  }

  const a = selected?.asesmenTerakhir
  const isBumn10 = /10\s*kompetensi\s*bumn/i.test(a?.tipe_asesmen || '')
  const showHasilBox = String(user?.role || '').toLowerCase() !== 'user'

  return (
    <div>
      <Topbar title="Asesmen" />
      <div className="content">
        {!lockedToSelf && (
          <div className="card" id="asesmen-search-card" style={{ marginBottom: 14 }}>
            <div className="card-title">Cari Karyawan</div>
            <input
              type="text"
              value={query}
              onChange={handleInput}
              placeholder="Ketik nama atau NIK..."
              style={{
                width: '100%', padding: '9px 12px', border: '1.5px solid var(--border2)', borderRadius: 8,
                boxSizing: 'border-box', fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--text)',
                outline: 'none', background: 'var(--bg2)',
              }}
            />
            {results.length > 0 && (
              <div style={{ marginTop: 10, maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {results.map((r) => (
                  <div key={r.nik} className="tp-result-item" onClick={() => handleSelect(r)}>
                    <span>{r.nama} <span style={{ color: 'var(--dim)' }}>· {r.nik}</span></span>
                    <span style={{ color: 'var(--dim)', fontSize: 11 }}>{r.posisi}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {loading && <div style={{ fontSize: 13, color: 'var(--dim)' }}>Memuat…</div>}

        {!loading && !selected && (
          <div id="asesmen-empty-state" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--dim)' }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {lockedToSelf
                ? 'Belum ada data hasil asesmen kompetensi untuk Anda.'
                : 'Cari dan pilih karyawan untuk melihat hasil asesmen kompetensinya'}
            </div>
          </div>
        )}

        {!loading && selected && (
          <div id="asesmen-result-wrap">
            <div id="asesmen-viewing-banner" className="viewing-banner">
              <div
                style={{
                  width: 30, height: 30, borderRadius: '50%', background: avatarColor(selected.karyawan.nama),
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800, flexShrink: 0,
                }}
              >
                {initials(selected.karyawan.nama)}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text)' }}>
                Menampilkan data: <strong>{selected.karyawan.nama}</strong>{' '}
                <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-m)' }}>({selected.karyawan.nik})</span>
              </div>
            </div>

            <div className="card">
              <div className="card-title">Hasil Asesmen Kompetensi</div>

              {!a || !a.kompetensi?.length ? (
                <div style={{ padding: '30px 10px', textAlign: 'center', color: '#dc2626', fontSize: 12.5 }}>
                  Belum ada data hasil asesmen kompetensi untuk karyawan ini.
                </div>
              ) : (
                <div id="asesmen-detail-content">
                  <div
                    style={{
                      display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))',
                      gap: 8, marginBottom: 14,
                    }}
                  >
                    <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '9px 12px' }}>
                      <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--dim)', marginBottom: 3 }}>
                        Jenis Asesmen
                      </div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{a.tipe_asesmen || '—'}</div>
                    </div>
                    <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '9px 12px' }}>
                      <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--dim)', marginBottom: 3 }}>
                        Lembaga
                      </div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{a.lembaga || '—'}</div>
                    </div>
                    {showHasilBox && (
                      <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '9px 12px' }}>
                        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--dim)', marginBottom: 3 }}>
                          Hasil
                        </div>
                        <div>
                          {a.rekomendasi ? (
                            <span className="type-pill type-ds">{a.rekomendasi}</span>
                          ) : (
                            <span className="type-pill type-na">—</span>
                          )}
                        </div>
                      </div>
                    )}
                    <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '9px 12px' }}>
                      <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--dim)', marginBottom: 3 }}>
                        Tanggal Asesmen
                      </div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{a.tanggal || '—'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 16, alignItems: 'start' }}>
                    <div className="tbl-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th style={{ width: 36 }}>No</th>
                            <th>Nama Kompetensi</th>
                            <th style={{ textAlign: 'center' }}>Kode Kompetensi</th>
                            <th style={{ textAlign: 'center' }}>Skor</th>
                            {isBumn10 && <th style={{ textAlign: 'center' }}>RCL</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {a.kompetensi.map((k, i) => (
                            <tr key={k.kode || i}>
                              <td style={{ color: 'var(--dim)' }}>{i + 1}</td>
                              <td>{k.nama}</td>
                              <td style={{ textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--font-m)' }}>{k.kode || '—'}</td>
                              <td style={{ textAlign: 'center', fontWeight: 700 }}>{k.skor != null ? k.skor : '—'}</td>
                              {isBumn10 && <td style={{ textAlign: 'center', color: 'var(--dim)' }}>{RCL}</td>}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ minHeight: Math.max(260, a.kompetensi.length * 26) }}>
                      <RadarChart
                        labels={a.kompetensi.map((k) => k.nama)}
                        datasets={[
                          {
                            label: 'Skor',
                            data: a.kompetensi.map((k) => (k.skor != null ? k.skor : 0)),
                            backgroundColor: 'rgba(26,110,60,.18)',
                            borderColor: '#1a6e3c',
                            borderWidth: 2.5,
                            pointBackgroundColor: '#1a6e3c',
                            pointRadius: 4,
                          },
                          ...(isBumn10
                            ? [
                                {
                                  label: 'RCL (Requirement Competency Level)',
                                  data: a.kompetensi.map(() => RCL),
                                  backgroundColor: 'rgba(217,119,6,.08)',
                                  borderColor: '#d97706',
                                  borderWidth: 1.5,
                                  borderDash: [5, 4],
                                  pointRadius: 0,
                                },
                              ]
                            : []),
                        ]}
                      />
                    </div>
                  </div>

                  {isBumn10 && (
                    <div style={{ marginTop: 10, fontSize: 10, color: 'var(--dim)', lineHeight: 1.5 }}>
                      RCL (Requirement Competency Level) = {RCL} untuk seluruh kompetensi pada jenis asesmen "10
                      Kompetensi BUMN". Jenis asesmen lain belum memiliki acuan RCL.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
