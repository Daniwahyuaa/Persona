# Testing (TDD) — Persona

Proyek ini memakai **Vitest** + **React Testing Library** (cocok untuk stack Vite + React yang sudah dipakai).

## Instalasi & menjalankan test

```bash
npm install
npm test            # jalankan semua test sekali (CI-friendly)
npm run test:watch  # mode watch untuk TDD sehari-hari
npm run test:coverage
```

## Struktur test

- `src/test/setup.js` — setup global (matcher `jest-dom`, cleanup DOM, polyfill `matchMedia`, env var dummy untuk Supabase).
- `src/test/mockSupabase.js` — helper mock query-builder Supabase (`from().select().eq()...`) yang bisa dipakai ulang lewat `vi.mock('.../supabaseClient.js', ...)`, supaya komponen/lib yang bicara ke Supabase bisa ditest tanpa koneksi jaringan/DB asli.
- Test logic murni (tanpa render): `src/data/navItems.test.js`, `src/lib/talentProfileApi.test.js`.
- Test komponen (render + interaksi user): `*.test.jsx` di sebelah komponennya (mis. `src/components/pages/NineBox.test.jsx`).

## Cakupan saat ini

Test yang sudah ditulis mencakup **logic inti** (role-access, kalkulasi CLI, split top-history) dan **4 fitur yang baru diubah**:

1. `NineBox.test.jsx` — memastikan matriks 9box tampil di kiri, penjelasan di kanan.
2. `EditProfile.test.jsx` — memastikan batas maksimal 5 riwayat (4 kegiatan terakhir + 1 Top History) benar-benar dipaksa di UI, termasuk saat riwayat lama (tersimpan) sudah ada.
3. `Kamus.test.jsx` — memastikan tab "10 Kompetensi BUMN" / "Kompetensi PTPN Group" dan sub-tab "Soft/Hard Competency" masing-masing punya ikon minimalis.
4. `TalentProfile.CliMini.test.jsx` — memastikan kotak "Diukur" berwarna kuning dan "Tercapai" berwarna hijau muda, dan keduanya berbeda.

## Belum tercakup (rekomendasi lanjutan)

Aplikasi ini punya banyak halaman lain (Users, Successor, TalentPointSystem, TalentSource, TalentDevelopment, Inbox, Sgn, Asesmen, Kompetensi, LoginScreen) serta integrasi Supabase (RLS, edge function `admin-user-actions`) yang belum ditest di sini karena scope-nya besar (masing-masing perlu mock data & skenario role tersendiri). Pola yang sudah dipakai di atas (mock `AuthContext` + `supabaseClient` via `vi.mock`, lalu render dengan React Testing Library) bisa langsung dipakai untuk menambah test halaman-halaman tersebut secara bertahap — silakan lanjutkan dengan pola TDD: tulis test yang gagal dulu untuk perilaku yang diinginkan, baru implementasikan/perbaiki kodenya sampai test tersebut hijau.
