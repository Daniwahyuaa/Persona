import { useEffect, useMemo, useState } from 'react'
import Icon from '../Icon.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import KAMUS_SOFT_DATA from '../../data/kamusSoft.json'
import KAMUS_HARD_DATA from '../../data/kamusHard.json'
import KAMUS_BUMN_KOMPETENSI from '../../data/kamusBumnKompetensi.json'
import KAMUS_BUMN_KUALIFIKASI from '../../data/kamusBumnKualifikasi.json'
import KAMUS_BUMN_TRAITS from '../../data/kamusBumnTraits.json'

// Menghilangkan karakter non-alfanumerik supaya aman dipakai sebagai id/key DOM
// (disalin dari pola gid di index.html asli: kelompok.replace(/\W/g,'')).
function slug(s) {
  return String(s || '').replace(/\W/g, '')
}

function groupBy(items, key) {
  const groups = {}
  items.forEach((item) => {
    const k = item[key]
    if (!groups[k]) groups[k] = []
    groups[k].push(item)
  })
  return groups
}

export default function Kamus() {
  const { user } = useAuth()
  const roleLower = String(user?.role || '').toLowerCase()
  const restricted = roleLower === 'user'
  // "Indikator Perilaku per Level" hanya untuk admin & superadmin (user & executive tidak melihatnya).
  const canSeeIndikator = roleLower === 'admin' || roleLower === 'superadmin'
  // "Skala Penilaian" (di tab 10 Kompetensi BUMN > Kualifikasi Profesional) disembunyikan
  // untuk role 'user'; tetap tampil untuk superadmin & admin.
  const canSeeSkalaPenilaian = roleLower === 'admin' || roleLower === 'superadmin'

  const [topTab, setTopTab] = useState('bumn') // 'ptpn' | 'bumn'
  const [innerTab, setInnerTab] = useState('soft') // 'soft' | 'hard'
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')

  const [openGroups, setOpenGroups] = useState(() => new Set())
  const [openItems, setOpenItems] = useState(() => new Set())
  const [openKual, setOpenKual] = useState(() => new Set())
  const [openTrait, setOpenTrait] = useState(() => new Set())

  const [hardGroupFilter, setHardGroupFilter] = useState('')
  const [hardPageSize, setHardPageSize] = useState(10)
  const [hardPage, setHardPage] = useState(1)

  const [scrollToId, setScrollToId] = useState(null)

  // Untuk role 'user': hanya Soft Competency yang tampil, baris toggle tab disembunyikan.
  useEffect(() => {
    if (restricted) setInnerTab('soft')
  }, [restricted])

  useEffect(() => {
    if (!scrollToId) return
    const t = setTimeout(() => {
      const el = document.getElementById(scrollToId)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        const card = el.closest('.card') || el
        const prevShadow = card.style.boxShadow
        const prevTransition = card.style.transition
        card.style.transition = 'box-shadow .3s'
        card.style.boxShadow = '0 0 0 3px var(--accent)'
        setTimeout(() => {
          card.style.boxShadow = prevShadow
          card.style.transition = prevTransition
        }, 1400)
      }
      setScrollToId(null)
    }, 60)
    return () => clearTimeout(t)
  }, [scrollToId])

  function toggleGroup(key) {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }
  function toggleItem(key) {
    setOpenItems((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }
  function toggleKual(idx) {
    setOpenKual((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }
  function toggleTrait(idx) {
    setOpenTrait((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const softGroups = useMemo(() => groupBy(KAMUS_SOFT_DATA, 'kelompok'), [])
  const hardGroupNames = useMemo(() => [...new Set(KAMUS_HARD_DATA.map((x) => x.kelompok))], [])
  const bumnClusters = useMemo(() => groupBy(KAMUS_BUMN_KOMPETENSI, 'cluster'), [])

  const hardFiltered = useMemo(() => {
    if (!hardGroupFilter) return KAMUS_HARD_DATA
    return KAMUS_HARD_DATA.filter((x) => x.kelompok === hardGroupFilter)
  }, [hardGroupFilter])

  const hardTotalPages = Math.max(1, Math.ceil(hardFiltered.length / hardPageSize))
  const hardCurrentPage = Math.min(hardPage, hardTotalPages)
  const hardStart = (hardCurrentPage - 1) * hardPageSize
  const hardPageItems = hardFiltered.slice(hardStart, hardStart + hardPageSize)

  const query = search.toLowerCase().trim()

  const searchResults = useMemo(() => {
    if (!query) return []
    const matchSoft = []
    Object.keys(softGroups).forEach((kelompok) => {
      softGroups[kelompok].forEach((x, idx) => {
        if (x.nama.toLowerCase().includes(query) || x.definisi.toLowerCase().includes(query)) {
          matchSoft.push({
            nama: x.nama, definisi: x.definisi,
            sumber: `PTPN Group — Soft Competency (${kelompok})`,
            nav: { type: 'soft', gid: slug(kelompok), idx },
          })
        }
      })
    })

    const matchHard = KAMUS_HARD_DATA
      .filter((x) => x.nama.toLowerCase().includes(query) || x.definisi.toLowerCase().includes(query))
      .map((x) => ({
        nama: x.nama, definisi: x.definisi,
        sumber: `PTPN Group — Hard Competency (${x.kelompok})`,
        nav: { type: 'hard', kelompok: x.kelompok },
      }))

    const matchBumn = []
    Object.keys(bumnClusters).forEach((cluster) => {
      bumnClusters[cluster].forEach((x, idx) => {
        if (x.nama.toLowerCase().includes(query) || x.definisi.toLowerCase().includes(query)) {
          matchBumn.push({
            nama: x.nama, definisi: x.definisi,
            sumber: `Direksi BUMN (${cluster})`,
            nav: { type: 'bumn', gid: slug(cluster), idx },
          })
        }
      })
    })

    return [...matchSoft, ...matchHard, ...matchBumn]
  }, [query, softGroups, bumnClusters])

  function goToSearchResult(nav) {
    setSearch('')
    if (nav.type === 'soft') {
      setTopTab('ptpn')
      setInnerTab('soft')
      setOpenGroups((prev) => new Set(prev).add(nav.gid))
      const uid = `${nav.gid}-${nav.idx}`
      setOpenItems((prev) => new Set(prev).add(uid))
      setScrollToId(`kamus-soft-body-${uid}`)
    } else if (nav.type === 'bumn') {
      setTopTab('bumn')
      setOpenGroups((prev) => new Set(prev).add(nav.gid))
      const uid = `${nav.gid}-${nav.idx}`
      setOpenItems((prev) => new Set(prev).add(uid))
      setScrollToId(`kamus-bumn-body-${uid}`)
    } else if (nav.type === 'hard') {
      setTopTab('ptpn')
      setInnerTab('hard')
      setHardGroupFilter(nav.kelompok)
      setHardPage(1)
      setScrollToId('kamus-hard-table-container')
    }
  }

  return (
    <div>
      <div className="topbar" style={{ padding: '0 28px', gap: 4 }}>
        
       
        <div className={`top-tab${topTab === 'bumn' ? ' active' : ''}`} onClick={() => setTopTab('bumn')}>
          <Icon name="book" size={14} strokeWidth={2.2} />
          10 Kompetensi BUMN
        </div>
         <div className={`top-tab${topTab === 'ptpn' ? ' active' : ''}`} onClick={() => setTopTab('ptpn')}>
          <Icon name="target" size={14} strokeWidth={2.2} />
          Kompetensi PTPN Group
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginRight: 6 }}>
          <button
            onClick={() => {
              if (searchOpen && !search.trim()) setSearchOpen(false)
              else setSearchOpen(true)
            }}
            title="Cari kompetensi"
            style={{
              width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'transparent',
              color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0,
            }}
          >
            <Icon name="search" size={17} />
          </button>
          <input
            type="text"
            autoFocus={searchOpen}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kompetensi (nama atau deskripsi)..."
            style={{
              width: searchOpen ? 220 : 0,
              opacity: searchOpen ? 1 : 0,
              padding: searchOpen ? '6px 8px' : '6px 0',
              border: 'none',
              borderBottom: '1.5px solid var(--border2)',
              background: 'transparent',
              fontFamily: 'var(--font-b)',
              fontSize: 12.5,
              color: 'var(--text)',
              outline: 'none',
              transition: 'width .2s, opacity .2s, padding .2s',
            }}
          />
        </div>
      </div>

      <div className="content">
        {query ? (
          <div>
            {searchResults.length === 0 ? (
              <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--muted)', fontSize: 12.5 }}>
                Tidak ada kompetensi yang cocok dengan "{query}".
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 12 }}>
                  {searchResults.length} hasil ditemukan untuk "{query}" — klik untuk lihat detail lengkap
                </div>
                {searchResults.map((item, i) => (
                  <div key={i} className="card" style={{ marginBottom: 8, cursor: 'pointer' }} onClick={() => goToSearchResult(item.nav)}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>{item.nama}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3, color: 'var(--accent)', marginBottom: 6 }}>
                      {item.sumber} →
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>{item.definisi}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : topTab === 'ptpn' ? (
          <div>
            <div className="card" style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6 }}>
               Kamus Kompetensi PTPN Group digunakan sebagai acuan dalam pelaksanaan asesmen kompetensi bagi pemangku jabatan BOD-2 
               atau BOD-3 di lingkungan PTPN Group. 
               Kamus ini disusun untuk memastikan pengukuran kompetensi dilakukan secara relevan dengan karakteristik bisnis, 
               kebutuhan organisasi, serta tuntutan pekerjaan pada level jabatan BOD-3.
              </p>
            </div>
            {!restricted && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                <button
                  className={`inner-tab-btn${innerTab === 'soft' ? ' active' : ''}`}
                  onClick={() => setInnerTab('soft')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Icon name="checkCircle" size={13} strokeWidth={2.2} />
                  Soft Competency
                </button>
                <button
                  className={`inner-tab-btn${innerTab === 'hard' ? ' active' : ''}`}
                  onClick={() => setInnerTab('hard')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Icon name="database" size={13} strokeWidth={2.2} />
                  Hard Competency
                </button>
              </div>
            )}

            {innerTab === 'soft' ? (
              <div>
                {Object.keys(softGroups).map((kelompok) => {
                  const gid = slug(kelompok)
                  const items = softGroups[kelompok]
                  const groupOpen = openGroups.has(gid)
                  return (
                    <div key={kelompok} style={{ marginBottom: 10 }}>
                      <div
                        className="card-title"
                        onClick={() => toggleGroup(gid)}
                        style={{ cursor: 'pointer', justifyContent: 'space-between', margin: 0, borderRadius: 'var(--radius)' }}
                      >
                        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.7 }}>
                          {kelompok} ({items.length})
                        </span>
                        <span style={{ fontSize: 12, transition: 'transform .15s', transform: groupOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                      </div>
                      {groupOpen && (
                        <div style={{ marginTop: 8 }}>
                          {items.map((item, idx) => {
                            const uid = `${gid}-${idx}`
                            const itemOpen = openItems.has(uid)
                            return (
                              <div key={uid} className="card" style={{ marginBottom: 8, cursor: 'pointer' }} onClick={() => toggleItem(uid)}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{item.nama}</span>
                                  <span style={{ color: 'var(--dim)', fontSize: 12, transition: 'transform .15s', transform: itemOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                                </div>
                                {itemOpen && (
                                  <div id={`kamus-soft-body-${uid}`} style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border2)' }}>
                                    <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 10 }}>{item.definisi}</p>
                                    {canSeeIndikator && (
                                      <>
                                        <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--dim)', marginBottom: 6 }}>
                                          Indikator Perilaku per Level
                                        </div>
                                        {item.indikator.map((ind) => (
                                          <div key={ind.level} style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: '1px dashed var(--border2)' }}>
                                            <span style={{
                                              flexShrink: 0, width: 20, height: 20, borderRadius: '50%', background: 'var(--bg3)',
                                              color: 'var(--accent)', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                              {ind.level}
                                            </span>
                                            <span style={{ fontSize: 11.5, color: 'var(--text)', lineHeight: 1.5 }}>{ind.deskripsi}</span>
                                          </div>
                                        ))}
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="card">
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
                  <select
                    className="fselect"
                    style={{ minWidth: 200 }}
                    value={hardGroupFilter}
                    onChange={(e) => { setHardGroupFilter(e.target.value); setHardPage(1) }}
                  >
                    <option value="">Semua Kelompok</option>
                    {hardGroupNames.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                  <select
                    className="fselect"
                    style={{ minWidth: 100 }}
                    value={hardPageSize}
                    onChange={(e) => { setHardPageSize(parseInt(e.target.value, 10)); setHardPage(1) }}
                  >
                    <option value="5">5 / halaman</option>
                    <option value="10">10 / halaman</option>
                    <option value="20">20 / halaman</option>
                  </select>
                  <span className="count-badge">{hardFiltered.length} kompetensi</span>
                </div>

                <div id="kamus-hard-table-container">
                  {hardPageItems.length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
                      Tidak ada kompetensi yang cocok dengan pencarian.
                    </div>
                  ) : (
                    <div className="tbl-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th style={{ width: '26%' }}>Kelompok</th>
                            <th style={{ width: '22%' }}>Nama Kompetensi</th>
                            <th>Definisi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {hardPageItems.map((item, i) => (
                            <tr key={hardStart + i}>
                              <td style={{ fontSize: 11, color: 'var(--muted)' }}>{item.kelompok}</td>
                              <td style={{ fontWeight: 600 }}>{item.nama}</td>
                              <td style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }}>{item.definisi}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {hardTotalPages > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                    {(() => {
                      const btnStyle = (active, disabled) => ({
                        padding: '5px 11px', borderRadius: 7,
                        border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border2)'}`,
                        background: active ? 'var(--accent)' : 'var(--bg2)',
                        color: active ? '#fff' : 'var(--muted)',
                        fontFamily: 'var(--font-b)', fontSize: 12, fontWeight: 600,
                        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
                      })
                      let sp = Math.max(1, hardCurrentPage - 2)
                      let ep = Math.min(hardTotalPages, sp + 4)
                      if (ep - sp < 4) sp = Math.max(1, ep - 4)
                      const pages = []
                      for (let p = sp; p <= ep; p++) pages.push(p)
                      return (
                        <>
                          <button style={btnStyle(false, hardCurrentPage === 1)} disabled={hardCurrentPage === 1} onClick={() => setHardPage(hardCurrentPage - 1)}>
                            &lsaquo; Prev
                          </button>
                          {sp > 1 && (
                            <>
                              <button style={btnStyle(false, false)} onClick={() => setHardPage(1)}>1</button>
                              <span style={{ color: 'var(--dim)' }}>…</span>
                            </>
                          )}
                          {pages.map((p) => (
                            <button key={p} style={btnStyle(p === hardCurrentPage, false)} onClick={() => setHardPage(p)}>{p}</button>
                          ))}
                          {ep < hardTotalPages && (
                            <>
                              <span style={{ color: 'var(--dim)' }}>…</span>
                              <button style={btnStyle(false, false)} onClick={() => setHardPage(hardTotalPages)}>{hardTotalPages}</button>
                            </>
                          )}
                          <button style={btnStyle(false, hardCurrentPage === hardTotalPages)} disabled={hardCurrentPage === hardTotalPages} onClick={() => setHardPage(hardCurrentPage + 1)}>
                            Next &rsaquo;
                          </button>
                          <span style={{ fontSize: 11, color: 'var(--dim)', marginLeft: 8 }}>
                            Hal {hardCurrentPage}/{hardTotalPages}
                            &nbsp; ({hardStart + 1}–{Math.min(hardStart + hardPageSize, hardFiltered.length)} dari {hardFiltered.length})
                          </span>
                        </>
                      )
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="card" style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6 }}>
                10 Kompetensi BUMN digunakan sebagai acuan dalam pelaksanaan asesmen kompetensi bagi pemangku jabatan BOD-1 atau BOD-2. 
                Kerangka kompetensi ini mengacu pada standar kompetensi yang ditetapkan dalam ekosistem BUMN 
                dan digunakan untuk mengukur kapabilitas kepemimpinan serta perilaku strategis yang dibutuhkan oleh pejabat di lingkup Perusahaan.
              </p>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--accent)', marginBottom: 8 }}>
              A. Kompetensi &amp; Perilaku Kunci
            </div>
            <div style={{ marginBottom: 20 }}>
              {Object.keys(bumnClusters).map((cluster) => {
                const gid = slug(cluster)
                const items = bumnClusters[cluster]
                const groupOpen = openGroups.has(gid)
                return (
                  <div key={cluster} style={{ marginBottom: 10 }}>
                    <div
                      className="card-title"
                      onClick={() => toggleGroup(gid)}
                      style={{ cursor: 'pointer', justifyContent: 'space-between', margin: 0, borderRadius: 'var(--radius)' }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.7 }}>
                        {cluster} ({items.length})
                      </span>
                      <span style={{ fontSize: 12, transition: 'transform .15s', transform: groupOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                    </div>
                    {groupOpen && (
                      <div style={{ marginTop: 8 }}>
                        {items.map((item, idx) => {
                          const uid = `${gid}-${idx}`
                          const itemOpen = openItems.has(uid)
                          return (
                            <div key={uid} className="card" style={{ marginBottom: 8, cursor: 'pointer' }} onClick={() => toggleItem(uid)}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{item.nama}</span>
                                <span style={{ color: 'var(--dim)', fontSize: 12, transition: 'transform .15s', transform: itemOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                              </div>
                              {itemOpen && (
                                <div id={`kamus-bumn-body-${uid}`} style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border2)' }}>
                                  <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, marginBottom: roleLower === 'user' ? 0 : 10 }}>{item.definisi}</p>
                                  {roleLower !== 'user' && (
                                    <>
                                      <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--dim)', marginBottom: 6 }}>
                                        Perilaku Kunci (Key Behavior)
                                      </div>
                                      {item.perilaku.map((p, i) => (
                                        <div key={i} style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: '1px dashed var(--border2)' }}>
                                          <span style={{
                                            flexShrink: 0, width: 20, height: 20, borderRadius: '50%', background: 'var(--bg3)',
                                            color: 'var(--accent)', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                          }}>
                                            {i + 1}
                                          </span>
                                          <span style={{ fontSize: 11.5, color: 'var(--text)', lineHeight: 1.5 }}>{p}</span>
                                        </div>
                                      ))}
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--accent)', marginBottom: 8 }}>
              B. Kualifikasi Profesional
            </div>
            <div style={{ marginBottom: 20 }}>
              {KAMUS_BUMN_KUALIFIKASI.map((item, idx) => {
                const open = openKual.has(idx)
                return (
                  <div key={idx} style={{ marginBottom: 10 }}>
                    <div
                      className="card-title"
                      onClick={() => toggleKual(idx)}
                      style={{ cursor: 'pointer', justifyContent: 'space-between', margin: 0, borderRadius: 'var(--radius)' }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>{item.nama}</span>
                      <span style={{ fontSize: 12, transition: 'transform .15s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                    </div>
                    {open && (
                      <div className="card" style={{ margin: '8px 0 0' }}>
                        <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 10 }}>{item.definisi}</p>
                        <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--dim)', marginBottom: 6 }}>
                          Mencakup
                        </div>
                        <ul style={{ margin: '0 0 12px', paddingLeft: 18 }}>
                          {item.mencakup.map((m, i) => (
                            <li key={i} style={{ fontSize: 11.5, color: 'var(--text)', lineHeight: 1.6, marginBottom: 2 }}>{m}</li>
                          ))}
                        </ul>
                        {canSeeSkalaPenilaian && (
                          <>
                            <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--dim)', marginBottom: 6 }}>
                              Skala Penilaian
                            </div>
                            {item.skala.map((s) => (
                              <div key={s.level} style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: '1px dashed var(--border2)' }}>
                                <span style={{
                                  flexShrink: 0, width: 20, height: 20, borderRadius: '50%', background: 'var(--bg3)',
                                  color: 'var(--accent)', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                  {s.level}
                                </span>
                                <span style={{ fontSize: 11.5, color: 'var(--text)', lineHeight: 1.5 }}>{s.penjelasan}</span>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--accent)', marginBottom: 8 }}>
              C. Karakter (Traits) — Big Five Personality
            </div>
            <div style={{ marginBottom: 20 }}>
              {KAMUS_BUMN_TRAITS.map((item, idx) => {
                const open = openTrait.has(idx)
                return (
                  <div key={idx} style={{ marginBottom: 10 }}>
                    <div
                      className="card-title"
                      onClick={() => toggleTrait(idx)}
                      style={{ cursor: 'pointer', justifyContent: 'space-between', margin: 0, borderRadius: 'var(--radius)' }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>{item.nama}</span>
                      <span style={{ fontSize: 12, transition: 'transform .15s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                    </div>
                    {open && (
                      <div className="card" style={{ margin: '8px 0 0' }}>
                        <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>{item.definisi}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
