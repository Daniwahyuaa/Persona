import { useEffect, useRef, useState } from 'react'
import Topbar from '../Topbar.jsx'
import Icon from '../Icon.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import {
  EVALUASI_KINERJA_OPTIONS,
  TOPIK_LAIN_OPTIONS,
  AKTIVITAS_OPTIONS,
  emptyCoacheeRow,
  emptyTopikLainRow,
  getKaryawanByNik,
  searchKaryawanByUnitKerja,
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

  // Data Coach SEKARANG selalu ikut data pemilik akun yang login (sama
  // seperti Talent Profile) dan tidak bisa diubah manual di form ini —
  // supaya sesi coaching selalu tercatat atas nama coach yang benar.
  const [header, setHeader] = useState({
    unit_kerja: '',
    coach_nik: user?.nik || '',
    coach_nama: user?.nama || '',
    coach_jabatan: '',
    coach_usia: '',
  })
  const [loadingCoach, setLoadingCoach] = useState(true)
  const [coachError, setCoachError] = useState('')

  const [coachees, setCoachees] = useState([emptyCoacheeRow()])
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [openHistoryId, setOpenHistoryId] = useState(null)

  // State untuk kotak pencarian coachee per baris (key = row._key), dibatasi
  // ke Unit Kerja coach sendiri (lihat requirement #4).
  const [coacheeSearch, setCoacheeSearch] = useState({})
  const searchTimers = useRef({})

  // Muat data diri Coach (Nama, Unit Kerja, Jabatan, Usia) dari tabel
  // karyawan berdasarkan NIK akun yang login — dikunci, tidak bisa diubah
  // dari form ini (samakan dengan Talent Profile: data diri = milik akun).
  useEffect(() => {
    if (!user?.nik) {
      setLoadingCoach(false)
      setCoachError('NIK belum terhubung ke akun Anda — hubungi admin agar bisa mengisi Coaching Session.')
      return
    }
    let active = true
    setLoadingCoach(true)
    setCoachError('')
    getKaryawanByNik(user.nik)
      .then((k) => {
        if (!active) return
        if (!k) {
          setCoachError('Data karyawan untuk NIK Anda tidak ditemukan — hubungi admin.')
          return
        }
        setHeader({
          unit_kerja: k.unit_kerja || '',
          coach_nik: user.nik,
          coach_nama: k.nama || user?.nama || '',
          coach_jabatan: k.posisi || '',
          coach_usia: k.usia != null ? String(k.usia) : '',
        })
      })
      .catch((e) => active && setCoachError(e.message || 'Gagal memuat data Coach.'))
      .finally(() => active && setLoadingCoach(false))
    return () => {
      active = false
    }
  }, [user?.nik])

  // ── Cari Coachee (dibatasi ke Unit Kerja Coach sendiri) ──────────────
  function setRowSearch(key, patch) {
    setCoacheeSearch((s) => ({ ...s, [key]: { ...(s[key] || {}), ...patch } }))
  }

  // Jalankan pencarian (dipakai baik saat mengetik maupun saat field
  // difokuskan pertama kali, supaya coach bisa langsung lihat daftar
  // orang di unit kerjanya sendiri tanpa perlu tahu nama persis dulu).
  function runCoacheeSearch(key, value) {
    clearTimeout(searchTimers.current[key])
    setRowSearch(key, { loading: true, open: true })
    searchTimers.current[key] = setTimeout(async () => {
      try {
        const rows = await searchKaryawanByUnitKerja(value, header.unit_kerja)
        setRowSearch(key, { results: rows, loading: false })
      } catch {
        setRowSearch(key, { results: [], loading: false })
      }
    }, 250)
  }

  function handleCoacheeQueryChange(idx, key, value) {
    updateCoachee(idx, { coachee_query: value, coachee_nik: '', coachee_nama: '', coachee_jabatan: '' })
    runCoacheeSearch(key, value)
  }

  function handleCoacheeFocus(idx, key, value) {
    // Fokus pertama kali (belum ketik apa-apa) -> tampilkan daftar orang di
    // Unit Kerja sendiri langsung, tanpa perlu menunggu user mengetik dulu.
    if (!coacheeSearch[key]?.results?.length) runCoacheeSearch(key, value)
    else setRowSearch(key, { open: true })
  }

  function selectCoacheeResult(idx, key, r) {
    updateCoachee(idx, { coachee_query: r.nama, coachee_nik: r.nik, coachee_nama: r.nama || '', coachee_jabatan: r.posisi || '' })
    setRowSearch(key, { open: false })
  }

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

  // ── Topik Lain (bisa lebih dari 1 pasang Topik + Hasil Diskusinya) ────
  function addTopikLainRow(idx) {
    setCoachees((rows) =>
      rows.map((r, i) => (i === idx ? { ...r, topikLainRows: [...r.topikLainRows, emptyTopikLainRow()] } : r))
    )
  }

  function updateTopikLainRow(idx, topikKey, patch) {
    setCoachees((rows) =>
      rows.map((r, i) =>
        i === idx
          ? { ...r, topikLainRows: r.topikLainRows.map((t) => (t._key === topikKey ? { ...t, ...patch } : t)) }
          : r
      )
    )
  }

  function removeTopikLainRow(idx, topikKey) {
    setCoachees((rows) =>
      rows.map((r, i) =>
        i === idx && r.topikLainRows.length > 1
          ? { ...r, topikLainRows: r.topikLainRows.filter((t) => t._key !== topikKey) }
          : r
      )
    )
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

   

        {/* DATA COACH — ikut data pemilik akun yang login, terkunci (tidak
            bisa diubah dari form ini), sama seperti di Talent Profile. */}
        <div className="card">
          <CardHeader icon="idCard" bg="rgba(26,110,60,.1)" color="var(--accent)">Data Coach</CardHeader>
          {loadingCoach ? (
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>Memuat data Coach…</div>
          ) : coachError ? (
            <div style={{ color: 'var(--danger)', fontSize: 12 }}>{coachError}</div>
          ) : (
            <>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
                Data Coach di bawah ini mengikuti akun Anda yang sedang login dan{' '}
                <strong>tidak bisa diubah</strong> dari form ini — sama seperti Data Diri di Talent Profile. Hubungi
                admin/SDM Unit Kerja jika ada yang perlu diperbarui.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 10 }}>
                {[
                  ['Unit Kerja', header.unit_kerja],
                  ['NIK SAP Coach', header.coach_nik],
                  ['Nama Coach', header.coach_nama],
                  ['Jabatan Coach', header.coach_jabatan],
                  ['Usia', header.coach_usia],
                ].map(([label, value]) => (
                  <div className="login-field" style={{ margin: 0 }} key={label}>
                    <label>{label}</label>
                    <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '9px 12px', marginTop: 5, fontSize: 13, color: 'var(--text)' }}>
                      {value || '—'}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* DATA COACHEE */}
        <div className="card">
          <CardHeader icon="users" bg="#dbeafe" color="#1e40af">Coachee & Hasil Diskusi</CardHeader>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
            Cari coachee lewat kolom pencarian — hasil dibatasi ke Unit Kerja Anda sendiri sebagai Coach. Nama &amp;
            Jabatan otomatis terisi begitu salah satu hasil dipilih.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {coachees.map((row, idx) => (
              <div
                key={row._key}
                className="coachee-block"
                style={idx > 0 ? { paddingTop: 24, borderTop: '1.5px dashed var(--border2)' } : undefined}
              >
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                  <div className="coachee-block-title">COACHEE {idx + 1}</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
                    <Field label="Waktu">
                      <input
                        type="date"
                        value={row.waktu}
                        onChange={(e) => updateCoachee(idx, { waktu: e.target.value })}
                        style={{ minWidth: 150 }}
                      />
                    </Field>
                    {coachees.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCoachee(idx)}
                        title="Hapus coachee ini"
                        style={{
                          width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border2)', background: 'var(--bg2)',
                          color: 'var(--danger)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}
                      >
                        <Icon name="trash" size={13} strokeWidth={2.4} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="coachee-field-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 10 }}>
                  <Field label={`Cari Coachee (Unit Kerja: ${header.unit_kerja || '—'})`}>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        value={row.coachee_query}
                        onChange={(e) => handleCoacheeQueryChange(idx, row._key, e.target.value)}
                        onFocus={() => handleCoacheeFocus(idx, row._key, row.coachee_query)}
                        onBlur={() => setTimeout(() => setRowSearch(row._key, { open: false }), 150)}
                        placeholder={header.unit_kerja ? 'Ketik nama atau NIK…' : 'Menunggu Unit Kerja Coach…'}
                        disabled={!header.unit_kerja}
                        autoComplete="off"
                      />
                      {coacheeSearch[row._key]?.open && header.unit_kerja && (
                        <div className="coachee-search-dropdown">
                          {coacheeSearch[row._key]?.loading ? (
                            <div className="coachee-search-empty">Mencari…</div>
                          ) : (coacheeSearch[row._key]?.results || []).length > 0 ? (
                            coacheeSearch[row._key].results.map((r) => (
                              <div
                                key={r.nik}
                                className="tp-result-item"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => selectCoacheeResult(idx, row._key, r)}
                              >
                                <span>{r.nama} <span style={{ color: 'var(--dim)' }}>· {r.nik}</span></span>
                                <span style={{ color: 'var(--dim)', fontSize: 11 }}>{r.posisi}</span>
                              </div>
                            ))
                          ) : row.coachee_query ? (
                            <div className="coachee-search-empty">Tidak ditemukan di Unit Kerja Anda.</div>
                          ) : (
                            <div className="coachee-search-empty">Belum ada data karyawan di Unit Kerja Anda.</div>
                          )}
                        </div>
                      )}
                    </div>
                  </Field>
                  <Field label="Nama Coachee">
                    <input
                      type="text"
                      value={row.coachee_nama}
                      readOnly
                      placeholder="Terisi otomatis dari hasil pencarian"
                      style={{ background: 'var(--bg3)', color: 'var(--muted)' }}
                    />
                  </Field>
                  <Field label="Jabatan Coachee">
                    <input
                      type="text"
                      value={row.coachee_jabatan}
                      readOnly
                      placeholder="Terisi otomatis dari hasil pencarian"
                      style={{ background: 'var(--bg3)', color: 'var(--muted)' }}
                    />
                  </Field>
                </div>

                <div className="coachee-field-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(160px,1fr) 2fr', gap: 10, marginBottom: 10, alignItems: 'start' }}>
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
                  <Field label="Hasil Diskusi (Evaluasi Kinerja)">
                    <textarea
                      style={textareaStyle}
                      value={row.hasil_diskusi_kinerja}
                      onChange={(e) => updateCoachee(idx, { hasil_diskusi_kinerja: e.target.value })}
                      placeholder="Diisi hasil diskusi terkait evaluasi kinerja"
                    />
                  </Field>
                </div>

                {/* TOPIK LAIN — bisa lebih dari 1 pasang (Topik + Hasil Diskusinya
                    sendiri), tiap pasang ditambah lewat "+ Tambah Topik Lain" di
                    bawah, sesuai desain referensi. */}
                {row.topikLainRows.map((t, tIdx) => (
                  <div
                    className="coachee-field-grid"
                    key={t._key}
                    style={{ display: 'grid', gridTemplateColumns: 'minmax(160px,1fr) 2fr', gap: 10, marginBottom: 10, alignItems: 'start' }}
                  >
                    <Field label={tIdx === 0 ? 'Topik Lain' : `Topik Lain #${tIdx + 1}`}>
                      <select
                        value={t.topik}
                        onChange={(e) => updateTopikLainRow(idx, t._key, { topik: e.target.value })}
                      >
                        {TOPIK_LAIN_OPTIONS.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Hasil Diskusi (Topik Lain)">
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <textarea
                          style={{ ...textareaStyle, flex: 1 }}
                          value={t.hasil_diskusi}
                          onChange={(e) => updateTopikLainRow(idx, t._key, { hasil_diskusi: e.target.value })}
                          placeholder="Diisi hasil diskusi terkait topik lain"
                        />
                        {row.topikLainRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTopikLainRow(idx, t._key)}
                            title="Hapus topik ini"
                            className="eh-icon-btn"
                            style={{ marginTop: 6 }}
                          >
                            <Icon name="trash" size={12} strokeWidth={2.4} />
                          </button>
                        )}
                      </div>
                    </Field>
                  </div>
                ))}

                <button type="button" onClick={() => addTopikLainRow(idx)} className="add-topik-lain-btn">
                  <Icon name="plus" size={14} strokeWidth={2.8} />
                  Tambah Topik Lain
                </button>

                <div className="coachee-field-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(160px,1fr) 2fr', gap: 10, marginTop: 20, alignItems: 'start' }}>
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
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
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
        <div className="card">
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
                              <div style={{ marginBottom: 4 }}>
                                {c.hasil_diskusi_topik.split('\n').map((line, i) => (
                                  <div key={i}>
                                    <strong>{line.split(':')[0]}:</strong>{line.slice(line.indexOf(':') + 1)}
                                  </div>
                                ))}
                              </div>
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
