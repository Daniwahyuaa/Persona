// supabase/functions/admin-user-actions/index.ts
//
// Edge Function untuk 3 aksi sensitif di halaman "Kelola User" yang TIDAK BOLEH
// dilakukan langsung dari browser (butuh service_role key, bukan anon key):
//   - update_role    : ubah role user lain
//   - reset_password : set password baru untuk user lain
//   - delete_user     : hapus akun (auth.users) — otomatis ikut menghapus baris
//                        profiles-nya karena FK "on delete cascade" di schema.sql
//
// Deploy: supabase functions deploy admin-user-actions
// (SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY otomatis tersedia sebagai env var
// bawaan platform Supabase Edge Functions — tidak perlu diset manual.)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

// Hirarki role: superadmin boleh mengelola admin/executive/user (bukan superadmin lain).
// admin hanya boleh mengelola role 'user'. executive/user tidak boleh mengelola siapa pun.
const VALID_ROLES = ['superadmin', 'admin', 'executive', 'user']

function canManage(actorRole, targetRole) {
  if (actorRole === 'superadmin') return targetRole !== 'superadmin'
  if (actorRole === 'admin') return targetRole === 'user'
  return false
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json({ error: 'Server belum terkonfigurasi (SUPABASE_SERVICE_ROLE_KEY tidak ditemukan).' }, 500)
  }

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const jwt = authHeader.replace('Bearer ', '')
    if (!jwt) return json({ error: 'Tidak ada sesi login.' }, 401)

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // Siapa yang memanggil? Verifikasi token & ambil role-nya dari tabel profiles.
    const { data: callerAuth, error: callerErr } = await admin.auth.getUser(jwt)
    if (callerErr || !callerAuth?.user) return json({ error: 'Sesi tidak valid, silakan login ulang.' }, 401)
    const callerId = callerAuth.user.id

    const { data: callerProfile } = await admin.from('profiles').select('role').eq('id', callerId).maybeSingle()
    const actorRole = callerProfile?.role || 'user'
    if (!['superadmin', 'admin'].includes(actorRole)) {
      return json({ error: 'Kamu tidak punya izin untuk mengelola user.' }, 403)
    }

    const { action, targetId, newRole, newPassword, newNik } = await req.json()
    if (!action || !targetId) return json({ error: 'Parameter tidak lengkap.' }, 400)
    if (targetId === callerId) return json({ error: 'Tidak bisa melakukan aksi ini pada akun sendiri.' }, 400)

    const { data: targetProfile, error: targetErr } = await admin.from('profiles').select('role, nama, username').eq('id', targetId).maybeSingle()
    if (targetErr || !targetProfile) return json({ error: 'User target tidak ditemukan.' }, 404)

    if (!canManage(actorRole, targetProfile.role)) {
      return json({ error: `Kamu (role: ${actorRole}) tidak punya izin mengelola user dengan role "${targetProfile.role}".` }, 403)
    }

    if (action === 'update_nik') {
      // newNik boleh string kosong/null untuk lepas tautan (unlink).
      const nikValue = newNik ? String(newNik).trim() : null
      if (nikValue) {
        const { data: karyawanRow } = await admin.from('karyawan').select('nik').eq('nik', nikValue).maybeSingle()
        if (!karyawanRow) return json({ error: `NIK "${nikValue}" tidak ditemukan di data karyawan.` }, 400)
      }
      const { error } = await admin.from('profiles').update({ nik: nikValue }).eq('id', targetId)
      if (error) return json({ error: error.message }, 500)
      return json({ ok: true })
    }

    if (action === 'update_role') {
      if (!VALID_ROLES.includes(newRole)) return json({ error: 'Role baru tidak valid.' }, 400)
      if (actorRole === 'admin' && newRole !== 'user') {
        return json({ error: 'Admin hanya boleh menetapkan role "user".' }, 403)
      }
      const { error } = await admin.from('profiles').update({ role: newRole }).eq('id', targetId)
      if (error) return json({ error: error.message }, 500)
      return json({ ok: true })
    }

    if (action === 'reset_password') {
      if (!newPassword || String(newPassword).length < 6) {
        return json({ error: 'Password baru minimal 6 karakter.' }, 400)
      }
      const { error } = await admin.auth.admin.updateUserById(targetId, { password: newPassword })
      if (error) return json({ error: error.message }, 500)
      return json({ ok: true })
    }

    if (action === 'delete_user') {
      // Hapus akun auth — baris profiles ikut terhapus otomatis (FK on delete cascade).
      const { error } = await admin.auth.admin.deleteUser(targetId)
      if (error) return json({ error: error.message }, 500)
      return json({ ok: true })
    }

    return json({ error: 'Aksi tidak dikenali.' }, 400)
  } catch (e: any) {
    return json({ error: e?.message || String(e) }, 500)
  }
})
