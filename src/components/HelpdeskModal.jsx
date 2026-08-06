import { useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'

export default function HelpdeskModal({ onClose }) {
  const [tipe, setTipe] = useState('pendaftaran')
  const [identitas, setIdentitas] = useState('')
  const [nama, setNama] = useState('')
  const [email, setEmail] = useState('')
  const [catatan, setCatatan] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!identitas || !nama || !email) {
      setError('NIK/Username, Nama, dan Email wajib diisi')
      return
    }
    setLoading(true)
    try {
      // Simpan permintaan ke tabel `requests` di Supabase, supaya langsung
      // muncul di menu "Kotak Masuk" admin/superadmin (lihat Inbox.jsx).
      const { error: insertError } = await supabase.from('requests').insert({
        tipe,
        identitas,
        nama,
        email,
        catatan: catatan || null,
        status: 'Baru',
      })
      if (insertError) throw insertError
      setSent(true)
    } catch (err) {
      setError(err.message || 'Gagal mengirim permintaan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Tutup">
          ×
        </button>
        <div className="modal-title">🆘 Hubungi Helpdesk</div>

        {sent ? (
          <div className="modal-subtitle" style={{ marginTop: 8 }}>
            Permintaan Anda sudah terkirim. Admin akan segera menindaklanjuti melalui Kotak Masuk.
          </div>
        ) : (
          <>
            <div className="modal-subtitle">
              Belum bisa login dengan Google? Kirim permintaan supaya email Anda didaftarkan/dikaitkan
              oleh admin. Permintaan masuk ke Kotak Masuk admin.
            </div>
            <form onSubmit={handleSubmit}>
              <div className="login-field">
                <label>Jenis Permintaan</label>
                <select value={tipe} onChange={(e) => setTipe(e.target.value)}>
                  <option value="pendaftaran">Minta Didaftarkan (Login Google)</option>
                  <option value="lainnya">Lainnya</option>
                </select>
              </div>
              <div className="login-field">
                <label>NIK / Username Anda</label>
                <input type="text" value={identitas} onChange={(e) => setIdentitas(e.target.value)} />
              </div>
              <div className="login-field">
                <label>Nama Lengkap</label>
                <input type="text" value={nama} onChange={(e) => setNama(e.target.value)} />
              </div>
              <div className="login-field">
                <label>Email Google Anda</label>
                <input
                  type="text"
                  placeholder="nama@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="login-field">
                <label>Catatan (opsional)</label>
                <input
                  type="text"
                  placeholder="Jelaskan kendala Anda secara singkat"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                />
              </div>

              {error && <div className="login-error">{error}</div>}

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? 'Mengirim...' : 'Kirim Permintaan'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
