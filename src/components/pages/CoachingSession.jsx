import { useEffect, useState } from 'react'
import Topbar from '../Topbar.jsx'
import Icon from '../Icon.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import {
  EVALUASI_KINERJA_OPTIONS,
  TOPIK_LAIN_OPTIONS,
  AKTIVITAS_OPTIONS,
  emptyCoacheeRow,
  getKaryawanByNik,
  saveCoachingSession,
  getMyCoachingSessions,
} from '../../lib/coachingSessionApi.js'

// Kotak status sukses/gagal, gaya sama dengan halaman lain (Edit Profile, dst).
function StatusBox({ status }) {
  if (!status) return null
  const isError = status.startsWith('Gagal') || status.startsWith('NIK') || status.startsWith('Unit') || status.startsWith('Nama') || status.startsWith('Tambahkan')
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

function CardHeader({ icon, bg, color, children }) {
  return (
    <div className="card-title" style={{ display: 'flex', alignItems: 'center' }}>
      <div className="card-title-icon" style={{ background: bg, color }}>
        <Icon name={icon} size={12} strokeWidth={2.4} />
      </div>
      {children}
    </div>
  )
}

// Field label+input bergaya sama dengan halaman Edit Profile (class "login-field").
function Field({ label, children, span }) {
  return (
    <div className="login-field" style={{ margin: 0, gridColumn: span ? `span ${span}` : undefined }}>
      <label>{label}</label>
      {children}
    </div>
  )
}

const textareaStyle = {
  display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 6, padding: '10px 12px',
  border: '1.5px solid var(--border2)', borderRadius: 10, background: 'var(--bg2)', color: 'var(--text)',
  fontFamily: 'var(--font-b)', fontSize: 13, outline: 'none', resize: 'vertical', minHeight: 64,
}

export default function CoachingSession({ onBack }) {
  const { user } = useAuth()

  const [header, setHeader] = useState({
    unit_kerja: '',
    coach_nik: user?.nik || '',
    coach_nama: user?.nama || '',
    coach_jabatan: '',
    coach_usia: '',
  })
  const [coachees, setCoachees] = useState([emptyCoacheeRow()])
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [openHistoryId, setOpenHistoryId] = useState(null)

  // Auto-lookup data Coach (Jabatan & Usia) dari tabel karyawan begitu NIK
  // sudah terisi (dari akun login), supaya coach tidak perlu isi manual.
  useEffect(() => {
    if (!header.coach_nik) return
    let active = true
    getKaryawanByNik(header.coach_nik)
      .then((k) => {
        if (!active || !k) return
        setHeader((h) => ({
          ...h,
          coach_jabatan: h.coach_jabatan || k.posisi || '',
          coach_usia: h.coach_usia || (k.usia != null ? String(k.usia) : ''),
        }))
      })
      .catch(() => {})
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function loadHistory() {
    setLoadingHistory(true)
    getMyCoachingSessions()
      .then((rows) => setHistory(rows))
      .catch(() => setHistory([]))
      .finally(() => setLoadingHistory(false))
  }

  useEffect(() => {
    loadHistory()
  }, [])

  function updateCoachee(idx, patch) {
    setCoachees((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  function addCoachee() {
    setCoachees((rows) => [...rows, emptyCoacheeRow()])
  }

  function removeCoachee(idx) {
    setCoachees((rows) => (rows.length <= 1 ? rows : rows.filter((_, i) => i !== idx)))
  }

  // Begitu NIK SAP Coachee selesai diketik (blur), coba autofill Nama &
  // Jabatan dari tabel karyawan supaya coach tidak perlu ketik manual.
  async function handleCoacheeNikBlur(idx, nik) {
    if (!nik?.trim()) return
    try {
      const k = await getKaryawanByNik(nik)
      if (k) {
        updateCoachee(idx, { coachee_nama: k.nama || '', coachee_jabatan: k.posisi || '' })
      }
    } catch {
      /* biarkan diisi manual kalau lookup gagal */
    }
  }

  async function handleSave() {
    setSaving(true)
    setStatus('')
    try {
      await saveCoachingSession({ header, coachees, userId: user?.id })
      setStatus('Sesi coaching berhasil disimpan.')
      setCoachees([emptyCoacheeRow()])
      loadHistory()
    } catch (e) {
      setStatus(`Gagal menyimpan: ${e.message || 'terjadi kesalahan.'}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Topbar icon="messageSquare" title="Coaching Session" />
      <div className="content">
        {/* Tombol kembali — ditaruh menonjol di atas kartu "Data Coach" supaya
            selalu terlihat (tidak tersembunyi di topbar saat layar sempit). */}
        <button type="button" onClick={onBack} className="back-pill-btn" style={{ marginBottom: 18 }}>
          <span className="back-pill-icon">
            <Icon name="chevronLeft" size={13} strokeWidth={2.8} />
          </span>
          Kembali ke SGN Conext
        </button>

   

        {/* DATA COACH */}
        <div className="card" style={{ maxWidth: 820 }}>
          <CardHeader icon="idCard" bg="rgba(26,110,60,.1)" color="var(--accent)">Data Coach</CardHeader>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 10 }}>
            <Field label="Unit Kerja">
              <input
                type="text"
                value={header.unit_kerja}
                onChange={(e) => setHeader((h) => ({ ...h, unit_kerja: e.target.value }))}
                placeholder="Nama Unit Kerja / Divisi / Pabrik Gula"
              />
            </Field>
            <Field label="NIK SAP Coach">
              <input
                type="text"
                value={header.coach_nik}
                onChange={(e) => setHeader((h) => ({ ...h, coach_nik: e.target.value }))}
                placeholder="NIK SAP Coach"
              />
            </Field>
            <Field label="Nama Coach">
              <input
                type="text"
                value={header.coach_nama}
                onChange={(e) => setHeader((h) => ({ ...h, coach_nama: e.target.value }))}
                placeholder="Nama Coach"
              />
            </Field>
            <Field label="Jabatan Coach">
              <input
                type="text"
                value={header.coach_jabatan}
                onChange={(e) => setHeader((h) => ({ ...h, coach_jabatan: e.target.value }))}
                placeholder="Jabatan Coach"
              />
            </Field>
            <Field label="Usia">
              <input
                type="number"
                value={header.coach_usia}
                onChange={(e) => setHeader((h) => ({ ...h, coach_usia: e.target.value }))}
                placeholder="Usia Coach"
              />
            </Field>
          </div>
        </div>

        {/* DATA COACHEE */}
        <div className="card" style={{ maxWidth: 820 }}>
          <CardHeader icon="users" bg="#dbeafe" color="#1e40af">Coachee & Hasil Diskusi</CardHeader>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
            Isi NIK SAP Coachee — Nama & Jabatan akan otomatis terisi jika ditemukan di data karyawan.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {coachees.map((row, idx) => (
              <div
                key={row._key}
                style={{ border: '1.5px solid var(--border2)', borderRadius: 12, padding: 16, position: 'relative' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>Coachee #{idx + 1}</div>
                  {coachees.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCoachee(idx)}
                      title="Hapus coachee ini"
                      style={{
                        width: 26, height: 26, borderRadius: 7, border: '1px solid var(--border2)', background: 'var(--bg2)',
                        color: 'var(--danger)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Icon name="trash" size={12} strokeWidth={2.4} />
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 10, marginBottom: 10 }}>
                  <Field label="NIK SAP Coachee">
                    <input
                      type="text"
                      value={row.coachee_nik}
                      onChange={(e) => updateCoachee(idx, { coachee_nik: e.target.value })}
                      onBlur={(e) => handleCoacheeNikBlur(idx, e.target.value)}
                      placeholder="NIK SAP"
                    />
                  </Field>
                  <Field label="Nama Coachee">
                    <input
                      type="text"
                      value={row.coachee_nama}
                      onChange={(e) => updateCoachee(idx, { coachee_nama: e.target.value })}
                      placeholder="Nama"
                    />
                  </Field>
                  <Field label="Jabatan Coachee">
                    <input
                      type="text"
                      value={row.coachee_jabatan}
                      onChange={(e) => updateCoachee(idx, { coachee_jabatan: e.target.value })}
                      placeholder="Jabatan"
                    />
                  </Field>
                  <Field label="Waktu">
                    <input
                      type="date"
                      value={row.waktu}
                      onChange={(e) => updateCoachee(idx, { waktu: e.target.value })}
                    />
                  </Field>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10 }}>
                  <Field label="Evaluasi Kinerja">
                    <select
                      value={row.evaluasi_kinerja}
                      onChange={(e) => updateCoachee(idx, { evaluasi_kinerja: e.target.value })}
                    >
                      {EVALUASI_KINERJA_OPTIONS.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Topik Lain">
                    <select
                      value={row.topik_lain}
                      onChange={(e) => updateCoachee(idx, { topik_lain: e.target.value })}
                    >
                      {TOPIK_LAIN_OPTIONS.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Hasil Diskusi (Evaluasi Kinerja)" span={2}>
                    <textarea
                      style={textareaStyle}
                      value={row.hasil_diskusi_kinerja}
                      onChange={(e) => updateCoachee(idx, { hasil_diskusi_kinerja: e.target.value })}
                      placeholder="Diisi hasil diskusi terkait evaluasi kinerja"
                    />
                  </Field>

                  <Field label="Hasil Diskusi (Topik Lain)" span={2}>
                    <textarea
                      style={textareaStyle}
                      value={row.hasil_diskusi_topik}
                      onChange={(e) => updateCoachee(idx, { hasil_diskusi_topik: e.target.value })}
                      placeholder="Diisi hasil diskusi terkait topik lain"
                    />
                  </Field>

                  <Field label="Rencana Aktivitas">
                    <select
                      value={row.aktivitas}
                      onChange={(e) => updateCoachee(idx, { aktivitas: e.target.value })}
                    >
                      {AKTIVITAS_OPTIONS.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Deskripsi Aktivitas">
                    <input
                      type="text"
                      value={row.deskripsi_aktivitas}
                      onChange={(e) => updateCoachee(idx, { deskripsi_aktivitas: e.target.value })}
                      placeholder="Diisi aktivitas yang dipilih"
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addCoachee}
            style={{
              marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              borderRadius: 8, border: '1.5px dashed var(--border2)', background: 'transparent',
              color: 'var(--accent)', fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
            }}
          >
            <Icon name="plus" size={13} strokeWidth={2.6} />
            Tambah Coachee
          </button>
        </div>

        {/* SIMPAN */}
        <div className="card" style={{ maxWidth: 820, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '11px 22px', borderRadius: 9, border: 'none', background: 'var(--accent)', color: '#fff',
              fontFamily: 'var(--font-b)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1,
            }}
          >
            <Icon name="save" size={14} strokeWidth={2.3} />
            {saving ? 'Menyimpan…' : 'Simpan Sesi Coaching'}
          </button>
          {status && <StatusBox status={status} />}
        </div>

        {/* RIWAYAT */}
        <div className="card" style={{ maxWidth: 820 }}>
          <CardHeader icon="fileText" bg="#fef3c7" color="#92400e">Riwayat Sesi Coaching Saya</CardHeader>
          {loadingHistory ? (
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>Memuat…</p>
          ) : history.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>Belum ada sesi coaching yang disimpan.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {history.map((s) => {
                const isOpen = openHistoryId === s.id
                return (
                  <div key={s.id} style={{ border: '1px solid var(--border2)', borderRadius: 10, overflow: 'hidden' }}>
                    <button
                      type="button"
                      onClick={() => setOpenHistoryId(isOpen ? null : s.id)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 14px', background: 'var(--bg2)', border: 'none', cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>
                          {s.unit_kerja || '(Unit Kerja belum diisi)'} — {new Date(s.created_at).toLocaleDateString('id-ID')}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                          Coach: {s.coach_nama} &middot; {s.coachees.length} coachee
                        </div>
                      </div>
                      <Icon name={isOpen ? 'chevronLeft' : 'chevronRight'} size={14} strokeWidth={2.4} style={{ color: 'var(--muted)' }} />
                    </button>
                    {isOpen && (
                      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {s.coachees.map((c) => (
                          <div key={c.id} style={{ fontSize: 12, color: 'var(--text)', borderTop: '1px dashed var(--border2)', paddingTop: 10 }}>
                            <div style={{ fontWeight: 700, marginBottom: 4 }}>
                              {c.coachee_nama} <span style={{ color: 'var(--muted)', fontWeight: 500 }}>({c.coachee_nik}) — {c.coachee_jabatan}</span>
                            </div>
                            {c.waktu && <div style={{ color: 'var(--muted)', marginBottom: 4 }}>Waktu: {c.waktu}</div>}
                            {c.hasil_diskusi_kinerja && (
                              <div style={{ marginBottom: 4 }}><strong>{c.evaluasi_kinerja}:</strong> {c.hasil_diskusi_kinerja}</div>
                            )}
                            {c.hasil_diskusi_topik && (
                              <div style={{ marginBottom: 4 }}><strong>{c.topik_lain}:</strong> {c.hasil_diskusi_topik}</div>
                            )}
                            {c.aktivitas && (
                              <div><strong>Rencana Aktivitas:</strong> {c.aktivitas} — {c.deskripsi_aktivitas}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
