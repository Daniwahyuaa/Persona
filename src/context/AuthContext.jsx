import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'

const AuthContext = createContext(null)

// Mengubah objek user dari Supabase Auth menjadi bentuk yang dipakai komponen UI
// ({ username, nama, role }). Nama & role diambil dari tabel "profiles", yang
// otomatis dibuat lewat trigger database saat user baru sign-up (lihat schema.sql).
async function mapSupabaseUser(sbUser) {
  if (!sbUser) return null
  const email = sbUser.email || ''
  const derivedUsername = email.includes('@') ? email.split('@')[0] : email

  let profile = null
  try {
    const { data } = await supabase
      .from('profiles')
      .select('username, nama, role, nik')
      .eq('id', sbUser.id)
      .maybeSingle()
    profile = data
  } catch (e) {
    /* tabel profiles belum ada / RLS belum diset — fallback ke default di bawah */
  }

  return {
    id: sbUser.id,
    username: profile?.username || derivedUsername,
    nama: profile?.nama || sbUser.user_metadata?.nama || derivedUsername,
    role: profile?.role || 'user',
    nik: profile?.nik || null,
    email,
    emailConfirmed: !!sbUser.email_confirmed_at,
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(async ({ data }) => {
      const mapped = await mapSupabaseUser(data.session?.user)
      if (!mounted) return
      setUser(mapped)
      setCheckingSession(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const mapped = await mapSupabaseUser(session?.user)
      if (mounted) setUser(mapped)
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  /**
   * Login dengan email + password.
   */
  async function login({ email, password }) {
    if (!email || !password) {
      throw new Error('Email dan password wajib diisi')
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      if (error.message?.toLowerCase().includes('invalid login credentials')) {
        throw new Error('Email atau password salah')
      }
      if (error.message?.toLowerCase().includes('email not confirmed')) {
        throw new Error('Email belum dikonfirmasi. Cek inbox/spam untuk link konfirmasi.')
      }
      throw new Error(error.message || 'Login gagal')
    }

    const mapped = await mapSupabaseUser(data.user)
    setUser(mapped)
    return mapped
  }

  /**
   * Daftar (sign-up) dengan email + password + nama.
   * Supabase akan otomatis mengirim email konfirmasi (kalau "Confirm email"
   * aktif di Authentication -> Providers -> Email). Trigger di database
   * otomatis membuat baris di tabel "profiles" dengan role default 'user'.
   */
  async function register({ email, password, nama }) {
    if (!email || !password) {
      throw new Error('Email dan password wajib diisi')
    }
    if (password.length < 6) {
      throw new Error('Password minimal 6 karakter')
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nama },
        emailRedirectTo: window.location.origin,
      },
    })

    if (error) {
      if (error.message?.toLowerCase().includes('already registered')) {
        throw new Error('Email ini sudah terdaftar. Coba masuk / lupa password.')
      }
      throw new Error(error.message || 'Pendaftaran gagal')
    }

    // Kalau confirm-email AKTIF di Supabase: data.session akan null di sini,
    // user harus klik link di email dulu sebelum bisa login.
    const needsConfirmation = !data.session
    if (!needsConfirmation) {
      const mapped = await mapSupabaseUser(data.user)
      setUser(mapped)
    }
    return { needsConfirmation }
  }

  /**
   * Login dengan Google OAuth.
   */
  async function loginWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) {
      throw new Error(error.message || 'Login Google gagal')
    }
  }

  async function logout() {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, checkingSession, login, register, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth harus dipakai di dalam <AuthProvider>')
  return ctx
}
