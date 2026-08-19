import { useEffect, useRef, useState } from 'react'
import Topbar from '../Topbar.jsx'
import Icon from '../Icon.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { supabase } from '../../lib/supabaseClient.js'
import {
  TOP_HISTORY_RE,
  uploadProfilePhoto,
  removeProfilePhoto,
  updateOwnProfile,
  deleteOwnEmployeeHistory,
  setEmployeeHistoryTop,
} from '../../lib/talentProfileApi.js'

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

// Warna aksen per jenis kegiatan (dipakai bar kiri kartu riwayat + badge jenis).
const TIPE_META = {
  development: { label: 'Development', color: '#166534', bg: '#dcfce7' },
  project: { label: 'Project Involvement', color: '#1e40af', bg: '#dbeafe' },
  awarding: { label: 'Awarding', color: '#92400e', bg: '#fef3c7' },
}

function currentYearOptions() {
  const now = new Date().getFullYear()
  return Array.from({ length: 6 }, (_, i) => now - i)
}

// Kotak alert kecil bergaya sama di seluruh halaman ini, untuk status
// sukses/gagal (dipakai gantikan teks polos berwarna).
function StatusBox({ status }) {
  if (!status) return null
  const isError = status.startsWith('Gagal')
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, padding: '9px 12px',
        borderRadius: 8, fontSize: 12, fontWeight: 600,
        background: isError ? 'rgba(192,57,43,.07)' : 'rgba(26,110,60,.08)',
        border: `1px solid ${isError ? 'var(--danger)' : 'var(--accent)'}`,
        color: isError ? 'var(--danger)' : 'var(--accent)',
      }}
    >
      <Icon name={isError ? 'helpCircle' : 'checkCircle'} size={13} strokeWidth={2.4} />
      {status}
    </div>
  )
}

// Header kartu dengan ikon lingkaran berwarna, konsisten dengan pola
// card-title-icon yang dipakai di halaman lain (Inbox, Kelola User, dst).
// `action` opsional dipakai untuk tombol pintas (mis. "+ Tambah Baru") yang
// muncul rata kanan di header, tanpa perlu ubah struktur judul.
function CardHeader({ icon, bg, color, children, action }) {
  return (
    <div className="card-title" style={{ display: 'flex', alignItems: 'center' }}>
      <div className="card-title-icon" style={{ background: bg, color }}>
        <Icon name={icon} size={12} strokeWidth={2.4} />
      </div>
      <span style={{ flex: 1 }}>{children}</span>
      {action}
    </div>
  )
}

