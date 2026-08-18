-- ═══════════════════════════════════════════════════════════════
-- PERSONA — Skema Supabase (pengganti Google Sheets di Code.gs)
-- Jalankan di: Supabase Dashboard -> SQL Editor -> New query -> Run
-- ═══════════════════════════════════════════════════════════════

-- 1) PROFILES — nama & role user, terhubung ke auth.users Supabase
--    (auth.users bawaan Supabase tidak bisa ditambah kolom custom,
--    jadi role/nama/username disimpan di tabel terpisah ini).
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,           -- opsional, hanya label tampilan (bagian sebelum @ dari email)
  nama text,
  role text not null default 'user' check (role in ('superadmin','admin','executive','user')),
  nik text,                -- dipakai untuk LOGIN (pengganti email) & filter data milik sendiri kalau role='user'
  failed_login_attempts int not null default 0,  -- reset ke 0 setiap kali login berhasil
  locked boolean not null default false,          -- true setelah 3x gagal login berturut-turut
  locked_at timestamptz,                          -- kapan akun dikunci, buat referensi admin
  created_at timestamptz not null default now()
);

-- Jaga-jaga kalau tabel profiles sudah pernah dibuat sebelum kolom-kolom ini ada.
alter table public.profiles add column if not exists failed_login_attempts int not null default 0;
alter table public.profiles add column if not exists locked boolean not null default false;
alter table public.profiles add column if not exists locked_at timestamptz;

-- NIK harus unik supaya lookup email-berdasar-NIK saat login tidak ambigu.
create unique index if not exists profiles_nik_unique_idx on public.profiles (nik) where nik is not null;

-- Trigger: setiap kali ada user BARU daftar sendiri lewat supabase.auth.signUp(),
-- otomatis buat baris profiles dengan role default 'user'. Admin tinggal ubah
-- role & isi NIK-nya lewat Table Editor setelah itu.
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

-- 2) KARYAWAN — pengganti sheet "Database"
create table if not exists public.karyawan (
  nik text primary key,
  nama text,
  posisi text,
  grup text,               -- GRUP_JOB_FUNCTION
  level_jabatan text,
  jenis_kelamin text,
  usia numeric,
  pendidikan text,
  golongan text,
  unit_kerja text,
  sanksi text,
  waktu_sanksi date,
  tgl_lahir date,
  aspirasi text,
  alasan text,
  ninebox text,
  foto_url text,            -- URL foto profil (disimpan di storage bucket 'profile-photos'), diisi lewat Edit Profile
  updated_at timestamptz not null default now()
);

-- Jaga-jaga kalau tabel karyawan sudah pernah dibuat sebelum kolom foto_url ada.
alter table public.karyawan add column if not exists foto_url text;

-- 3) ASESMEN — pengganti sheet "Asesmen"
create table if not exists public.asesmen (
  id bigint generated always as identity primary key,
  nik text references public.karyawan(nik),
  tipe_asesmen text,
  tanggal date,
  lembaga text,
  ninebox text,
  hasil_asesmen text
);

-- 4) CLI (Soft & Hard) — format panjang: 1 baris = 1 kompetensi per karyawan
create table if not exists public.cli_soft (
  id bigint generated always as identity primary key,
  nik text references public.karyawan(nik),
  nama_kompetensi text not null,
  hasil smallint check (hasil in (0,1))
);

create table if not exists public.cli_hard (
  id bigint generated always as identity primary key,
  nik text references public.karyawan(nik),
  nama_kompetensi text not null,
  hasil smallint check (hasil in (0,1)),
  nilai text  -- teks "tercapai" / "tidak tercapai" (pelengkap kolom hasil)
);

-- 5) KPI — format panjang: 1 baris = 1 tahun per karyawan (pengganti kolom
--    "KPI 2023/2024/2025..." yang melebar ke kanan di sheet lama)
create table if not exists public.kpi (
  id bigint generated always as identity primary key,
  nik text references public.karyawan(nik),
  tahun int not null,
  skor numeric,
  perf_rating text,
  unique (nik, tahun)
);

-- 6) EMPLOYEE HISTORY — gabungan Development / Project Involvement / Awarding
--    (pengganti 3 sheet terpisah yang formatnya sama: NIK + beberapa entri
--    Achievement/Tingkatan/Tahun). Kategori 'job_rotation' TIDAK dipakai lagi
--    di sini — Career Journey sekarang bersumber dari tabel job_rotation (6c)
--    di bawah, format aslinya (1 baris = 1 periode jabatan, sesuai upload CSV).
create table if not exists public.employee_history (
  id bigint generated always as identity primary key,
  nik text references public.karyawan(nik),
  kategori text not null check (kategori in ('job_rotation','development','project','awarding')),
  achievement text,
  tingkatan text,
  tahun int,
  sumber text not null default 'official' check (sumber in ('official','self')), -- 'self' = isian sendiri via Edit Profile
  hidden boolean not null default false, -- dulu di sheet HiddenHistory
  created_at timestamptz not null default now()
);

