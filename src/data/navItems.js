// Daftar menu sidebar, dikelompokkan per section, meniru struktur HTML asli
// dan fungsi applyRoleAccess() di index.html/Code.gs.
//
// roles: daftar role yang boleh LIHAT menu ini. Kalau field ini tidak diisi,
// artinya menu itu terbuka untuk SEMUA role (superadmin, admin, executive, user).

const ALL_ROLES = ['superadmin', 'admin', 'executive', 'user']

export const navSections = [
  {
    id: 'section-user',
    label: 'User',
    items: [
      { id: 'tp', label: 'Talent Profile', icon: 'user', roles: ALL_ROLES },
      { id: 'asesmen', label: 'Asesmen', icon: 'checkSquare', roles: ALL_ROLES },
      { id: 'kompetensi', label: 'CLI', icon: 'target', roles: ALL_ROLES },
      { id: 'kamus', label: 'Kamus Kompetensi', icon: 'book', roles: ALL_ROLES },
      { id: '9box', label: 'Kategori 9Box', icon: 'grid', roles: ALL_ROLES },
      // Edit Profile: dulu hanya untuk role 'user' (self-service tambah riwayat +
      // foto sendiri). Sekarang admin & superadmin juga punya NIK/riwayat sendiri
      // yang mau diisi, jadi menu ini dibuka untuk mereka juga.
      { id: 'editprofile', label: 'Edit Profile', icon: 'edit', roles: ['user', 'admin', 'superadmin'] },
      { id: 'sgn', label: 'SGN Conext', icon: 'clock', roles: ALL_ROLES },
    ],
  },
  {
    id: 'section-admin',
    label: 'Admin',
    // Section ini tampak untuk superadmin/admin/executive (item di dalamnya
    // difilter lagi masing-masing; executive hanya kebagian "Talent Source").
    roles: ['superadmin', 'admin', 'executive'],
    items: [
      { id: 'ts', label: 'Talent Source', icon: 'grid', roles: ['superadmin', 'admin', 'executive'] },
      { id: 'mu', label: 'Talent Point System', icon: 'users', roles: ['superadmin', 'admin'] },
      { id: 'successor', label: 'Talent Match Up', icon: 'userCheck', roles: ['superadmin', 'admin'] },
      { id: 'tdev', label: 'Talent Development', icon: 'barChart', roles: ['superadmin', 'admin'] },
    ],
  },
  {
    id: 'section-data',
    label: 'Data',
    roles: ['superadmin', 'admin'],
    items: [
      { id: 'upload', label: 'Upload Excel', icon: 'upload', action: 'openUploadModal', roles: ['superadmin', 'admin'] },
    ],
  },
  {
    id: 'section-akun',
    label: 'Akun',
    roles: ['superadmin', 'admin'],
    items: [
      // Kelola User: admin & superadmin (admin bisa reset password user biasa,
      // superadmin bisa reset password admin + ubah role — dibedakan di dalam halamannya).
      { id: 'users', label: 'Kelola User', icon: 'userCog', roles: ['superadmin', 'admin'] },
      { id: 'inbox', label: 'Kotak Masuk', icon: 'inbox', badge: true, roles: ['superadmin', 'admin'] },
    ],
  },
]

// Menu default saat pertama masuk, berbeda per role:
// - user & executive  -> 'tp' (Talent Profile)
// - admin & superadmin -> 'ts' (Talent Source)
export function getDefaultMenu(role) {
  const r = String(role || 'user').toLowerCase()
  return r === 'user' || r === 'executive' ? 'tp' : 'ts'
}

// Ambil section+item yang boleh dilihat role tertentu (dipakai Sidebar).
export function getVisibleNavSections(role) {
  const r = String(role || 'user').toLowerCase()
  return navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.roles || item.roles.includes(r)),
    }))
    .filter((section) => section.items.length > 0)
}

// Cek apakah role tertentu boleh mengakses menu tertentu langsung (dipakai untuk
// guard di MainContent, jaga-jaga kalau activeMenu di-set manual/lewat state lama).
export function canAccessMenu(role, menuId) {
  const r = String(role || 'user').toLowerCase()
  for (const section of navSections) {
    const found = section.items.find((item) => item.id === menuId)
    if (found) return !found.roles || found.roles.includes(r)
  }
  return false
}

// Untuk role 'user': panel pencarian & "Total Karyawan" di Talent Source/Talent
// Profile disembunyikan & data dikunci ke NIK sendiri (lihat komponen terkait).
export function isDataLockedToSelf(role) {
  return String(role || 'user').toLowerCase() === 'user'
}
