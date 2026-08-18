-- ═══════════════════════════════════════════════════════════════
-- DIAGNOSA: "new row violates row-level security policy for table
-- employee_history"
-- ═══════════════════════════════════════════════════════════════

-- 1) Apakah RLS aktif & policy INSERT untuk employee_history sudah ada?
select polname, polcmd, pg_get_expr(polwithcheck, polrelid) as with_check
from pg_policy
where polrelid = 'public.employee_history'::regclass;

-- Kalau hasil di atas TIDAK ada baris dengan polcmd = 'a' (insert)
-- bernama "employee_history: user boleh tambah riwayat sendiri",
-- itu penyebabnya -> lanjut ke bagian FIX di bawah.

-- 2) Cek apakah profiles.nik user yang login SUDAH terisi & cocok
--    dengan karyawan.nik (ganti 'NIK_USER' dengan NIK yang gagal simpan).
select p.id, p.username, p.role, p.nik as profiles_nik, k.nik as karyawan_nik
from public.profiles p
left join public.karyawan k on k.nik = p.nik
where p.nik = 'NIK_USER';
-- Kalau profiles_nik NULL/kosong, atau tidak ketemu baris karyawan yang
-- cocok -> itu juga akan bikin INSERT ditolak RLS (nik tidak match).