-- ═══════════════════════════════════════════════════════════════
-- PERSONA — Migrasi: Login pakai NIK + Kunci Akun setelah 3x Gagal Login
-- Jalankan di: Supabase Dashboard -> SQL Editor -> New query -> Run
--
-- Aman dijalankan berulang (idempotent) & TIDAK menghapus data yang sudah
-- ada. Cukup jalankan file ini kalau tabel "profiles" & tabel lain di
-- schema.sql SUDAH ADA sebelumnya — file ini hanya menambah kolom & fungsi
-- baru yang dibutuhkan fitur login NIK.
-- ═══════════════════════════════════════════════════════════════

-- 1) KOLOM BARU DI PROFILES ──────────────────────────────────────
-- nik        : sudah ada sebelumnya, sekarang dipakai sebagai PENGGANTI EMAIL
--              untuk login (bukan lagi cuma buat filter data pribadi).
-- failed_login_attempts : counter gagal login, reset ke 0 setiap login sukses.
-- locked                : true kalau sudah 3x gagal login berturut-turut.
-- locked_at              : kapan akun dikunci, buat referensi admin.
alter table public.profiles add column if not exists failed_login_attempts int not null default 0;
alter table public.profiles add column if not exists locked boolean not null default false;
alter table public.profiles add column if not exists locked_at timestamptz;

-- NIK harus unik supaya lookup email-berdasar-NIK saat login tidak ambigu.
-- Dibungkus DO block supaya kalau GAGAL (misalnya ada NIK yang kembar di
-- data lama), migrasi ini TIDAK membatalkan seluruh skrip (kolom & fungsi di
-- bawah tetap ke-apply). Pesan peringatan akan muncul di panel "Results" /
-- "Messages" SQL Editor kalau index gagal dibuat.
do $$
begin
  begin
    create unique index if not exists profiles_nik_unique_idx on public.profiles (nik) where nik is not null;
  exception when others then
    raise notice 'GAGAL membuat index unik NIK (kemungkinan ada NIK kembar di data lama): %', sqlerrm;
    raise notice 'Cari NIK kembar lewat: select nik, count(*) from public.profiles where nik is not null group by nik having count(*) > 1;';
  end;
end $$;

-- 2) TRIGGER PENDAFTARAN USER BARU — sekalian isi kolom NIK ──────
-- Sebelumnya trigger ini hanya mengisi username/nama/role; sekarang NIK yang
-- dikirim saat signUp() (lewat options.data.nik) juga langsung tersimpan,
-- supaya user baru bisa langsung login pakai NIK tanpa perlu ditautkan
-- manual dulu oleh admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, nama, role, nik)
  values (
    new.id,
    split_part(new.email, '@', 1),
    coalesce(new.raw_user_meta_data->>'nama', split_part(new.email, '@', 1)),
    'user',
    new.raw_user_meta_data->>'nik'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3) FUNGSI RPC UNTUK LOGIN NIK + PEMBATASAN 3X GAGAL LOGIN ──────
-- Supabase Auth aslinya hanya mengenal email/phone, jadi 3 fungsi RPC di
-- bawah ini menjembatani login dengan NIK dari layar Login (yang belum
-- punya sesi sama sekali, jadi HARUS bisa dipanggil sebagai anon):
--
--   a. get_login_email        -> cari email yg terhubung ke NIK + cek status
--                                 kunci, supaya browser bisa memanggil
--                                 signInWithPassword() dengan email tsb.
--   b. register_failed_login  -> catat 1x kegagalan (password salah) untuk
--                                 NIK tsb; begitu mencapai 3x, akun otomatis
--                                 dikunci (locked = true) sampai di-reset
--                                 admin/superadmin.
--   c. reset_own_login_attempts -> dipanggil SETELAH login berhasil (sudah
--                                 authenticated) untuk menormalkan counter
--                                 kembali ke 0.
--
-- SECURITY DEFINER dipakai karena RLS tabel profiles hanya izinkan baca baris
-- sendiri; fungsi-fungsi ini sengaja bypass RLS tapi outputnya dibatasi
-- ketat (cuma email + status kunci, TIDAK ada data lain yang dibocorkan ke
-- anon).
create or replace function public.get_login_email(p_nik text)
returns table (email text, locked boolean, failed_login_attempts int)
language sql
security definer
set search_path = public
stable
as $$
  select u.email, p.locked, p.failed_login_attempts
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.nik = p_nik
  limit 1;
$$;

revoke all on function public.get_login_email(text) from public;
grant execute on function public.get_login_email(text) to anon, authenticated;

-- Wajib DROP dulu kalau sebelumnya fungsi ini sudah pernah dibuat dengan
-- nama/tipe kolom hasil yang berbeda — Postgres tidak mengizinkan
-- CREATE OR REPLACE kalau bentuk return type-nya berubah.
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

create or replace function public.reset_own_login_attempts()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set failed_login_attempts = 0, locked = false, locked_at = null
  where id = auth.uid();
$$;

revoke all on function public.reset_own_login_attempts() from public;
grant execute on function public.reset_own_login_attempts() to authenticated;

-- ═══════════════════════════════════════════════════════════════
-- VERIFIKASI — jalankan query ini setelah skrip di atas selesai, untuk
-- memastikan semua kolom & fungsi benar-benar ke-apply (harus muncul 3 baris
-- fungsi + kolom locked/failed_login_attempts ada di profiles).
-- ═══════════════════════════════════════════════════════════════
select
  (select count(*) from information_schema.columns
    where table_schema='public' and table_name='profiles'
    and column_name in ('nik','locked','failed_login_attempts','locked_at')) as jumlah_kolom_baru, -- harus = 4
  (select count(*) from pg_proc
    where proname in ('get_login_email','register_failed_login','reset_own_login_attempts')) as jumlah_fungsi_rpc; -- harus = 3

-- ═══════════════════════════════════════════════════════════════
-- SELESAI. Setelah query verifikasi di atas menunjukkan 4 dan 3, lanjutkan:
-- 1. Deploy ulang Edge Function admin-user-actions (ada aksi baru
--    "unlock_account" + "reset_password" yang sekarang otomatis membuka
--    kunci akun juga):
--      supabase functions deploy admin-user-actions
-- 2. Pastikan setiap akun yang mau dipakai login sudah punya NIK terisi di
--    tabel profiles (lewat menu "Kelola User" -> Tautkan NIK, atau otomatis
--    terisi saat user daftar sendiri lewat form Register).
-- ═══════════════════════════════════════════════════════════════
