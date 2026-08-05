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

export default function NineBox() {
  return (
    <div>
      <Topbar title="Kategori 9Box" />
      <div className="content">
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
  )
}
