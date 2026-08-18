import { useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import Icon from './Icon.jsx'

export default function HelpdeskModal({ onClose, defaultTipe = 'pendaftaran' }) {
  const [tipe, setTipe] = useState(defaultTipe)
  const [identitas, setIdentitas] = useState('')
  const [nama, setNama] = useState('')
  const [email, setEmail] = useState('')
  const [catatan, setCatatan] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const isResetPassword = tipe === 'reset_password'

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

        {sent ? (
          <div className="modal-success">
            <div className="modal-success-icon">
              <Icon name="checkCircle" size={26} strokeWidth={2} />
            </div>
            <div className="modal-success-title">Permintaan Terkirim</div>
            <div className="modal-subtitle">
              Permintaan Anda sudah masuk ke Kotak Masuk admin dan akan segera ditindaklanjuti.
            </div>
            <button type="button" className="modal-close-plain" onClick={onClose}>
              Tutup
            </button>
          </div>
        ) : (
          <>
            <div className="modal-header">
              <div className="modal-icon-badge">
                <Icon name="helpCircle" size={20} strokeWidth={2} />
              </div>
              <div className="modal-title">Hubungi Helpdesk</div>
            </div>

            <div className="modal-subtitle">
              {isResetPassword
                ? 'Lupa password atau akun terkunci karena 3x gagal login? Kirim permintaan di bawah ini — Super Admin akan mengatur ulang password Anda.'
                : 'Belum bisa login dengan Google? Kirim permintaan supaya email Anda didaftarkan/dikaitkan oleh admin. Permintaan masuk ke Kotak Masuk admin.'}
            </div>

            <form onSubmit={handleSubmit}>
              <div className="login-field">
                <label>Jenis Permintaan</label>
                <div className="input-icon-wrap">
                  <span className="input-icon">
                    <Icon name="helpCircle" size={16} strokeWidth={2} />
                  </span>
                  <select value={tipe} onChange={(e) => setTipe(e.target.value)}>
                    <option value="reset_password">Lupa / Reset Password (Akun Terkunci)</option>
                    <option value="pendaftaran">Minta Didaftarkan (Login Google)</option>
                    <option value="lainnya">Lainnya</option>
                  </select>
                </div>
              </div>

              <div className="login-field">
                <label>NIK Anda</label>
                <div className="input-icon-wrap">
                  <span className="input-icon">
                    <Icon name="idCard" size={16} strokeWidth={2} />
                  </span>
                  <input
                    type="text"
                    placeholder="Masukkan NIK yang dipakai untuk login"
                    value={identitas}
                    onChange={(e) => setIdentitas(e.target.value)}
                  />
                </div>
              </div>

              <div className="login-field">
                <label>Nama Lengkap</label>
                <div className="input-icon-wrap">
                  <span className="input-icon">
                    <Icon name="user" size={16} strokeWidth={2} />
                  </span>
                  <input type="text" placeholder="Nama lengkap Anda" value={nama} onChange={(e) => setNama(e.target.value)} />
                </div>
              </div>

              <div className="login-field">
                <label>{isResetPassword ? 'Email Aktif Anda (untuk dihubungi admin)' : 'Email Google Anda'}</label>
                <div className="input-icon-wrap">
                  <span className="input-icon">
                    <Icon name="mail" size={16} strokeWidth={2} />
                  </span>
                  <input
                    type="text"
                    placeholder={isResetPassword ? 'nama@email.com' : 'nama@gmail.com'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="login-field">
                <label>Catatan (opsional)</label>
                <div className="input-icon-wrap">
                  <span className="input-icon">
                    <Icon name="messageSquare" size={16} strokeWidth={2} />
                  </span>
                  <input
                    type="text"
                    placeholder="Jelaskan kendala Anda secara singkat"
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                  />
                </div>
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
