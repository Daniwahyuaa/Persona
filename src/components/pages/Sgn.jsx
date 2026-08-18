import { useState } from 'react'
import Topbar from '../Topbar.jsx'
import Icon from '../Icon.jsx'
import CoachingSession from './CoachingSession.jsx'

const SGN_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLScn1FdDHRL6lJs7bHp_LCHnMK1JlzbB9zQsUOV9fO00AhPFBA/viewform?usp=dialog'

// Kartu 1 sesi (Pre Coaching / Coaching Session). `onOpen` bisa membuka link
// eksternal di tab baru (Pre Coaching) ATAU pindah ke halaman form internal
// (Coaching Session) — tergantung yang dikirim dari parent.
function SgnSessionCard({ icon, title, description, onOpen }) {
  return (
    <div className="card" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 40, height: 40, borderRadius: '50%', background: 'rgba(26,110,60,.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <Icon name={icon} size={19} strokeWidth={2} style={{ color: 'var(--accent)' }} />
          </div>
          <div style={{ fontFamily: 'var(--font-d)', fontSize: 15.5, color: 'var(--text)' }}>{title}</div>
        </div>
        <button
          type="button"
          onClick={onOpen}
          title="Buka"
          aria-label={`Buka — ${title}`}
          style={{
            width: 32, height: 32, borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff',
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <Icon name="externalLink" size={15} strokeWidth={2.4} />
        </button>
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.7, margin: 0 }}>{description}</p>
    </div>
  )
}

export default function Sgn() {
  // 'menu' = daftar 2 kartu (Pre Coaching / Coaching Session),
  // 'coaching-session' = form Coaching Session (lihat CoachingSession.jsx).
  const [view, setView] = useState('menu')

  if (view === 'coaching-session') {
    return <CoachingSession onBack={() => setView('menu')} />
  }

  return (
    <div>
      <Topbar title="SGN Conext" />
      <div className="content">
        <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.7, maxWidth: 640, marginBottom: 16 }}>
          Isi aspirasi diri dan data terkait lainnya melalui SGN Conext. Pilih sesi yang sesuai lalu klik ikon{' '}
          <Icon name="externalLink" size={12} strokeWidth={2.4} style={{ verticalAlign: -1 }} /> untuk membukanya.
        </p>
        <div className="two-col" style={{ maxWidth: 720 }}>
          <SgnSessionCard
            icon="clock"
            title="Pre Coaching"
            description="Isian sebelum sesi coaching berlangsung — aspirasi diri, catatan awal, dan data pendukung lainnya."
            onOpen={() => window.open(SGN_URL, '_blank')}
          />
          <SgnSessionCard
            icon="messageSquare"
            title="Coaching Session"
            description="Isian & catatan selama/setelah sesi coaching berlangsung — data coach, coachee, hasil diskusi, dan rencana aktivitas, langsung di halaman ini."
            onOpen={() => setView('coaching-session')}
          />
        </div>
      </div>
    </div>
  )
}