-- 6b) NINE BOX — pengganti sheet "Sumber 9box" (kategori 9-Box resmi per NIK,
--     dipakai getTalentProfile() sebagai sumber utama; kolom karyawan.ninebox
--     hanya fallback kalau baris ini belum ada).
create table if not exists public.nine_box (
  id bigint generated always as identity primary key,
  nik text references public.karyawan(nik),
  box_label text, -- contoh: 'HIGH POTENTIAL','PROMOTABLE','SOLID CONTRIBUTOR','SLEEPING TIGER','UNFIT'
  updated_at timestamptz not null default now(),
  unique (nik)
);

-- 6c) JOB ROTATION — sumber Career Journey di Talent Profile. 1 baris = 1
--     periode jabatan seorang karyawan (sesuai kolom persis job_rotation.csv).
--     Diurutkan berdasar tanggal_mulai terbaru dulu saat ditampilkan.
create table if not exists public.job_rotation (
  id bigint generated always as identity primary key,
  nik text references public.karyawan(nik),
  nama text,
  level_jabatan text,
  posisi text,
  unit_kerja text,
  personnel_area text,
  employee_group text,
  payroll_area text,
  job_group text,
  masa_jabatan text,        -- contoh: '01 th', '10 bln'
  action_type text,
  reason_for_action text,
  tanggal_mulai date,
  tanggal_selesai date,      -- '9999-12-31' berarti masih berjalan/posisi saat ini
  created_at timestamptz not null default now()
);

-- 7) FORMULA — pengganti sheet "Formula" (bobot Talent Point System)
create table if not exists public.formula (
  id bigint generated always as identity primary key,
  komponen text not null,   -- key: cli / kpi / ninebox / asesmen / dst.
  label text,
  deskripsi text,
  bobot numeric,            -- persen
  tier_nilai text,
  poin_dasar numeric,
  keterangan_tier text,
  urutan int
);

-- 8) REQUESTS — pengganti sheet "Requests" (helpdesk / pendaftaran user baru)
create table if not exists public.requests (
  id bigint generated always as identity primary key,
  tipe text,
  identitas text,
  nama text,
  email text,
  catatan text,
  -- Catatan: nilai status di database yang sebenarnya sudah lama dipakai
  -- ('Baru','Diproses','Selesai', dst) — ikuti constraint yang SUDAH ADA di
  -- project Supabase kamu (lihat pg_constraint), jangan asal timpa ke sini.
  status text not null default 'Baru',
  created_at timestamptz not null default now()
);

-- Jaga-jaga kalau tabel requests sudah pernah dibuat sebelum kolom email ada
-- (mis. sudah pernah dijalankan sebelum fitur Helpdesk -> Kotak Masuk ini ada).
alter table public.requests add column if not exists email text;

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS) — dasar. Sesuaikan lagi sesuai kebutuhan.
-- ─────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.karyawan enable row level security;
alter table public.asesmen enable row level security;
alter table public.cli_soft enable row level security;
alter table public.cli_hard enable row level security;
alter table public.kpi enable row level security;
alter table public.employee_history enable row level security;
alter table public.nine_box enable row level security;
alter table public.job_rotation enable row level security;
alter table public.formula enable row level security;
alter table public.requests enable row level security;

-- Semua user yang sudah login boleh baca profil sendiri
create policy "profiles: baca profil sendiri" on public.profiles
  for select using (auth.uid() = id);

-- Helper: cek role user yang sedang login
create or replace function public.current_role() returns text
language sql security definer stable as $$
  select role from public.profiles where id = auth.uid();
$$;

-- superadmin/admin/executive boleh baca SEMUA data karyawan & turunannya;
-- role 'user' hanya boleh baca baris dengan NIK miliknya sendiri (profiles.nik).
create policy "karyawan: admin baca semua, user baca nik sendiri" on public.karyawan
  for select using (
    public.current_role() in ('superadmin','admin','executive')
    or nik = (select nik from public.profiles where id = auth.uid())
  );

create policy "asesmen: admin baca semua, user baca nik sendiri" on public.asesmen
  for select using (
    public.current_role() in ('superadmin','admin','executive')
    or nik = (select nik from public.profiles where id = auth.uid())
  );

create policy "cli_soft: admin baca semua, user baca nik sendiri" on public.cli_soft
  for select using (
    public.current_role() in ('superadmin','admin','executive')
    or nik = (select nik from public.profiles where id = auth.uid())
  );

