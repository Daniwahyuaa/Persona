-- Migration: izinkan user meng-UPDATE riwayat employee_history MILIK
-- SENDIRI (sumber='self') yang ditambahkan lewat Edit Profile.
--
-- Dipakai untuk fitur toggle Reguler/Top di kolom "Tambah Employee History"
-- pada Edit Profile — supaya status Top sebuah riwayat bisa diganti kapan
-- saja (mis. hari ini ditandai Top, besok mau ditukar jadi Reguler) tanpa
-- perlu hapus lalu isi ulang. Riwayat resmi (sumber='official', dari upload
-- admin) tetap TIDAK bisa diubah user karena kondisi sumber='self' di bawah.
--
-- Tanpa policy ini, UPDATE dari halaman Edit Profile akan diblokir RLS
-- secara diam-diam (baris employee_history sudah ada schema.sql dari
-- deployment sebelumnya belum otomatis punya policy baru ini — jalankan file
-- ini sekali di SQL Editor Supabase).
--
-- Aman dijalankan ulang: "drop policy if exists" dulu supaya tidak gagal
-- kalau migration ini pernah dijalankan sebagian sebelumnya.

drop policy if exists "employee_history: user boleh update riwayat sendiri" on public.employee_history;

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
