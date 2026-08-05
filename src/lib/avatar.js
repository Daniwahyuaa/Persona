// Disalin persis dari fungsi initials()/avatarColor() di index.html asli.
// Dipakai untuk avatar bulat (inisial + warna otomatis) di badge "Selamat Datang".

const AVATAR_COLORS = ['#1a6e3c', '#1a4f7a', '#d97706', '#7c3aed', '#c0392b', '#0891b2']

export function avatarColor(n) {
  let h = 0
  for (const x of n || '') h = (h + x.charCodeAt(0)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}

export function initials(n) {
  return (n || '?')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}
