-- ─────────────────────────────────────────────────────────────
-- FIX: error "Bucket not found" saat menyimpan Foto Profil.
--
-- Penyebab: kode Edit Profile mengunggah foto ke Supabase Storage
-- bucket bernama "profile-photos" (lihat src/lib/talentProfileApi.js
-- -> uploadProfilePhoto()), tapi bucket itu belum pernah dibuat di
-- project Supabase ini. Ini murni konfigurasi project, bukan bug kode.
--
-- Cara pakai: buka Supabase Dashboard -> SQL Editor -> New query,
-- tempel seluruh isi file ini, lalu Run. Aman dijalankan berkali-kali
-- (idempotent) — sama persis dengan bagian "STORAGE" di schema.sql.
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