create policy "cli_hard: admin baca semua, user baca nik sendiri" on public.cli_hard
  for select using (
    public.current_role() in ('superadmin','admin','executive')
    or nik = (select nik from public.profiles where id = auth.uid())
  );

create policy "kpi: admin baca semua, user baca nik sendiri" on public.kpi
  for select using (
    public.current_role() in ('superadmin','admin','executive')
    or nik = (select nik from public.profiles where id = auth.uid())
  );

create policy "employee_history: admin baca semua, user baca nik sendiri" on public.employee_history
  for select using (
    public.current_role() in ('superadmin','admin','executive')
    or nik = (select nik from public.profiles where id = auth.uid())
  );

create policy "nine_box: admin baca semua, user baca nik sendiri" on public.nine_box
  for select using (
    public.current_role() in ('superadmin','admin','executive')
    or nik = (select nik from public.profiles where id = auth.uid())
  );

create policy "job_rotation: admin baca semua, user baca nik sendiri" on public.job_rotation
  for select using (
    public.current_role() in ('superadmin','admin','executive')
    or nik = (select nik from public.profiles where id = auth.uid())
  );

-- formula & requests: hanya admin/superadmin
create policy "formula: hanya admin" on public.formula
  for select using (public.current_role() in ('superadmin','admin','executive'));

create policy "requests: hanya admin" on public.requests
  for select using (public.current_role() in ('superadmin','admin'));

-- Form Helpdesk bisa diisi dari layar LOGIN (belum punya sesi/auth sama sekali),
-- jadi insert-nya harus dibuka untuk publik (anon), bukan cuma authenticated.
-- Admin tetap satu-satunya yang bisa MEMBACA (lihat policy select di atas).
create policy "requests: siapa saja boleh kirim permintaan" on public.requests
  for insert
  with check (true);

-- Menulis (insert/update/delete) untuk admin/superadmin saja — tambahkan per tabel
-- sesuai kebutuhan, contoh untuk karyawan:
create policy "karyawan: admin boleh tulis" on public.karyawan
  for all using (public.current_role() in ('superadmin','admin'))
  with check (public.current_role() in ('superadmin','admin'));

-- employee_history: user boleh menambahkan riwayat MILIKNYA SENDIRI lewat menu
-- Edit Profile (kategori development/project/awarding, sumber='self'), admin/
-- superadmin boleh tulis apa saja (termasuk kategori job_rotation dari upload Excel).
-- Tanpa policy ini, INSERT dari halaman Edit Profile akan diblokir RLS secara diam-diam.
create policy "employee_history: user boleh tambah riwayat sendiri" on public.employee_history
  for insert
  with check (
    public.current_role() in ('superadmin','admin')
    or (
      sumber = 'self'
      and nik = (select nik from public.profiles where id = auth.uid())
    )
  );

create policy "employee_history: admin boleh update/hapus" on public.employee_history
  for all using (public.current_role() in ('superadmin','admin'))
  with check (public.current_role() in ('superadmin','admin'));

-- employee_history: user boleh HAPUS riwayat SENDIRI yang ditambahkan lewat
-- Edit Profile (sumber='self') — dipakai tombol "Hapus" di kolom "Tambah
-- Employee History". Riwayat resmi (sumber='official', dari upload admin)
-- tetap TIDAK bisa dihapus user karena kondisi sumber='self' di bawah.
create policy "employee_history: user boleh hapus riwayat sendiri" on public.employee_history
  for delete
  using (
    sumber = 'self'
    and nik = (select nik from public.profiles where id = auth.uid())
  );

-- employee_history: user boleh UPDATE riwayat SENDIRI yang ditambahkan lewat
-- Edit Profile (sumber='self') — dipakai toggle Reguler/Top di kolom "Tambah
-- Employee History" (mis. tukar status Top jadi Reguler atau sebaliknya
-- tanpa perlu hapus lalu isi ulang). Tetap dibatasi ke sumber='self' + nik
-- milik sendiri, sama seperti policy DELETE di atas — riwayat resmi
-- (sumber='official') tidak bisa diubah user.
create policy "employee_history: user boleh update riwayat sendiri" on public.employee_history
  for update
  using (
    sumber = 'self'
    and nik = (select nik from public.profiles where id = auth.uid())
  )
  with check (
    sumber = 'self'
    and nik = (select nik from public.profiles where id = auth.uid())
  );

-- requests: admin/superadmin boleh UPDATE (tandai "Selesai") & HAPUS permintaan
-- di Kotak Masuk. Tanpa policy ini, tombol Selesai/Hapus akan diblokir RLS
-- secara diam-diam meski sudah lolos policy SELECT di atas.
create policy "requests: admin boleh update/hapus" on public.requests
  for all using (public.current_role() in ('superadmin','admin'))
  with check (public.current_role() in ('superadmin','admin'));

