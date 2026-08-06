import { useEffect, useState } from 'react'
import Topbar from '../Topbar.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { supabase } from '../../lib/supabaseClient.js'
import { TOP_HISTORY_RE, uploadProfilePhoto, removeProfilePhoto, updateOwnProfile } from '../../lib/talentProfileApi.js'

const TINGKATAN_OPTIONS = {
  development: ['Internal', 'Eksternal', 'Sertifikasi'],
  project: ['Unit Kerja', 'Direktorat', 'Korporat', 'Lintas Perusahaan'],
  awarding: ['Unit Kerja', 'Direktorat', 'Korporat', 'Nasional'],
}

// Field data diri yang boleh diedit sendiri di kartu "Data Diri" — harus
// selaras dengan SELF_EDITABLE_FIELDS di talentProfileApi.js.
const DATA_DIRI_FIELDS = [
  { key: 'grup', label: 'Grup Job Function' },
  { key: 'unit_kerja', label: 'Unit Kerja' },
  { key: 'level_jabatan', label: 'Level Jabatan' },
  { key: 'golongan', label: 'Golongan' },
  { key: 'pendidikan', label: 'Pendidikan' },
]

function currentYearOptions() {
  const now = new Date().getFullYear()
  return Array.from({ length: 6 }, (_, i) => now - i)
}

