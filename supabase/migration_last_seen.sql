-- ═══════════════════════════════════════════════════════════════
-- PERSONA — Migrasi: status online & "terakhir online" di menu Kelola User
-- Jalankan di: Supabase Dashboard -> SQL Editor -> New query -> Run
--
-- Cara kerja: setiap kali aplikasi terbuka & user aktif (fokus tab), frontend
-- memanggil RPC touch_last_seen() setiap ~60 detik (lihat AuthContext.jsx).
-- Kolom last_seen dipakai menu "Kelola User" untuk menampilkan:
--   - "Online" kalau last_seen dalam 3 menit terakhir
--   - "Terakhir online: <waktu>" kalau lebih lama dari itu
-- ═══════════════════════════════════════════════════════════════

alter table public.profiles add column if not exists last_seen timestamptz;

-- SECURITY DEFINER dipakai supaya user bisa update last_seen milik SENDIRI
-- meski tabel profiles tidak punya policy UPDATE umum untuk role 'user'
-- (pola ini sama dengan reset_own_login_attempts()).
create or replace function public.touch_last_seen()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set last_seen = now()
  where id = auth.uid();
$$;

revoke all on function public.touch_last_seen() from public;
grant execute on function public.touch_last_seen() to authenticated;
