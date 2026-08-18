import Topbar from '../Topbar.jsx'

// Disalin persis dari KAMUS_9BOX_DATA di index.html asli (kamusRenderNinebox()).
const KAMUS_9BOX_DATA = [
  {
    label: 'Talenta berpotensi tinggi',
    en: 'High Potential',
    bg: '#c8f5d0',
    border: '#2f9e44',
    desc: 'Talenta yang memiliki kapabilitas dan kinerja yang unggul dan mampu mengoptimalkan ke dalam pekerjaan sehari-hari sehingga merupakan kandidat utama yang akan diberikan tanggung jawab lebih tinggi agar dapat mengembangkan kapabilitasnya.',
  },
  {
    label: 'Talenta berbakat',
    en: 'Promotable',
    bg: '#cfe2fb',
    border: '#3b5bdb',
    desc: 'Talenta yang memiliki kapabilitas dan kinerja sesuai standar yang ditetapkan namun masih terdapat area pengembangan sehingga dapat dipertimbangkan untuk diberikan tanggung jawab yang lebih tinggi.',
  },
  {
    label: 'Talenta penyokong',
    en: 'Solid Contributor',
    bg: '#fbf6c4',
    border: '#c9a227',
    desc: 'Talenta yang memiliki kinerja yang sesuai/melebihi standar yang ditetapkan secara konsisten, namun memiliki kapabilitas yang masih di bawah standar yang telah ditetapkan.',
  },
  {
    label: 'Talenta belum optimal',
    en: 'Sleeping Tiger',
    bg: '#fde3c8',
    border: '#d9822b',
    desc: 'Talenta yang kapabilitasnya memenuhi/melebihi standar yang ditetapkan, namun memiliki kinerja yang masih di bawah standar yang telah ditetapkan.',
  },
  {
    label: 'Talenta yang tidak sesuai',
    en: 'Unfit',
    bg: '#e3e3e3',
    border: '#6b7280',
    desc: 'Talenta yang memiliki kapabilitas dan kinerja yang belum memenuhi standar yang ditetapkan dan kurang sesuai dengan kebutuhan organisasi sehingga perlu mendapat perhatian khusus terkait kontribusinya terhadap organisasi.',
  },
]

// Grid referensi 9-Box (9 sel tetap + legenda) — sama persis dengan yang
// dipakai di kartu "Hasil Asesmen Terakhir" pada halaman Talent Profile,
// supaya konsisten di seluruh aplikasi.
const NINEBOX_GRID = [
  { roman: 'V', bg: '#fde3c8', border: '#d9822b' },
  { roman: 'II', bg: '#cfe2fb', border: '#3b5bdb' },
  { roman: 'I', bg: '#c8f5d0', border: '#2f9e44' },
  { roman: 'VI', bg: '#fde3c8', border: '#d9822b' },
  { roman: 'IV', bg: '#cfe2fb', border: '#3b5bdb' },
  { roman: 'III', bg: '#cfe2fb', border: '#3b5bdb' },
  { roman: 'IX', bg: '#e3e3e3', border: '#6b7280' },
  { roman: 'VIII', bg: '#fbf6c4', border: '#c9a227' },
  { roman: 'VII', bg: '#fbf6c4', border: '#c9a227' },
]
const NINEBOX_LEGEND = [
  { label: 'High Potential', bg: '#c8f5d0', border: '#2f9e44' },
  { label: 'Promotable', bg: '#cfe2fb', border: '#3b5bdb' },
  { label: 'Solid Contributor', bg: '#fbf6c4', border: '#c9a227' },
  { label: 'Sleeping Tiger', bg: '#fde3c8', border: '#d9822b' },
  { label: 'Unfit', bg: '#e3e3e3', border: '#6b7280' },
]

function NineBoxGridPanel() {
  return (
    <div className="card" style={{ position: 'sticky', top: 14 }}>
      <div className="card-title">9-Box Talent Grid</div>
      <div style={{ display: 'flex', gap: 6 }}>
        <div
          style={{
            writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: 9, fontWeight: 700,
            color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          Capacity
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="tp-nb-grid">
            {NINEBOX_GRID.map((cell, i) => (
              <div
                key={i}
                style={{
                  background: cell.bg, border: `1.5px solid ${cell.border}`, borderRadius: 7,
                  minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 800, color: cell.border }}>{cell.roman}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
            Performance
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '5px 12px', fontSize: 10 }}>
        {NINEBOX_LEGEND.map((l) => (
          <div key={l.label} className="tp-nb-legend-item">
            <span className="tp-nb-legend-dot" style={{ background: l.bg, border: `1.3px solid ${l.border}` }} />
            <span>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function NineBox() {
  return (
    <div>
      <Topbar title="Kategori 9Box" />
      <div className="content">
        <div className="nb-layout">
          <NineBoxGridPanel />

          <div>
            <div className="card" style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6 }}>
                Dalam melakukan penilaian, Divisi SDM Perusahaan Induk menggunakan pemetaan Talenta 9Box terhadap 2 (dua)
                sumbu yaitu X (kinerja) dan Y (kapabilitas), dengan hasil klasifikasi Talenta yang dituangkan dalam 5
                (lima) kategori sebagai berikut:
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {KAMUS_9BOX_DATA.map((c, idx) => (
                <div key={c.en} className="card" style={{ borderLeft: `4px solid ${c.border}`, marginBottom: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span
                      style={{
                        width: 26, height: 26, borderRadius: '50%', background: c.bg, border: `1.5px solid ${c.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800,
                        color: c.border, flexShrink: 0,
                      }}
                    >
                      {idx + 1}
                    </span>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>
                      {c.label}{' '}
                      <span style={{ fontStyle: 'italic', fontWeight: 500, color: 'var(--muted)' }}>({c.en})</span>
                    </div>
                  </div>
                  <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6, marginLeft: 36 }}>{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