-- formula: admin/superadmin boleh UBAH bobot & nilai dasar tiap tier lewat tab
-- Formula (Talent Point System). Tanpa policy ini, UPDATE dari halaman akan
-- diblokir RLS secara diam-diam meski sudah lolos policy SELECT di atas.
create policy "formula: admin boleh update" on public.formula
  for update
  using (public.current_role() in ('superadmin','admin'))
  with check (public.current_role() in ('superadmin','admin'));

-- ─────────────────────────────────────────────────────────────
-- EDIT PROFILE — admin/superadmin boleh update DATA DIRI SENDIRI (grup/unit
-- kerja/level jabatan/golongan/pendidikan) + SEMUA role (termasuk 'user') tetap
-- boleh update foto profil sendiri, lewat menu Edit Profile, dikunci ke baris
-- karyawan yang NIK-nya sama dengan profiles.nik milik akun yang login.
--
-- CATATAN: RLS Postgres tidak bisa membatasi per-kolom, jadi baris di bawah ini
-- tetap mengizinkan UPDATE pada seluruh row milik sendiri secara teknis. Yang
-- membatasi role 'user' agar TIDAK BISA mengubah field Data Diri (grup/unit
-- kerja/level jabatan/golongan/pendidikan) — hanya boleh foto profil — dilakukan
-- di sisi aplikasi: lihat guard role di src/lib/talentProfileApi.js ->
-- updateOwnProfile() dan UI di src/components/pages/EditProfile.jsx. Kolom lain
-- (sanksi, ninebox, dst.) tetap hanya bisa diubah admin lewat policy
-- "karyawan: admin boleh tulis" di atas.
-- ─────────────────────────────────────────────────────────────
drop policy if exists "karyawan: user boleh update profil sendiri" on public.karyawan;
create policy "karyawan: user boleh update profil sendiri" on public.karyawan
  for update
  using (nik = (select nik from public.profiles where id = auth.uid()))
  with check (nik = (select nik from public.profiles where id = auth.uid()));

-- ─────────────────────────────────────────────────────────────
-- LOGIN PAKAI NIK + PEMBATASAN MAKSIMAL 3X GAGAL LOGIN
-- Supabase Auth aslinya hanya mengenal email/phone, jadi 3 fungsi RPC di
-- bawah ini menjembatani login dengan NIK dari layar Login (yang belum
-- punya sesi sama sekali, jadi HARUS bisa dipanggil sebagai anon):
--   1. get_login_email   -> cari email yg terhubung ke NIK + cek status kunci,
--                            supaya browser bisa memanggil signInWithPassword().
--   2. register_failed_login -> catat 1x kegagalan (password salah) untuk NIK
--                            tsb; begitu mencapai 3x, akun otomatis dikunci
--                            (locked = true) sampai di-reset admin/superadmin.
--   3. reset_own_login_attempts -> dipanggil SETELAH login berhasil (sudah
--                            authenticated) untuk menormalkan counter ke 0.
-- SECURITY DEFINER dipakai karena RLS tabel profiles hanya izinkan baca baris
-- sendiri; fungsi²  ini sengaja bypass RLS tapi outputnya dibatasi ketat
-- (cuma email + status kunci, TIDAK ada data lain yang dibocorkan ke anon).
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
-- STORAGE — bucket untuk foto profil.
-- Jalankan bagian ini juga di SQL Editor (storage.objects sudah disediakan
-- Supabase, kita hanya menambah bucket + policy-nya).
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;

-- Semua orang (termasuk publik/anon) boleh MELIHAT foto profil, karena
-- ditampilkan di Talent Profile yang bisa diakses lintas role.
drop policy if exists "profile-photos: baca publik" on storage.objects;
create policy "profile-photos: baca publik" on storage.objects
  for select using (bucket_id = 'profile-photos');

-- User yang login hanya boleh upload/ubah/hapus file dengan nama depan
-- (folder) = NIK miliknya sendiri, contoh path: "10101010/foto.jpg".
-- Ini mencegah satu user mengganti foto profil orang lain lewat Storage API.
drop policy if exists "profile-photos: upload milik sendiri" on storage.objects;
create policy "profile-photos: upload milik sendiri" on storage.objects
  for insert
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select nik from public.profiles where id = auth.uid())
  );

drop policy if exists "profile-photos: update milik sendiri" on storage.objects;
create policy "profile-photos: update milik sendiri" on storage.objects
  for update
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select nik from public.profiles where id = auth.uid())
  );

drop policy if exists "profile-photos: hapus milik sendiri" on storage.objects;
create policy "profile-photos: hapus milik sendiri" on storage.objects
  for delete
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select nik from public.profiles where id = auth.uid())
  );
