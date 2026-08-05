import Topbar from '../Topbar.jsx'
import Icon from '../Icon.jsx'

const SGN_URL =
  'https://script.google.com/macros/s/AKfycbwdHjLa5WsZoz1Eua5jq12WJ-E5PWy5DvEn5HSUB2aOWAr5A72VVKlZcsISwe78xKoq/exec'

export default function Sgn() {
  return (
    <div>
      <Topbar title="SGN Conext" />
      <div className="content">
        <div className="card" style={{ textAlign: 'center', padding: '60px 30px', maxWidth: 560, margin: '40px auto' }}>
          <div
            style={{
              width: 64, height: 64, borderRadius: '50%', background: 'rgba(26,110,60,.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px',
            }}
          >
            <Icon name="externalLink" size={30} strokeWidth={2} style={{ color: 'var(--accent)' }} />
          </div>
          <div style={{ fontFamily: 'var(--font-d)', fontSize: 20, color: 'var(--text)', marginBottom: 8 }}>
            SGN Conext
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 20 }}>
            Isi aspirasi diri dan data terkait lainnya melalui SGN Conext. Klik tombol di bawah untuk membukanya di
            tab baru.
          </p>
          <button
            onClick={() => window.open(SGN_URL, '_blank')}
            style={{
              padding: '11px 24px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8,
              fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', display: 'inline-flex',
              alignItems: 'center', gap: 8,
            }}
          >
            Buka SGN Conext
            <Icon name="externalLink" size={15} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  )
}
