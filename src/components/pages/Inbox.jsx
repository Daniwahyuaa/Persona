import { useEffect, useState } from 'react'
import Icon from '../Icon.jsx'
import { supabase } from '../../lib/supabaseClient.js'

export default function Inbox() {
  const [statusFilter, setStatusFilter] = useState('pending')
  const [rows, setRows] = useState(null)
  const [loading, setLoading] = useState(false)

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
              <div className="card-title-icon" style={{ background: '#fee2e2' }}>📨</div>
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
              <option value="pending">Belum Diproses</option>
              <option value="resolved">Selesai</option>
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
              {rows.map((r) => (
                <div
                  key={r.id}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
                    padding: '12px 14px', border: '1px solid var(--border2)', borderRadius: 10,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 3 }}>
                      {r.nama || '—'} <span style={{ color: 'var(--dim)', fontWeight: 400 }}>· {r.identitas || '—'}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{r.tipe || 'Permintaan'}</div>
                    {r.catatan && <div style={{ fontSize: 12, color: 'var(--text)' }}>{r.catatan}</div>}
                    <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 4 }}>
                      {r.created_at ? new Date(r.created_at).toLocaleString('id-ID') : ''}
                    </div>
                  </div>
                  <span className={`badge ${r.status === 'resolved' ? 'badge-hp' : 'badge-sc'}`}>
                    {r.status === 'resolved' ? 'Selesai' : 'Belum Diproses'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
