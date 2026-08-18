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

  // "Heartbeat" status online: selama user login & tab aplikasi aktif, catat
  // waktu terakhir aktif ke profiles.last_seen setiap 60 detik (+ sekali saat
  // baru login). Dipakai menu "Kelola User" untuk menampilkan siapa yang
  // sedang online & kapan terakhir online (lihat touch_last_seen() di
  // migration_last_seen.sql dan Users.jsx).
  useEffect(() => {
    if (!user?.id) return
    function touch() {
      supabase.rpc('touch_last_seen').then(({ error }) => {
        if (error) console.error('[touch_last_seen] gagal:', error.message)
      })
    }
    touch()
    const interval = setInterval(touch, 60000)
    return () => clearInterval(interval)
  }, [user?.id])

  /**
   * Login dengan NIK + password.
   *
   * Supabase Auth aslinya cuma mengenal email/phone, jadi di balik layar kita
   * tetap pakai signInWithPassword() dengan EMAIL — tapi emailnya dicari dulu
   * dari NIK lewat RPC "get_login_email" (lihat schema.sql), supaya user tidak
   * perlu tahu/mengingat email yang terhubung ke akunnya.
   *
   * Maksimal 3x gagal login (NIK ketemu tapi password salah) -> akun otomatis
   * dikunci (kolom profiles.locked = true) dan TIDAK BISA login lagi sampai
   * di-reset oleh admin/superadmin lewat menu "Kelola User" (lihat Users.jsx +
   * admin-user-actions Edge Function). Jalan satu-satunya buat user biasa
   * adalah mengajukan permintaan lewat Helpdesk di layar Login.
   */
  async function login({ nik, password }) {
    if (!nik || !password) {
      throw new Error('NIK dan password wajib diisi')
    }
    const nikTrim = String(nik).trim()

    // 1) Cari email yang terhubung ke NIK ini + cek apakah akun sedang terkunci.
    const { data: lookupRows, error: lookupError } = await supabase.rpc('get_login_email', {
      p_nik: nikTrim,
    })
    if (lookupError) {
      throw new Error('Gagal memeriksa akun. Coba lagi beberapa saat.')
    }
    const account = Array.isArray(lookupRows) ? lookupRows[0] : lookupRows
    if (!account?.email) {
      throw new Error('NIK tidak ditemukan atau belum terdaftar. Periksa kembali, atau hubungi Helpdesk.')
    }
    if (account.locked) {
      const err = new Error(
        'Akun ini terkunci karena 3x gagal login. Hubungi Helpdesk agar Super Admin mengatur ulang password Anda.'
      )
      err.code = 'ACCOUNT_LOCKED'
      throw err
    }

    // 2) Coba login pakai email yang ditemukan + password yang diinput user.
    const { data, error } = await supabase.auth.signInWithPassword({ email: account.email, password })

    if (error) {
      // Kasus khusus: NIK & password sebenarnya benar, tapi email konfirmasi
      // belum diklik user -> ini BUKAN kegagalan password, jangan dihitung
      // ke counter 3x supaya user tidak terkunci karena hal di luar
      // kendalinya.
      if (error.message?.toLowerCase().includes('email not confirmed')) {
        throw new Error('Email belum dikonfirmasi. Cek inbox/spam untuk link konfirmasi sebelum login.')
      }

      // NIK benar tapi password salah -> catat 1x kegagalan. Begitu mencapai
      // 3x, RPC ini otomatis mengunci akun di sisi database.
      const { data: failRows, error: failError } = await supabase.rpc('register_failed_login', {
        p_nik: nikTrim,
      })

      if (failError) {
        // Kalau RPC ini gagal dipanggil (fungsi belum ada di database, hak
        // akses belum di-grant, dst), JANGAN diam-diam dianggap sukses —
        // log ke console supaya kelihatan saat debugging, karena kalau
        // dibiarkan diam-diam, akun tidak akan pernah benar-benar terkunci
        // walau sudah salah password berkali-kali.
        console.error('[login] register_failed_login gagal dipanggil:', failError.message)
      }
      const fail = Array.isArray(failRows) ? failRows[0] : failRows

      if (fail?.is_locked) {
        const err = new Error(
          'Password salah 3 kali. Akun ini sekarang terkunci — hubungi Helpdesk agar Super Admin mengatur ulang password Anda.'
        )
        err.code = 'ACCOUNT_LOCKED'
        throw err
      }

      const sisaPercobaan =
        fail?.new_failed_login_attempts != null ? Math.max(0, 3 - fail.new_failed_login_attempts) : null
      throw new Error(
        sisaPercobaan != null
          ? `NIK atau password salah. Sisa kesempatan: ${sisaPercobaan}x sebelum akun dikunci.`
          : 'NIK atau password salah'
      )
    }

    // 3) Login berhasil -> normalkan kembali counter kegagalan akun ini ke 0.
    await supabase.rpc('reset_own_login_attempts')

    const mapped = await mapSupabaseUser(data.user)
    setUser(mapped)
    return mapped
  }

  /**
   * Daftar (sign-up) dengan email + password + nama + NIK.
   * Sebelum akun dibuat, NIK & nama dicek dulu ke tabel "karyawan" lewat
   * RPC "check_nik_nama" (lihat supabase/migration_nik_validation.sql).
   * Kalau NIK tidak ditemukan, atau nama tidak cocok dengan NIK tsb, atau
   * NIK sudah dipakai akun lain -> pendaftaran DITOLAK, akun tidak dibuat.
   * Supabase akan otomatis mengirim email konfirmasi (kalau "Confirm email"
   * aktif di Authentication -> Providers -> Email). Trigger di database
   * otomatis membuat baris di tabel "profiles" dengan role default 'user'
   * dan NIK langsung terisi (lihat handle_new_user di migration).
   */
  async function register({ email, password, nama, nik }) {
    if (!email || !password) {
      throw new Error('Email dan password wajib diisi')
    }
    if (!nama || !nik) {
      throw new Error('Nama dan NIK wajib diisi')
    }
    if (password.length < 6) {
      throw new Error('Password minimal 6 karakter')
    }

    const namaTrim = nama.trim()
    const nikTrim = nik.trim()

    // Validasi NIK + Nama harus cocok dengan data karyawan resmi
    const { data: valid, error: rpcError } = await supabase.rpc('check_nik_nama', {
      p_nik: nikTrim,
      p_nama: namaTrim,
    })

    if (rpcError) {
      throw new Error(rpcError.message || 'Gagal memvalidasi NIK. Coba lagi.')
    }
    if (!valid) {
      throw new Error(
        'NIK dan Nama tidak sesuai dengan data karyawan, atau NIK sudah pernah didaftarkan. Periksa kembali, atau hubungi Helpdesk.'
      )
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nama: namaTrim, nik: nikTrim },
        emailRedirectTo: window.location.origin,
      },
    })

    if (error) {
      if (error.message?.toLowerCase().includes('already registered')) {
        throw new Error('Email ini sudah terdaftar. Coba masuk, atau hubungi Helpdesk kalau lupa password.')
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

  // Catatan: TIDAK ADA lagi self-service "forgot password" lewat email di sini.
  // Sesuai kebijakan, satu-satunya jalan reset password adalah lewat Helpdesk
  // (form di layar Login -> masuk ke Kotak Masuk admin) yang kemudian
  // ditindaklanjuti Super Admin/Admin lewat menu "Kelola User" -> Ganti
  // Password (lihat Users.jsx). Ini juga otomatis membuka kunci akun yang
  // terkena limit 3x gagal login.

  return (
    <AuthContext.Provider
      value={{ user, checkingSession, login, register, loginWithGoogle, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth harus dipakai di dalam <AuthProvider>')
  return ctx
}
