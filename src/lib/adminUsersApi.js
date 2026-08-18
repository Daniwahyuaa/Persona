import { supabase } from './supabaseClient.js'

/** Daftar semua user (butuh RLS "profiles: admin/superadmin baca semua"). */
export async function listProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, nama, role, nik, locked, failed_login_attempts, last_seen')
    .order('nama', { ascending: true })
  if (error) throw error
  return data || []
}

async function callAdminAction(payload) {
  const { data, error } = await supabase.functions.invoke('admin-user-actions', { body: payload })
  if (error) {
    // supabase-js membungkus error non-2xx dari Edge Function di sini — coba ambil
    // pesan asli dari body response kalau ada, biar toast-nya informatif.
    const msg = data?.error || error.message || 'Gagal menghubungi server.'
    throw new Error(msg)
  }
  if (data?.error) throw new Error(data.error)
  return data
}

export function adminUpdateNik(targetId, nik) {
  return callAdminAction({ action: 'update_nik', targetId, newNik: nik })
}

export function adminUpdateRole(targetId, newRole) {
  return callAdminAction({ action: 'update_role', targetId, newRole })
}

export function adminResetPassword(targetId, newPassword) {
  return callAdminAction({ action: 'reset_password', targetId, newPassword })
}

export function adminDeleteUser(targetId) {
  return callAdminAction({ action: 'delete_user', targetId })
}

/** Buka kunci akun (habis 3x gagal login) tanpa mengganti password. */
export function adminUnlockAccount(targetId) {
  return callAdminAction({ action: 'unlock_account', targetId })
}
