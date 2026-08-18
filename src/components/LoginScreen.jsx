import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import Icon from './Icon.jsx'
import HelpdeskModal from './HelpdeskModal.jsx'
import LoginVisual from './LoginVisual.jsx'
import logoColor from '../assets/logo-color.png'
import logoWhite from '../assets/logo-white.png'
import sgnLogoColor from '../assets/sgn-logo-color.png'
import sgnLogoWhite from '../assets/sgn-logo-white.png'

export default function LoginScreen() {
  const { login, register, loginWithGoogle } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [mode, setMode] = useState('login') // 'login' | 'register'

  const [nama, setNama] = useState('')
  const [email, setEmail] = useState('') // hanya dipakai saat mode='register' (bikin akun Supabase Auth)
  const [nik, setNik] = useState('') // dipakai untuk login (pengganti email) & untuk registrasi
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [error, setError] = useState('')
  const [errorCode, setErrorCode] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [helpdeskOpen, setHelpdeskOpen] = useState(false)
  const [helpdeskDefaultTipe, setHelpdeskDefaultTipe] = useState('pendaftaran')

  const isRegister = mode === 'register'

  function switchMode(next) {
    setMode(next)
    setError('')
    setErrorCode('')
    setInfo('')
  }

  function openHelpdesk(defaultTipe = 'pendaftaran') {
    setHelpdeskDefaultTipe(defaultTipe)
    setHelpdeskOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setErrorCode('')
    setInfo('')
    setLoading(true)
    try {
      if (isRegister) {
        if (password !== confirmPassword) {
          throw new Error('Konfirmasi password tidak cocok')
        }
        const { needsConfirmation } = await register({
          email,
          password,
          nama,
          nik,
        })

        if (needsConfirmation) {
          setInfo('Pendaftaran berhasil! Cek inbox (atau folder spam) untuk link konfirmasi email sebelum bisa masuk.')
          setMode('login')
        }
      } else {
        // Login pakai NIK + Password (bukan email).
        await login({ nik, password })
      }
    } catch (err) {
      setError(err.message || (isRegister ? 'Pendaftaran gagal' : 'Login gagal'))
      setErrorCode(err.code || '')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError('')
    setErrorCode('')
    setInfo('')
    try {
      await loginWithGoogle()
    } catch (err) {
      setError(err.message || 'Login Google gagal')
    }
  }

  return (
    <div className="login-screen">
      <img
        src={theme === 'dark' ? sgnLogoWhite : sgnLogoColor}
        alt="Sinergi Gula Nusantara"
        className="sgn-fixed-logo"
      />

      <button
        type="button"
        className="theme-toggle-fab"
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
        title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
      >
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} strokeWidth={2} />
      </button>

      <div className="login-card">
        {/* Panel kiri: ilustrasi kawasan industri, siang untuk light mode & senja/malam untuk dark mode */}
        <div className="login-visual" aria-hidden="true">
          <LoginVisual theme={theme} />
        </div>

        {/* Panel kanan: form */}
        <div className="login-panel">
          <div className="login-box">
            <div className="login-logo">
              <img src={theme === 'dark' ? logoWhite : logoColor} alt="Persona" />
            </div>

            <form onSubmit={handleSubmit}>
              {isRegister && (
                <div className="login-field">
                  <div className="input-icon-wrap">
                    <span className="input-icon">
                      <Icon name="user" size={16} strokeWidth={2} />
                    </span>
                    <input
                      id="login-nama"
                      type="text"
                      placeholder="Nama Lengkap"
                      autoComplete="name"
                      value={nama}
                      onChange={(e) => setNama(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              {isRegister && (
                <div className="login-field">
                  <div className="input-icon-wrap">
                    <span className="input-icon">
                      <Icon name="user" size={16} strokeWidth={2} />
                    </span>
                    <input
                      id="login-email"
                      type="email"
                      placeholder="Email Address"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="login-field">
                <div className="input-icon-wrap">
                  <span className="input-icon">
                    <Icon name="fileText" size={16} strokeWidth={2} />
                  </span>
                  <input
                    id="login-nik"
                    type="text"
                    placeholder="Masukkan NIK"
                    autoComplete="username"
                    inputMode="numeric"
                    value={nik}
                    onChange={(e) => setNik(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="login-field">
                <div className="input-icon-wrap">
                  <span className="input-icon">
                    <Icon name="lock" size={16} strokeWidth={2} />
                  </span>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    autoComplete={isRegister ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={isRegister ? 6 : undefined}
                  />
                  <button
                    type="button"
                    className="pwd-eye-btn"
                    tabIndex={-1}
                    onClick={() => setShowPassword((s) => !s)}
                  >
                    <Icon name="eye" size={16} />
                  </button>
                </div>
              </div>

              {isRegister && (
                <div className="login-field">
                  <div className="input-icon-wrap">
                    <span className="input-icon">
                      <Icon name="lock" size={16} strokeWidth={2} />
                    </span>
                    <input
                      id="login-confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Konfirmasi Password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              {error && <div className="login-error">{error}</div>}

              {/* Kalau akun terkunci (habis 3x gagal login), tawarkan langsung
                  jalan pintas ke form Helpdesk dengan jenis permintaan
                  "reset password" sudah terpilih. */}
              {errorCode === 'ACCOUNT_LOCKED' && (
                <button
                  type="button"
                  className="login-btn"
                  style={{ background: 'var(--danger, #dc2626)', marginBottom: 10 }}
                  onClick={() => openHelpdesk('reset_password')}
                >
                  Hubungi Divisi Pengembangan SDM dan Budaya Sub Divisi Karir dan Asesmen
                </button>
              )}

              {info && <div className="login-info">{info}</div>}

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? 'Memproses...' : isRegister ? 'Daftar' : 'Login'}
              </button>

            </form>

            <div className="login-divider">
              <span>atau</span>
            </div>
            <button type="button" className="google-btn" onClick={handleGoogle}>
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {isRegister ? 'Daftar dengan Google' : 'Login dengan Google'}
            </button>

            <div className="login-switch-mode">
              {isRegister ? (
                <button type="button" className="helpdesk-link" onClick={() => switchMode('login')}>
                  Sudah punya akun? Masuk
                </button>
              ) : (
                <button type="button" className="helpdesk-link" onClick={() => switchMode('register')}>
                  Belum punya akun? Daftar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {helpdeskOpen && (
        <HelpdeskModal defaultTipe={helpdeskDefaultTipe} onClose={() => setHelpdeskOpen(false)} />
      )}
    </div>
  )
}
