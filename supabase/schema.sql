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
  nik text,                -- kalau role='user', dipakai untuk filter data miliknya sendiri; diisi manual oleh admin setelah user daftar
  created_at timestamptz not null default now()
);

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
  insert into public.profiles (id, username, nama, role)
  values (
    new.id,
    split_part(new.email, '@', 1),
    coalesce(new.raw_user_meta_data->>'nama', split_part(new.email, '@', 1)),
    'user'
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
  updated_at timestamptz not null default now()
);

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
  catatan text,
  status text not null default 'pending' check (status in ('pending','resolved')),
  created_at timestamptz not null default now()
);

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
