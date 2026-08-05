import { useEffect, useState } from 'react'
import Topbar from '../Topbar.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { supabase } from '../../lib/supabaseClient.js'
import { TOP_HISTORY_RE } from '../../lib/talentProfileApi.js'

const TINGKATAN_OPTIONS = {
  development: ['Internal', 'Eksternal', 'Sertifikasi'],
  project: ['Unit Kerja', 'Direktorat', 'Korporat', 'Lintas Perusahaan'],
  awarding: ['Unit Kerja', 'Direktorat', 'Korporat', 'Nasional'],
}

function currentYearOptions() {
  const now = new Date().getFullYear()
  return Array.from({ length: 6 }, (_, i) => now - i)
}

export default function EditProfile() {
  const { user } = useAuth()

  const [photoPreview, setPhotoPreview] = useState(null)

  const [kategori, setKategori] = useState('recent')
  const [tipe, setTipe] = useState('development')
  const [tingkatan, setTingkatan] = useState(TINGKATAN_OPTIONS.development[0])
  const [tahun, setTahun] = useState(currentYearOptions()[0])
  const [ongoing, setOngoing] = useState(false)
  const [achievement, setAchievement] = useState('')

  const [queue, setQueue] = useState([])
  const [saved, setSaved] = useState([])
  const [loadingSaved, setLoadingSaved] = useState(true)
  const [saveStatus, setSaveStatus] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user?.nik) {
      setLoadingSaved(false)
      return
    }
    supabase
      .from('employee_history')
      .select('*')
      .eq('nik', user.nik)
      .eq('hidden', false)
      .order('tahun', { ascending: false })
      .then(({ data }) => setSaved(data || []))
      .finally(() => setLoadingSaved(false))
  }, [user?.nik])

  function handlePhotoSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoPreview(URL.createObjectURL(file))
  }

  function handleTipeChange(v) {
    setTipe(v)
    setTingkatan(TINGKATAN_OPTIONS[v][0])
    setOngoing(false)
  }

  const maxRecent = 4
  const maxTop = 1
  const recentCount = queue.filter((q) => q.kategori === 'recent').length + saved.filter((s) => !s.isTop).length
  const topCount = queue.filter((q) => q.kategori === 'top').length

  function handleAddToQueue() {
    if (!achievement.trim()) return
    if (kategori === 'recent' && recentCount >= maxRecent) return
    if (kategori === 'top' && topCount >= maxTop) return
    setQueue((q) => [
      ...q,
      { id: Date.now(), kategori, tipe, tingkatan, tahun, ongoing: tipe === 'project' ? ongoing : false, achievement },
    ])
    setAchievement('')
  }

  function removeFromQueue(id) {
    setQueue((q) => q.filter((it) => it.id !== id))
  }

  async function handleSaveAll() {
    if (queue.length === 0) {
      setSaveStatus('Tidak ada perubahan baru untuk disimpan.')
      return
    }
    if (!user?.nik) {
      setSaveStatus('NIK belum terhubung ke akun Anda — hubungi admin.')
      return
    }
    setSaving(true)
    setSaveStatus('')
    try {
      const rows = queue.map((q) => {
        let achievement = q.ongoing ? `${q.achievement} (berjalan)` : q.achievement
        // Tandai item "Top History" dengan suffix, disalin persis dari
        // TP_TOP_RE di index.html asli — supaya Talent Profile bisa memisahkan
        // item ini ke kartu "Top X" tanpa perlu kolom baru di database.
        if (q.kategori === 'top') achievement = `${achievement} (Top History)`
        return {
          nik: user.nik,
          kategori: q.tipe,
          achievement,
          tingkatan: q.tingkatan,
          tahun: q.tahun,
          sumber: 'self',
        }
      })
      const { error } = await supabase.from('employee_history').insert(rows)
      if (error) throw error
      setSaved((s) => [...rows.map((r) => ({ ...r, id: Math.random() })), ...s])
      setQueue([])
      setSaveStatus('Tersimpan! Riwayat baru akan tampil di Talent Profile Anda.')
    } catch (err) {
      setSaveStatus(err.message || 'Gagal menyimpan. Hubungi admin.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Topbar title="Edit Profile" />
      <div className="content">
        {/* FOTO PROFIL */}
        <div className="card" style={{ maxWidth: 620 }}>
          <div className="card-title">Foto Profil</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 6 }}>
            <div
              style={{
                width: 84, height: 84, borderRadius: '50%', background: 'var(--bg3)', border: '1.5px solid var(--border2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0,
              }}
            >
              {photoPreview ? (
                <img src={photoPreview} alt="Foto profil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 11, color: '#dc2626' }}>Belum ada foto</span>
              )}
            </div>
            <div>
              <input type="file" id="ep-photo-input" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoSelect} />
              <button
                onClick={() => document.getElementById('ep-photo-input').click()}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid var(--border2)', background: 'var(--bg2)', color: 'var(--text)', fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
              >
                Pilih Foto
              </button>
              <button
                onClick={() => setPhotoPreview(null)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid var(--border2)', background: 'transparent', color: 'var(--danger)', fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', marginLeft: 6 }}
              >
                Hapus Foto
              </button>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                JPG/PNG, otomatis dikompres. Klik "Simpan" di bawah untuk menerapkan. Kalau tidak ada foto, tampilan
                default adalah inisial nama.
              </div>
            </div>
          </div>
        </div>

        {/* TAMBAH EMPLOYEE HISTORY */}
        <div className="card" style={{ maxWidth: 620 }}>
          <div className="card-title">Tambah Employee History</div>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
            Tambahkan riwayat pengembangan diri, keterlibatan proyek, atau penghargaan yang belum tercatat. Setelah
            disimpan, otomatis muncul di Talent Profile Anda. Maksimal <strong>5 riwayat</strong> per pengiriman:{' '}
            <strong>4 kegiatan 5 tahun terakhir</strong> + <strong>1 Top History</strong> (kegiatan unggulan).
          </p>

          <div className="login-field" style={{ margin: '0 0 10px' }}>
            <label>Kategori</label>
            <select value={kategori} onChange={(e) => setKategori(e.target.value)}>
              <option value="recent">Kegiatan 5 Tahun Terakhir (maks. 4)</option>
              <option value="top">Top History — Kegiatan Unggulan (maks. 1)</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div className="login-field" style={{ margin: 0 }}>
              <label>Jenis</label>
              <select value={tipe} onChange={(e) => handleTipeChange(e.target.value)}>
                <option value="development">Development (Pengembangan Diri)</option>
                <option value="project">Project Involvement</option>
                <option value="awarding">Awarding (Penghargaan)</option>
              </select>
            </div>
            <div className="login-field" style={{ margin: 0 }}>
              <label>Tingkatan</label>
              <select value={tingkatan} onChange={(e) => setTingkatan(e.target.value)}>
                {TINGKATAN_OPTIONS[tipe].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="login-field" style={{ margin: 0 }}>
              <label>Tahun</label>
              <select value={tahun} onChange={(e) => setTahun(Number(e.target.value))}>
                {currentYearOptions().map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {tipe === 'project' && (
            <div className="login-field" style={{ margin: '0 0 12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', textTransform: 'none', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={ongoing}
                  onChange={(e) => setOngoing(e.target.checked)}
                  style={{ width: 15, height: 15, margin: 0, cursor: 'pointer' }}
                />
                Proyek masih berjalan s.d. saat ini (Tahun di atas = tahun mulai)
              </label>
            </div>
          )}

          <div className="login-field" style={{ margin: '0 0 12px' }}>
            <label>Nama Kegiatan / Pencapaian</label>
            <input
              type="text"
              value={achievement}
              onChange={(e) => setAchievement(e.target.value)}
              placeholder="Contoh: Sertifikasi Project Management Professional (PMP)"
            />
          </div>

          <button
            onClick={handleAddToQueue}
            style={{ padding: '9px 16px', borderRadius: 8, border: '1.5px solid var(--accent)', background: 'transparent', color: 'var(--accent)', fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', marginBottom: 14 }}
          >
            + Tambah ke Daftar
          </button>

          {queue.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 8 }}>
                Belum disimpan — klik "Simpan Semua Perubahan" di bawah
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {queue.map((q) => (
                  <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', border: '1px solid var(--border2)', borderRadius: 8, fontSize: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{q.achievement}{q.ongoing ? ' (berjalan)' : ''}</div>
                      <div style={{ color: 'var(--dim)', fontSize: 10.5 }}>{q.tingkatan} · {q.tahun} · {q.kategori === 'top' ? 'Top History' : 'Kegiatan Terakhir'}</div>
                    </div>
                    <button onClick={() => removeFromQueue(q.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 12 }}>Hapus</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 8, marginTop: 6 }}>
            Riwayat yang Sudah Tersimpan
          </div>
          {loadingSaved ? (
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>Memuat…</div>
          ) : saved.length === 0 ? (
            <div style={{ color: '#dc2626', fontSize: 12 }}>Belum ada riwayat tersimpan</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {saved.map((s) => {
                const isTop = TOP_HISTORY_RE.test(s.achievement || '')
                const cleanAchievement = (s.achievement || '').replace(TOP_HISTORY_RE, '')
                return (
                  <div key={s.id} style={{ fontSize: 12, borderBottom: '1px solid var(--border2)', paddingBottom: 6 }}>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {cleanAchievement}
                      {isTop && <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>Top</span>}
                    </div>
                    <div style={{ color: 'var(--dim)', fontSize: 10.5 }}>{s.kategori} · {s.tingkatan || ''} {s.tahun ? `· ${s.tahun}` : ''}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="card" style={{ maxWidth: 620, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={handleSaveAll}
            disabled={saving}
            style={{ padding: '11px 22px', borderRadius: 9, border: 'none', background: 'var(--accent)', color: '#fff', fontFamily: 'var(--font-b)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}
          >
            {saving ? 'Menyimpan...' : 'Simpan Semua Perubahan'}
          </button>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{saveStatus}</span>
        </div>
      </div>
    </div>
  )
}
