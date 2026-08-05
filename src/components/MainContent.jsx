import { navSections } from '../data/navItems.js'
import EmptyState from './EmptyState.jsx'
import TalentProfile from './TalentProfile.jsx'
import Asesmen from './pages/Asesmen.jsx'
import Kompetensi from './pages/Kompetensi.jsx'
import Kamus from './pages/Kamus.jsx'
import NineBox from './pages/NineBox.jsx'
import EditProfile from './pages/EditProfile.jsx'
import Sgn from './pages/Sgn.jsx'
import TalentSource from './pages/TalentSource.jsx'
import TalentPointSystem from './pages/TalentPointSystem.jsx'
import Successor from './pages/Successor.jsx'
import TalentDevelopment from './pages/TalentDevelopment.jsx'
import Users from './pages/Users.jsx'
import Inbox from './pages/Inbox.jsx'

function findMenuLabel(menuId) {
  for (const section of navSections) {
    const found = section.items.find((item) => item.id === menuId)
    if (found) return found.label
  }
  return menuId
}

// Semua menu sudah punya UI (mengikuti struktur index.html asli persis, dari
// Talent Profile s.d. Kotak Masuk). Setiap komponen mengatur topbar-nya sendiri
// (via <Topbar> atau markup .topbar manual), jadi MainContent tidak lagi
// membungkus dengan page-header generik.
const BUILT_MENUS = {
  tp: TalentProfile,
  asesmen: Asesmen,
  kompetensi: Kompetensi,
  kamus: Kamus,
  '9box': NineBox,
  editprofile: EditProfile,
  sgn: Sgn,
  ts: TalentSource,
  mu: TalentPointSystem,
  successor: Successor,
  tdev: TalentDevelopment,
  users: Users,
  inbox: Inbox,
}

export default function MainContent({ activeMenu }) {
  const label = findMenuLabel(activeMenu)
  const BuiltComponent = BUILT_MENUS[activeMenu]

  if (BuiltComponent) {
    return <BuiltComponent />
  }

  return (
    <div className="content">
      <div className="page-header">
        <div className="page-header-left">
          <h2>{label}</h2>
          <p>Halaman ini akan dibangun pada tahap berikutnya.</p>
        </div>
      </div>
      <EmptyState
        icon="🧩"
        title={`Konten "${label}" belum dibuat`}
        subtitle="Kita akan mengisi menu ini satu per satu setelah kerangka (shell) selesai."
      />
    </div>
  )
}
