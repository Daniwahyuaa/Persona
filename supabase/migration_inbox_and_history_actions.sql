-- Migration: dukung tombol "Hapus" di Edit Profile (Tambah Employee History)
-- dan tombol "Selesai"/"Hapus" di Kotak Masuk.
--
-- Jalankan file ini sekali di Supabase SQL Editor pada project yang SUDAH
-- menjalankan supabase/schema.sql sebelumnya. Aman dijalankan berkali-kali
-- (pakai drop policy if exists sebelum create policy).

-- employee_history: user boleh HAPUS riwayat SENDIRI yang ditambahkan lewat
-- Edit Profile (sumber='self'). Riwayat resmi (sumber='official') tetap
-- tidak bisa dihapus user karena kondisi sumber='self' di bawah.
drop policy if exists "employee_history: user boleh hapus riwayat sendiri" on public.employee_history;
create policy "employee_history: user boleh hapus riwayat sendiri" on public.employee_history
  for delete
  using (
    sumber = 'self'
    and nik = (select nik from public.profiles where id = auth.uid())
  );

-- requests: admin/superadmin boleh UPDATE (tandai "Selesai") & HAPUS
-- permintaan di Kotak Masuk.
drop policy if exists "requests: admin boleh update/hapus" on public.requests;
create policy "requests: admin boleh update/hapus" on public.requests
  for all using (public.current_role() in ('superadmin','admin'))
  with check (public.current_role() in ('superadmin','admin'));