export default function EditProfile() {
  const { user } = useAuth()
  // Role 'user' TIDAK boleh mengubah Data Diri (grup/unit kerja/level jabatan/
  // golongan/pendidikan) sendiri — field ini sekarang hanya bisa diubah admin/SDM
  // Unit Kerja. Role admin/superadmin tetap bisa (lihat juga guard di
  // talentProfileApi.js -> updateOwnProfile()).
  const canEditDataDiri = String(user?.role || '').toLowerCase() !== 'user'

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
  const [deletingId, setDeletingId] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const [togglingId, setTogglingId] = useState(null)
  const achievementInputRef = useRef(null)

  // Tombol "+" di header kartu — geser layar ke baris form tambah riwayat
  // (slot kosong berikutnya) lalu fokus ke input "Nama Kegiatan/Pencapaian",
  // supaya user bisa langsung mulai mengisi tanpa scroll manual.
  function focusAddHistoryRow() {
    achievementInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    achievementInputRef.current?.focus()
  }

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
      await updateOwnProfile(user?.nik, dataDiri, user?.role)
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
    // Kalau jenis yang dituju sudah punya Top terpakai, jangan biarkan form
    // "nyangkut" di kategori Top — turunkan otomatis ke Reguler.
    if (kategori === 'top' && countsForTipe(v).top >= maxTop) setKategori('recent')
  }

  // Kuota riwayat SEKARANG PER JENIS (Development / Project / Awarding),
  // bukan gabungan lintas jenis — masing-masing jenis punya jatah sendiri:
  // maksimal 5 riwayat (4 Reguler + 1 Top History).
  const maxRecent = 4
  const maxTop = 1
  const maxTotal = maxRecent + maxTop
  const savedIsTop = (s) => TOP_HISTORY_RE.test(s.achievement || '')

  // Hitung kuota terpakai untuk 1 jenis tertentu (gabungan dari yang sudah
  // tersimpan di server + yang masih di antrean/"belum disimpan").
  function countsForTipe(t) {
    const recent =
      queue.filter((q) => q.tipe === t && q.kategori === 'recent').length +
      saved.filter((s) => s.kategori === t && !savedIsTop(s)).length
    const top =
      queue.filter((q) => q.tipe === t && q.kategori === 'top').length +
      saved.filter((s) => s.kategori === t && savedIsTop(s)).length
    return { recent, top, total: recent + top }
  }

  // Kuota utk jenis yang SEDANG dipilih di form (dipakai validasi tombol
  // "+ Tambah ke Daftar" & progress bar jenis aktif).
  const { recent: recentCount, top: topCount, total: totalCount } = countsForTipe(tipe)

  function handleAddToQueue() {
    if (!achievement.trim()) return
    if (totalCount >= maxTotal) return
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

  // Toggle Reguler/Top untuk item yang MASIH di antrean (belum disimpan) —
  // cukup ubah state lokal, belum menyentuh server. Dijaga defensif juga di
  // sini (bukan cuma disabled di tombol) supaya tidak bisa tembus kuota 1 Top
  // per jenis walau dipanggil dengan cara lain.
  function toggleQueueTop(id, makeTop) {
    setQueue((q) => {
      if (makeTop) {
        const item = q.find((it) => it.id === id)
        if (item && countsForTipe(item.tipe).top >= maxTop) return q
      }
      return q.map((it) => (it.id === id ? { ...it, kategori: makeTop ? 'top' : 'recent' } : it))
    })
  }

  // Toggle Reguler/Top untuk riwayat yang SUDAH tersimpan di server (milik
  // sendiri) — supaya status Top bisa diganti kapan saja tanpa perlu hapus
  // lalu isi ulang (mis. hari ini ditandai Top, besok mau ditukar Reguler).
  async function handleToggleSavedTop(id, makeTop) {
    setTogglingId(id)
    setDeleteError('')
    try {
      const updated = await setEmployeeHistoryTop(id, user?.nik, makeTop)
      setSaved((s) => s.map((it) => (it.id === id ? { ...it, achievement: updated.achievement } : it)))
    } catch (err) {
      setDeleteError(err.message || 'Gagal mengubah status Top/Reguler.')
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDeleteSaved(id) {
    if (!window.confirm('Hapus riwayat ini? Tindakan ini tidak bisa dibatalkan.')) return
    setDeletingId(id)
    setDeleteError('')
    try {
      await deleteOwnEmployeeHistory(id, user?.nik)
      setSaved((s) => s.filter((it) => it.id !== id))
    } catch (err) {
      setDeleteError(err.message || 'Gagal menghapus riwayat.')
    } finally {
      setDeletingId(null)
    }
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

  // Gabungan baris riwayat UNTUK JENIS YANG SEDANG AKTIF di tab/tabel —
  // riwayat tersimpan di server ditampilkan lebih dulu, lalu yang masih di
  // antrean ("belum disimpan"). Dipakai render <table> di kartu "Tambah
  // Employee History" supaya kelihatan slot mana yang sudah/belum terisi.
  const filledRows = [
    ...saved
      .filter((s) => s.kategori === tipe)
      .map((s) => ({
        id: `saved-${s.id}`,
        source: 'saved',
        isTop: savedIsTop(s),
        achievement: (s.achievement || '').replace(TOP_HISTORY_RE, ''),
        tingkatan: s.tingkatan,
        tahun: s.tahun,
        canDelete: s.sumber === 'self',
        deleteId: s.id,
      })),
    ...queue
      .filter((q) => q.tipe === tipe)
      .map((q) => ({
        id: `queue-${q.id}`,
        source: 'queue',
        isTop: q.kategori === 'top',
        achievement: `${q.achievement}${q.ongoing ? ' (berjalan)' : ''}`,
        tingkatan: q.tingkatan,
        tahun: q.tahun,
        canDelete: true,
        deleteId: q.id,
      })),
  ]
  const slotsLeft = Math.max(0, maxTotal - filledRows.length)

  return (
    <div>
      <Topbar title="Edit Profile" />
      <div className="content" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* FOTO PROFIL */}
        <div className="card">
          <CardHeader icon="user" bg="#dbeafe" color="#1e40af">Foto Profil</CardHeader>
          {!user?.nik ? (
            <div style={{ color: '#dc2626', fontSize: 12 }}>
              NIK belum terhubung ke akun Anda — hubungi admin agar bisa mengatur foto profil.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 6, flexWrap: 'wrap' }}>
                <div
                  style={{
                    width: 92, height: 92, borderRadius: '50%', background: 'linear-gradient(135deg,var(--accent) 0%,#1d7a4e 100%)',
                    border: '3px solid var(--card)', boxShadow: '0 0 0 3px var(--border2), 0 4px 12px rgba(0,0,0,.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0,
                  }}
                >
                  {photoPreview || savedFotoUrl ? (
                    <img src={photoPreview || savedFotoUrl} alt="Foto profil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: 30, fontWeight: 800, color: '#fff' }}>
                      {(karyawanNama || user?.nama || '?').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <input type="file" id="ep-photo-input" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoSelect} />
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => document.getElementById('ep-photo-input').click()}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8,
                        border: '1.5px solid var(--border2)', background: 'var(--bg2)', color: 'var(--text)',
                        fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      <Icon name="upload2" size={13} strokeWidth={2.3} />
                      Pilih Foto
                    </button>
                    {photoFile && (
                      <button
                        onClick={handleSavePhoto}
                        disabled={savingPhoto}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8,
                          border: 'none', background: 'var(--accent)', color: '#fff', fontFamily: 'var(--font-b)',
                          fontSize: 12.5, fontWeight: 700, cursor: 'pointer', opacity: savingPhoto ? 0.7 : 1,
                        }}
                      >
                        <Icon name="checkCircle" size={13} strokeWidth={2.3} />
                        {savingPhoto ? 'Menyimpan…' : 'Simpan Foto'}
                      </button>
                    )}
                    {(savedFotoUrl || photoPreview) && (
                      <button
                        onClick={handleRemovePhoto}
                        disabled={savingPhoto}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8,
                          border: '1.5px solid var(--border2)', background: 'transparent', color: 'var(--danger)',
                          fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        <Icon name="trash" size={13} strokeWidth={2.3} />
                        Hapus Foto
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
                    JPG/PNG, maksimal 3MB. Klik "Simpan Foto" untuk langsung menerapkannya ke Talent Profile Anda.
                  </div>
                  <StatusBox status={photoStatus} />
                </div>
              </div>
            </>
          )}
        </div>

        {/* DATA DIRI */}
        <div className="card">
          <CardHeader icon="idCard" bg="#ede9fe" color="#6d28d9">Data Diri</CardHeader>
          {!user?.nik ? (
            <div style={{ color: '#dc2626', fontSize: 12 }}>
              NIK belum terhubung ke akun Anda — hubungi admin agar bisa mengedit data diri.
            </div>
          ) : loadingDataDiri ? (
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>Memuat…</div>
          ) : !canEditDataDiri ? (
            <>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
                Data Diri (Grup Job Function, Unit Kerja, Level Jabatan, Golongan, Pendidikan) sekarang hanya bisa
                diubah oleh <strong>admin/SDM Unit Kerja</strong>, bukan oleh karyawan sendiri. Hubungi admin/SDM
                Unit Kerja Anda jika ada perubahan.
              </p>
              <div className="editprofile-datadiri-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 10 }}>
                <div className="login-field" style={{ margin: 0 }}>
                  <label>NIK</label>
                  <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '9px 12px', marginTop: 5, fontSize: 13, color: 'var(--muted)' }}>
                    {user.nik}
                  </div>
                </div>
                {DATA_DIRI_FIELDS.map((f) => (
                  <div className="login-field" key={f.key} style={{ margin: 0 }}>
                    <label>{f.label}</label>
                    <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '9px 12px', marginTop: 5, fontSize: 13, color: 'var(--text)' }}>
                      {dataDiri[f.key] || '—'}
                    </div>
                  </div>
                ))}
              </div>
            </>
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
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8,
                  border: 'none', background: 'var(--accent)', color: '#fff', fontFamily: 'var(--font-b)',
                  fontSize: 12.5, fontWeight: 700, cursor: 'pointer', opacity: savingDataDiri ? 0.7 : 1,
                }}
              >
                <Icon name="save" size={13} strokeWidth={2.3} />
                {savingDataDiri ? 'Menyimpan…' : 'Simpan Data Diri'}
              </button>
              <StatusBox status={dataDiriStatus} />
            </>
          )}
        </div>

        {/* TAMBAH EMPLOYEE HISTORY */}
        <div className="card">
          <CardHeader
            icon="fileText"
            bg="#fef3c7"
            color="#92400e"
            action={
              slotsLeft > 0 ? (
                <button
                  type="button"
                  onClick={focusAddHistoryRow}
                  className="card-header-add-btn"
                  title="Tambah riwayat baru"
                >
                  <Icon name="plus" size={13} strokeWidth={2.8} />
                  Tambah Baru
                </button>
              ) : null
            }
          >
            Tambah Employee History
          </CardHeader>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
            Tambahkan riwayat pengembangan diri, keterlibatan proyek, atau penghargaan yang belum tercatat. Setelah
            disimpan, otomatis muncul di Talent Profile Anda. Setiap <strong>jenis</strong> (Development, Project
            Involvement, Awarding) punya kuota <strong>sendiri-sendiri</strong>: maksimal <strong>5 riwayat</strong>{' '}
            (<strong>4 Reguler</strong> + <strong>1 Top</strong>). Hanya boleh <strong>satu Top</strong> aktif per
            jenis — lepas (ganti ke Reguler) Top yang sudah ada dulu sebelum memilih Top baru. Status Reguler/Top
            bisa diganti kapan saja lewat tombol di kolom Kategori, termasuk untuk riwayat yang sudah tersimpan.
          </p>

          {/* Tab jenis kegiatan — sekaligus ringkasan kuota tiap jenis */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10, marginBottom: 16 }}>
            {Object.keys(TIPE_META).map((t) => {
              const c = countsForTipe(t)
              const meta = TIPE_META[t]
              const isActive = t === tipe
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTipeChange(t)}
                  style={{
                    textAlign: 'left', padding: '10px 12px', borderRadius: 9, cursor: 'pointer',
                    border: `1.5px solid ${isActive ? meta.color : 'var(--border2)'}`,
                    background: isActive ? meta.bg : 'transparent',
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: meta.color, marginBottom: 6 }}>{meta.label}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: c.total >= maxTotal ? 'var(--danger)' : 'var(--muted)', marginBottom: 5 }}>
                    {c.total}/{maxTotal} total &middot; {c.recent} Reguler, {c.top} Top
                  </div>
                  <div style={{ height: 5, borderRadius: 4, background: 'var(--bg3)', overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${(c.recent / maxTotal) * 100}%`, background: meta.color, transition: 'width .2s' }} />
                    <div style={{ width: `${(c.top / maxTotal) * 100}%`, background: '#d97706', transition: 'width .2s' }} />
                  </div>
                </button>
              )
            })}
          </div>

          {/* TABEL riwayat untuk jenis yang sedang aktif (tab di atas) — maks.
              5 baris/slot per jenis. Baris yang sudah terisi (tersimpan atau
              masih di antrean) tampil sebagai baris biasa dengan badge
              Reguler/Top; slot kosong berikutnya tampil sebagai 1 baris form
              dengan toggle Reguler/Top — tombol "Top" otomatis terkunci kalau
              jenis ini sudah punya 1 Top terpakai. */}
          <div className="tbl-wrap eh-table" style={{ marginBottom: 10 }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 28 }}>No</th>
                  <th style={{ width: 118 }}>Kategori</th>
                  <th style={{ width: 150 }}>Tingkatan</th>
                  <th style={{ width: 84 }}>Tahun</th>
                  <th>Nama Kegiatan / Pencapaian</th>
                  <th style={{ width: 56 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loadingSaved ? (
                  <tr><td colSpan={6} style={{ color: 'var(--muted)', fontSize: 12 }}>Memuat…</td></tr>
                ) : (
                  <>
                    {filledRows.map((r, idx) => {
                      const isSavedBusy = r.source === 'saved' && togglingId === r.deleteId
                      return (
                        <tr key={r.id} style={{ opacity: isSavedBusy ? 0.6 : 1 }}>
                          <td>{idx + 1}</td>
                          <td>
                            {r.canDelete ? (
                              <div className="eh-kategori-toggle">
                                <button
                                  type="button"
                                  className={!r.isTop ? 'active' : ''}
                                  disabled={isSavedBusy}
                                  onClick={() =>
                                    r.source === 'saved'
                                      ? handleToggleSavedTop(r.deleteId, false)
                                      : toggleQueueTop(r.deleteId, false)
                                  }
                                >
                                  Reguler
                                </button>
                                <button
                                  type="button"
                                  className={r.isTop ? 'active' : ''}
                                  disabled={isSavedBusy || (!r.isTop && topCount >= maxTop)}
                                  title={!r.isTop && topCount >= maxTop ? 'Top sudah dipakai — lepas Top yang ada dulu' : ''}
                                  onClick={() =>
                                    r.source === 'saved'
                                      ? handleToggleSavedTop(r.deleteId, true)
                                      : toggleQueueTop(r.deleteId, true)
                                  }
                                >
                                  Top
                                </button>
                              </div>
                            ) : (
                              <span className={`eh-pill ${r.isTop ? 'eh-pill-top' : 'eh-pill-reg'}`}>
                                {r.isTop ? 'Top' : 'Reguler'}
                              </span>
                            )}
                          </td>
                          <td>{r.tingkatan || '—'}</td>
                          <td>{r.tahun || '—'}</td>
                          <td>{r.achievement}</td>
                          <td>
                            {r.canDelete ? (
                              <button
                                type="button"
                                onClick={() => (r.source === 'saved' ? handleDeleteSaved(r.deleteId) : removeFromQueue(r.deleteId))}
                                disabled={isSavedBusy || (r.source === 'saved' && deletingId === r.deleteId)}
                                title="Hapus riwayat ini"
                                className="eh-icon-btn"
                              >
                                <Icon name={r.source === 'saved' ? 'trash' : 'x'} size={13} strokeWidth={2.4} />
                              </button>
                            ) : (
                              <span style={{ fontSize: 10, color: 'var(--dim)' }}>Terkunci</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}

                    {slotsLeft > 0 ? (
                      <tr className="eh-add-row">
                        <td>{filledRows.length + 1}</td>
                        <td>
                          <div className="eh-kategori-toggle">
                            <button type="button" className={kategori === 'recent' ? 'active' : ''} onClick={() => setKategori('recent')}>
                              Reguler
                            </button>
                            <button
                              type="button"
                              className={kategori === 'top' ? 'active' : ''}
                              disabled={topCount >= maxTop}
                              title={topCount >= maxTop ? 'Top sudah dipakai — hapus/lepas Top yang ada dulu' : ''}
                              onClick={() => setKategori('top')}
                            >
                              Top
                            </button>
                          </div>
                        </td>
                        <td>
                          <select value={tingkatan} onChange={(e) => setTingkatan(e.target.value)}>
                            {TINGKATAN_OPTIONS[tipe].map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select value={tahun} onChange={(e) => setTahun(Number(e.target.value))}>
                            {currentYearOptions().map((y) => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            ref={achievementInputRef}
                            type="text"
                            value={achievement}
                            onChange={(e) => setAchievement(e.target.value)}
                            placeholder="Contoh: Sertifikasi Project Management Professional (PMP)"
                          />
                          {tipe === 'project' && (
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={ongoing}
                                onChange={(e) => setOngoing(e.target.checked)}
                                style={{ width: 13, height: 13, margin: 0, cursor: 'pointer' }}
                              />
                              Masih berjalan (Tahun = tahun mulai)
                            </label>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={handleAddToQueue}
                            disabled={!achievement.trim() || totalCount >= maxTotal || (kategori === 'recent' && recentCount >= maxRecent) || (kategori === 'top' && topCount >= maxTop)}
                            className="eh-add-btn"
                            title="Tambah ke daftar"
                          >
                            <Icon name="plus" size={14} strokeWidth={2.6} />
                          </button>
                        </td>
                      </tr>
                    ) : (
                      <tr>
                        <td colSpan={6} style={{ fontSize: 11.5, color: 'var(--muted)', textAlign: 'center' }}>
                          Kuota {TIPE_META[tipe].label} sudah penuh (5/5).
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>

          {queue.some((q) => q.tipe === tipe) && (
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
              Baris yang belum tersimpan akan hilang jika halaman ditutup — klik <strong>"Simpan Semua Perubahan"</strong> di bawah untuk menyimpannya permanen.
            </div>
          )}

          <StatusBox status={deleteError} />
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <button
            onClick={handleSaveAll}
            disabled={saving}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '11px 22px', borderRadius: 9, border: 'none', background: 'var(--accent)', color: '#fff',
              fontFamily: 'var(--font-b)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1,
            }}
          >
            <Icon name="save" size={14} strokeWidth={2.3} />
            {saving ? 'Menyimpan...' : 'Simpan Semua Perubahan'}
          </button>
          {saveStatus && (
            <span
              style={{
                fontSize: 12, fontWeight: 600, color: saveStatus.startsWith('Gagal') ? 'var(--danger)' : 'var(--accent)',
              }}
            >
              {saveStatus}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
