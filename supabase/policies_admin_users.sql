-- ═══════════════════════════════════════════════════════════════
-- RLS tambahan — supaya admin/superadmin bisa melihat SEMUA profil
-- di halaman "Kelola User" (sebelumnya cuma bisa lihat profil sendiri).
-- Jalankan di: Supabase Dashboard -> SQL Editor -> New query -> Run
--
-- Operasi TULIS (ubah role, reset password, hapus user) SENGAJA tidak
-- dibuka lewat RLS di sini — itu ditangani Edge Function
-- "admin-user-actions" (pakai service_role key) supaya aturan hirarki
-- (superadmin > admin > executive/user) tervalidasi di server, bukan
-- cuma di client.
-- ═══════════════════════════════════════════════════════════════

create policy "profiles: admin/superadmin baca semua"
  on public.profiles
  for select
  using (public.current_role() in ('superadmin','admin'));
