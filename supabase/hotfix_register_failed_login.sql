-- ═══════════════════════════════════════════════════════════════
-- HOTFIX — perbaikan bug "column reference failed_login_attempts is ambiguous"
-- Cukup jalankan file KECIL ini saja (tidak perlu ulang migration_login_nik.sql
-- yang lama), lalu langsung coba login lagi.
-- ═══════════════════════════════════════════════════════════════
-- Wajib DROP dulu karena tipe kolom hasil (return type) berubah dari versi
-- sebelumnya — Postgres tidak mengizinkan CREATE OR REPLACE kalau bentuk
-- OUT parameter/return type-nya berbeda.
drop function if exists public.register_failed_login(text);

create function public.register_failed_login(p_nik text)
returns table (new_failed_login_attempts int, is_locked boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempts int;
  v_locked boolean;
begin
  update public.profiles as p
  set failed_login_attempts = p.failed_login_attempts + 1,
      locked = case when p.locked then true else (p.failed_login_attempts + 1) >= 3 end,
      locked_at = case
        when not p.locked and (p.failed_login_attempts + 1) >= 3 then now()
        else p.locked_at
      end
  where p.nik = p_nik
  returning p.failed_login_attempts, p.locked into v_attempts, v_locked;

  return query select v_attempts, v_locked;
end;
$$;

revoke all on function public.register_failed_login(text) from public;
grant execute on function public.register_failed_login(text) to anon, authenticated;
