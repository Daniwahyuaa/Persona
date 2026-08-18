import { useEffect, useState } from 'react'
import Topbar from '../Topbar.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useSelectedEmployee } from '../../context/SelectedEmployeeContext.jsx'
import { getTalentProfile, searchKaryawan } from '../../lib/talentProfileApi.js'
import { isDataLockedToSelf } from '../../data/navItems.js'

function CliTable({ items }) {
  if (!items || items.length === 0) {
    return <div style={{ color: '#dc2626', fontSize: 12 }}>Belum ada data</div>
  }
  const total = items.length
  const tercapai = items.filter((it) => it.hasil === 1).length
  const persen = total > 0 ? Math.round((tercapai / total) * 100) : 0

  return (
    <div>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ textAlign: 'center', width: 36 }}>No</th>
              <th>Kompetensi</th>
              <th style={{ textAlign: 'center' }}>Hasil</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                <td style={{ textAlign: 'center', color: 'var(--dim)' }}>{i + 1}</td>
                <td>{it.nama_kompetensi}</td>
                <td style={{ textAlign: 'center' }}>
                  <span className={`type-pill ${it.hasil === 1 ? 'type-q' : 'type-nq'}`}>
                    {it.hasil === 1 ? 'Tercapai' : 'Tidak Tercapai'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div
        style={{
          marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg3)', borderRadius: 8, padding: '9px 12px',
        }}
      >
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--dim)' }}>
          % Ketercapaian
        </div>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)' }}>
          {persen}% <span style={{ fontWeight: 500, color: 'var(--dim)', fontSize: 11 }}>({tercapai}/{total})</span>
        </div>
      </div>
    </div>
  )
}

export default function Kompetensi() {
  const { user } = useAuth()
  const lockedToSelf = isDataLockedToSelf(user?.role)
  // NIK yang sedang dipilih dipakai bersama dg Talent Profile & Asesmen, supaya
  // karyawan yang dicari/dipilih di Talent Profile ikut otomatis tampil di sini.
  const { selectedNik, setSelectedNik } = useSelectedEmployee()
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

  // Ikuti NIK yang sedang dipilih secara global (mis. dari Talent Profile).
  // Kalau NIK yang sedang ditampilkan di sini sudah sama, tidak perlu fetch ulang.
  useEffect(() => {
    if (lockedToSelf) return
    if (!selectedNik) return
    if (selected?.karyawan?.nik === selectedNik) return
    setLoading(true)
    getTalentProfile(selectedNik)
      .then(setSelected)
      .finally(() => setLoading(false))
  }, [lockedToSelf, selectedNik]) // eslint-disable-line react-hooks/exhaustive-deps

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
    setQuery(`${row.nama} (${row.nik})`)
    setLoading(true)
    try {
      const data = await getTalentProfile(row.nik)
      setSelected(data)
      setSelectedNik(row.nik) // sync ke context global, ikut tampil di Talent Profile & Asesmen
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Topbar title="CLI" />
      <div className="content">
        {!lockedToSelf && (
          <div className="card" style={{ marginBottom: 14 }}>
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
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--dim)' }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {lockedToSelf
                ? 'Belum ada data hasil kompetensi untuk Anda.'
                : 'Cari dan pilih karyawan untuk melihat hasil kompetensinya'}
            </div>
          </div>
        )}

        {!loading && selected && (
          <div>
            <div className="viewing-banner">
              Menampilkan: <strong>{selected.karyawan.nama}</strong> ({selected.karyawan.nik})
            </div>
            <div className="two-col">
              <div className="card">
                <div className="card-title">Soft Competency</div>
                <CliTable items={selected.cliSoft.items} />
              </div>
              <div className="card">
                <div className="card-title">Hard Competency</div>
                <CliTable items={selected.cliHard.items} />
                <div style={{ fontSize: 10.5, color: 'var(--dim)', lineHeight: 1.5 }}>
              <strong>Keterangan:</strong>  <strong>Tercapai</strong> diartikan bahwa telah mencapai kompetensi
              dimaksud, <strong>Tidak Tercapai</strong> diartikan bahwa tidak mencapai kompetensi dimaksud.
            </div>
              </div>
            </div>
            
          </div>
        )}
      </div>
    </div>
  )
}
