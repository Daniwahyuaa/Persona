-- ═══════════════════════════════════════════════════════════════
-- PERSONA — Coaching Session (form "Coaching Session" di menu SGN Conext)
-- Meniru struktur sheet "Kolektif" pada
-- 00_Form_Coach_-_SGN_CONEXT.xlsx: 1 form = data Coach (header) +
-- banyak baris Coachee (tabel).
-- Jalankan di: Supabase Dashboard -> SQL Editor -> New query -> Run
-- ═══════════════════════════════════════════════════════════════

-- 1) HEADER — data Coach & unit kerja (1 baris = 1 kali isi form)
create table if not exists public.coaching_sessions (
  id bigint generated always as identity primary key,
  created_by uuid references auth.users(id) on delete set null,
  unit_kerja text,
  coach_nik text,
  coach_nama text,
  coach_jabatan text,
  coach_usia numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) BARIS COACHEE — 1 baris per coachee dalam satu sesi coaching,
--    kolomnya persis mengikuti tabel COACHEE di sheet "Kolektif":
--    NIK SAP, Nama, Jabatan, Waktu, Evaluasi Kinerja, Hasil Diskusi,
--    Topik Lain, Hasil Diskusi, Rencana Aktivitas (Aktivitas + Deskripsi).
create table if not exists public.coaching_session_coachees (
  id bigint generated always as identity primary key,
  session_id bigint not null references public.coaching_sessions(id) on delete cascade,
  coachee_nik text,
  coachee_nama text,
  coachee_jabatan text,
  waktu date,
  evaluasi_kinerja text,
  hasil_diskusi_kinerja text,
  topik_lain text,
  hasil_diskusi_topik text,
  aktivitas text,
  deskripsi_aktivitas text,
  urutan int not null default 0
);

create index if not exists coaching_session_coachees_session_idx
  on public.coaching_session_coachees (session_id);

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────
alter table public.coaching_sessions enable row level security;
alter table public.coaching_session_coachees enable row level security;

-- SELECT: admin/superadmin/executive boleh baca semua sesi; pengisi
-- (coach) hanya boleh baca sesi yang dia buat sendiri.
drop policy if exists "coaching_sessions: admin baca semua, pembuat baca milik sendiri" on public.coaching_sessions;
create policy "coaching_sessions: admin baca semua, pembuat baca milik sendiri" on public.coaching_sessions
  for select using (
    public.current_role() in ('superadmin','admin','executive')
    or created_by = auth.uid()
  );

-- INSERT: siapapun yang sudah login boleh membuat sesi coaching (jadi coach),
-- asal created_by diisi dengan uid dirinya sendiri.
drop policy if exists "coaching_sessions: user login boleh membuat sesi" on public.coaching_sessions;
create policy "coaching_sessions: user login boleh membuat sesi" on public.coaching_sessions
  for insert
  with check (created_by = auth.uid());

-- UPDATE/DELETE: admin/superadmin boleh apa saja; pembuat boleh
-- update/hapus sesi miliknya sendiri (mis. perbaiki data sebelum final).
drop policy if exists "coaching_sessions: admin atau pembuat boleh ubah/hapus" on public.coaching_sessions;
create policy "coaching_sessions: admin atau pembuat boleh ubah/hapus" on public.coaching_sessions
  for update using (
    public.current_role() in ('superadmin','admin')
    or created_by = auth.uid()
  )
  with check (
    public.current_role() in ('superadmin','admin')
    or created_by = auth.uid()
  );

drop policy if exists "coaching_sessions: admin atau pembuat boleh hapus" on public.coaching_sessions;
create policy "coaching_sessions: admin atau pembuat boleh hapus" on public.coaching_sessions
  for delete using (
    public.current_role() in ('superadmin','admin')
    or created_by = auth.uid()
  );

-- coaching_session_coachees: akses mengikuti sesi induknya (session_id ->
-- coaching_sessions.created_by), supaya aturannya konsisten dgn header.
drop policy if exists "coaching_session_coachees: ikut akses sesi induk (select)" on public.coaching_session_coachees;
create policy "coaching_session_coachees: ikut akses sesi induk (select)" on public.coaching_session_coachees
  for select using (
    exists (
      select 1 from public.coaching_sessions s
      where s.id = session_id
        and (
          public.current_role() in ('superadmin','admin','executive')
          or s.created_by = auth.uid()
        )
    )
  );

drop policy if exists "coaching_session_coachees: ikut akses sesi induk (insert)" on public.coaching_session_coachees;
create policy "coaching_session_coachees: ikut akses sesi induk (insert)" on public.coaching_session_coachees
  for insert
  with check (
    exists (
      select 1 from public.coaching_sessions s
      where s.id = session_id
        and (
          public.current_role() in ('superadmin','admin')
          or s.created_by = auth.uid()
        )
    )
  );

drop policy if exists "coaching_session_coachees: ikut akses sesi induk (update/delete)" on public.coaching_session_coachees;
create policy "coaching_session_coachees: ikut akses sesi induk (update/delete)" on public.coaching_session_coachees
  for all using (
    exists (
      select 1 from public.coaching_sessions s
      where s.id = session_id
        and (
          public.current_role() in ('superadmin','admin')
          or s.created_by = auth.uid()
        )
    )
  )
  with check (
    exists (
      select 1 from public.coaching_sessions s
      where s.id = session_id
        and (
          public.current_role() in ('superadmin','admin')
          or s.created_by = auth.uid()
        )
    )
  );