export default function EditProfile() {
  const { user } = useAuth()

  // -- Foto profil --
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [savedFotoUrl, setSavedFotoUrl] = useState(null)
  const [photoStatus, setPhotoStatus] = useState('')
  const [savingPhoto, setSavingPhoto] = useState(false)

  // -- Data diri (NIK + field yang boleh diedit sendiri) --
  const [karyawanNama, setKaryawanNama] = useState('')
  const [dataDiri, setDataDiri] = useState({ grup: '', unit_kerja: '', level_jabatan: '', golongan: '', pendidikan: '' })
  const [loadingDataDiri, setLoadingDataDiri] = useState(true)
  const [dataDiriStatus, setDataDiriStatus] = useState('')
  const [savingDataDiri, setSavingDataDiri] = useState(false)

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
      setLoadingDataDiri(false)
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

    // Ambil data karyawan sendiri (nama, foto, data diri saat ini) untuk mengisi
    // form Foto Profil & Data Diri dengan nilai yang sudah tersimpan.
    supabase
      .from('karyawan')
      .select('nama, foto_url, grup, unit_kerja, level_jabatan, golongan, pendidikan')
      .eq('nik', user.nik)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return
        setKaryawanNama(data.nama || '')
        setSavedFotoUrl(data.foto_url || null)
        setDataDiri({
          grup: data.grup || '',
          unit_kerja: data.unit_kerja || '',
          level_jabatan: data.level_jabatan || '',
          golongan: data.golongan || '',
          pendidikan: data.pendidikan || '',
        })
      })
      .finally(() => setLoadingDataDiri(false))
  }, [user?.nik])

  function handlePhotoSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setPhotoStatus('')
  }

  async function handleSavePhoto() {
    if (!photoFile) return
    setSavingPhoto(true)
    setPhotoStatus('')
    try {
      const url = await uploadProfilePhoto(user?.nik, photoFile)
      setSavedFotoUrl(url)
      setPhotoFile(null)
      setPhotoStatus('Foto profil tersimpan.')
    } catch (err) {
      setPhotoStatus(err.message || 'Gagal menyimpan foto.')
    } finally {
      setSavingPhoto(false)
    }
  }

  async function handleRemovePhoto() {
    setPhotoFile(null)
    setPhotoPreview(null)
    // Kalau belum ada foto tersimpan di server, cukup bersihkan preview lokal saja.
    if (!savedFotoUrl) return
    setSavingPhoto(true)
    setPhotoStatus('')
    try {
      await removeProfilePhoto(user?.nik)
      setSavedFotoUrl(null)
      setPhotoStatus('Foto profil dihapus.')
    } catch (err) {
      setPhotoStatus(err.message || 'Gagal menghapus foto.')
    } finally {
      setSavingPhoto(false)
    }
  }

  async function handleSaveDataDiri() {
    setSavingDataDiri(true)
    setDataDiriStatus('')
    try {
      await updateOwnProfile(user?.nik, dataDiri)
      setDataDiriStatus('Data diri tersimpan. Perubahan langsung tampil di Talent Profile.')
    } catch (err) {
      setDataDiriStatus(err.message || 'Gagal menyimpan data diri.')
    } finally {
      setSavingDataDiri(false)
    }
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
          {!user?.nik ? (
            <div style={{ color: '#dc2626', fontSize: 12 }}>
              NIK belum terhubung ke akun Anda — hubungi admin agar bisa mengatur foto profil.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 6, flexWrap: 'wrap' }}>
                <div
                  style={{
                    width: 84, height: 84, borderRadius: '50%', background: 'var(--bg3)', border: '1.5px solid var(--border2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0,
                  }}
                >
                  {photoPreview || savedFotoUrl ? (
                    <img src={photoPreview || savedFotoUrl} alt="Foto profil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--dim)' }}>
                      {(karyawanNama || user?.nama || '?').charAt(0).toUpperCase()}
                    </span>
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
                  {photoFile && (
                    <button
                      onClick={handleSavePhoto}
                      disabled={savingPhoto}
                      style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', marginLeft: 6, opacity: savingPhoto ? 0.7 : 1 }}
                    >
                      {savingPhoto ? 'Menyimpan…' : 'Simpan Foto'}
                    </button>
                  )}
                  {(savedFotoUrl || photoPreview) && (
                    <button
                      onClick={handleRemovePhoto}
                      disabled={savingPhoto}
                      style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid var(--border2)', background: 'transparent', color: 'var(--danger)', fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', marginLeft: 6 }}
                    >
                      Hapus Foto
                    </button>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                    JPG/PNG, maksimal 3MB. Klik "Simpan Foto" untuk langsung menerapkannya ke Talent Profile Anda.
                  </div>
                  {photoStatus && (
                    <div style={{ fontSize: 11.5, color: photoStatus.startsWith('Gagal') ? 'var(--danger)' : 'var(--accent)', marginTop: 4, fontWeight: 600 }}>
                      {photoStatus}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* DATA DIRI */}
        <div className="card" style={{ maxWidth: 620 }}>
          <div className="card-title">Data Diri</div>
          {!user?.nik ? (
            <div style={{ color: '#dc2626', fontSize: 12 }}>
              NIK belum terhubung ke akun Anda — hubungi admin agar bisa mengedit data diri.
            </div>
          ) : loadingDataDiri ? (
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>Memuat…</div>
          ) : (
            <>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
                Perbarui data diri Anda di bawah ini. Perubahan langsung tampil di Talent Profile.
              </p>
              <div className="editprofile-datadiri-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 10, marginBottom: 14 }}>
                <div className="login-field" style={{ margin: 0 }}>
                  <label>NIK</label>
                  <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '9px 12px', marginTop: 5, fontSize: 13, color: 'var(--muted)' }}>
                    {user.nik}
                  </div>
                </div>
                {DATA_DIRI_FIELDS.map((f) => (
                  <div className="login-field" key={f.key} style={{ margin: 0 }}>
                    <label>{f.label}</label>
                    <input
                      type="text"
                      value={dataDiri[f.key]}
                      onChange={(e) => setDataDiri((d) => ({ ...d, [f.key]: e.target.value }))}
                      placeholder={`Isi ${f.label.toLowerCase()}`}
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={handleSaveDataDiri}
                disabled={savingDataDiri}
                style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', opacity: savingDataDiri ? 0.7 : 1 }}
              >
                {savingDataDiri ? 'Menyimpan…' : 'Simpan Data Diri'}
              </button>
              {dataDiriStatus && (
                <span style={{ fontSize: 11.5, color: dataDiriStatus.startsWith('Gagal') ? 'var(--danger)' : 'var(--accent)', marginLeft: 10, fontWeight: 600 }}>
                  {dataDiriStatus}
                </span>
              )}
            </>
          )}
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

          <div className="editprofile-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
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
