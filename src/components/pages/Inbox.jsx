import { useEffect, useState } from 'react'
import Icon from '../Icon.jsx'
import { supabase } from '../../lib/supabaseClient.js'

export default function Inbox() {
  const [statusFilter, setStatusFilter] = useState('Baru')
  const [rows, setRows] = useState(null)
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState(null)

  async function load() {
    setLoading(true)
    let q = supabase.from('requests').select('*').order('created_at', { ascending: false })
    if (statusFilter) q = q.eq('status', statusFilter)
    const { data } = await q
    setRows(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  async function handleMarkSelesai(id) {
    setBusyId(id)
    try {
      const { error } = await supabase.from('requests').update({ status: 'Selesai' }).eq('id', id)
      if (error) throw error
      // Kalau filter aktif "Belum Diproses", baris ini otomatis hilang dari daftar
      // begitu statusnya berubah jadi Selesai; kalau filter "Semua"/"Selesai",
      // cukup update status di tempat.
      setRows((rs) => {
        if (statusFilter === 'Baru') return rs.filter((r) => r.id !== id)
        return rs.map((r) => (r.id === id ? { ...r, status: 'Selesai' } : r))
      })
    } catch (err) {
      alert(err.message || 'Gagal menandai permintaan sebagai selesai.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleHapus(id) {
    if (!window.confirm('Hapus permintaan ini? Tindakan ini tidak bisa dibatalkan.')) return
    setBusyId(id)
    try {
      const { error } = await supabase.from('requests').delete().eq('id', id)
      if (error) throw error
      setRows((rs) => rs.filter((r) => r.id !== id))
    } catch (err) {
      alert(err.message || 'Gagal menghapus permintaan.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <div className="topbar" style={{ padding: '0 28px', gap: 4 }}>
        <div className="topbar-simple-title">
          <span>📨 Kotak Masuk</span>
        </div>
      </div>
      <div className="content">
        <div className="card">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div className="card-title-icon" style={{ background: '#fee2e2', color: '#b91c1c' }}>
                <Icon name="mail" size={12} strokeWidth={2.4} />
              </div>
              Permintaan Masuk
            </div>
            <button
              onClick={load}
              className="btn-refresh"
              style={{ width: 'auto' }}
            >
              <Icon name="refresh" size={13} strokeWidth={2.5} />
              Refresh
            </button>
          </div>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
            Permintaan pendaftaran (dari login Google yang emailnya belum terdaftar) dan permintaan bantuan/reset
            password dari layar login akan masuk di sini.
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <select className="fselect" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="Baru">Belum Diproses</option>
              <option value="Selesai">Selesai</option>
              <option value="">Semua</option>
            </select>
          </div>

          {loading || rows === null ? (
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>Memuat…</div>
          ) : rows.length === 0 ? (
            <div className="empty-state">
              <div className="es-icon">📭</div>
              <div className="es-title">Tidak ada permintaan</div>
              <div className="es-sub">Belum ada permintaan dengan status ini.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {rows.map((r) => {
                const isDone = r.status === 'Selesai'
                const isBusy = busyId === r.id
                return (
                  <div
                    key={r.id}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
                      padding: '12px 14px', border: '1px solid var(--border2)', borderRadius: 10,
                      opacity: isBusy ? 0.6 : 1,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 3 }}>
                        {r.nama || '—'} <span style={{ color: 'var(--dim)', fontWeight: 400 }}>· {r.identitas || '—'}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{r.tipe || 'Permintaan'}</div>
                      {r.email && (
                        <div style={{ fontSize: 12, color: 'var(--text)', marginBottom: 2 }}>✉️ {r.email}</div>
                      )}
                      {r.catatan && <div style={{ fontSize: 12, color: 'var(--text)' }}>{r.catatan}</div>}
                      <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 4 }}>
                        {r.created_at ? new Date(r.created_at).toLocaleString('id-ID') : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                      <span className={`badge ${isDone ? 'badge-hp' : 'badge-sc'}`}>
                        {r.status || 'Baru'}
                      </span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {!isDone && (
                          <button
                            onClick={() => handleMarkSelesai(r.id)}
                            disabled={isBusy}
                            title="Tandai sebagai selesai"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 11px',
                              borderRadius: 7, border: '1px solid var(--accent)', background: 'transparent',
                              color: 'var(--accent)', fontFamily: 'var(--font-b)', fontSize: 11.5, fontWeight: 700,
                              cursor: isBusy ? 'not-allowed' : 'pointer',
                            }}
                          >
                            <Icon name="checkCircle" size={12} strokeWidth={2.4} />
                            Selesai
                          </button>
                        )}
                        <button
                          onClick={() => handleHapus(r.id)}
                          disabled={isBusy}
                          title="Hapus permintaan"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 11px',
                            borderRadius: 7, border: '1px solid var(--border2)', background: 'transparent',
                            color: 'var(--danger)', fontFamily: 'var(--font-b)', fontSize: 11.5, fontWeight: 700,
                            cursor: isBusy ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <Icon name="trash" size={12} strokeWidth={2.4} />
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
