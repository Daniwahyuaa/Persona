import { useEffect, useState } from 'react'
import Icon from '../Icon.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { listProfiles, adminUpdateRole, adminUpdateNik, adminResetPassword, adminDeleteUser } from '../../lib/adminUsersApi.js'
import { searchKaryawan } from '../../lib/talentProfileApi.js'

const ROLE_LABEL = { superadmin: 'Super Admin', admin: 'Admin', executive: 'Executive', user: 'User' }
const ROLE_BADGE = { superadmin: 'badge-un', admin: 'badge-pr', executive: 'badge-sc', user: 'badge-null' }

// Meniru hirarki di Edge Function admin-user-actions: superadmin boleh kelola
// admin/executive/user (bukan superadmin lain); admin hanya boleh kelola 'user'.
function canManage(actorRole, targetRole) {
  if (actorRole === 'superadmin') return targetRole !== 'superadmin'
  if (actorRole === 'admin') return targetRole === 'user'
  return false
}

// ── Modal ganti password ──
function ResetPasswordModal({ target, onClose, onSubmit, submitting }) {
  const [pw, setPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [err, setErr] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (pw.length < 6) { setErr('Password minimal 6 karakter.'); return }
    if (pw !== confirmPw) { setErr('Konfirmasi password tidak cocok.'); return }
    setErr('')
    onSubmit(pw)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg2)', borderRadius: 12, padding: 22, width: 360, boxShadow: '0 12px 40px rgba(0,0,0,.25)' }}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>Ganti Password</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
          Untuk <strong>{target.nama || target.username}</strong> ({target.username})
        </div>
        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>Password Baru</label>
        <input
          type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus
          style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border2)', borderRadius: 7, fontSize: 13, background: 'var(--bg2)', color: 'var(--text)', margin: '4px 0 10px', boxSizing: 'border-box' }}
        />
        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>Konfirmasi Password</label>
        <input
          type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
          style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border2)', borderRadius: 7, fontSize: 13, background: 'var(--bg2)', color: 'var(--text)', margin: '4px 0 6px', boxSizing: 'border-box' }}
        />
        {err && <div style={{ fontSize: 11.5, color: 'var(--danger)', marginBottom: 8 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Batal
          </button>
          <button type="submit" disabled={submitting} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}>
            {submitting ? 'Menyimpan…' : 'Simpan Password'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Modal konfirmasi hapus ──
function DeleteConfirmModal({ target, onClose, onConfirm, submitting }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg2)', borderRadius: 12, padding: 22, width: 360, boxShadow: '0 12px 40px rgba(0,0,0,.25)' }}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4, color: 'var(--danger)' }}>Hapus User?</div>
        <div style={{ fontSize: 12.5, color: 'var(--text)', marginBottom: 14, lineHeight: 1.6 }}>
          Akun <strong>{target.nama || target.username}</strong> ({target.username}) akan dihapus permanen dan tidak
          bisa login lagi. Tindakan ini tidak bisa dibatalkan.
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Batal
          </button>
          <button onClick={onConfirm} disabled={submitting} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: 'var(--danger)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}>
            {submitting ? 'Menghapus…' : 'Ya, Hapus'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal tautkan NIK (cari dari data karyawan yang sudah ada di backend) ──
function NikLinkModal({ target, onClose, onSubmit, submitting }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [picked, setPicked] = useState(null)
  const [err, setErr] = useState('')

  async function handleQuery(v) {
    setQuery(v)
    setPicked(null)
    if (!v.trim()) { setResults([]); return }
    try {
      const rows = await searchKaryawan({ query: v })
      setResults(rows)
    } catch {
      setResults([])
    }
  }

  function handleSubmit() {
    if (!picked) { setErr('Pilih salah satu karyawan dari daftar dulu.'); return }
    setErr('')
    onSubmit(picked.nik)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg2)', borderRadius: 12, padding: 22, width: 380, boxShadow: '0 12px 40px rgba(0,0,0,.25)' }}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>Tautkan NIK Karyawan</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
          Untuk akun <strong>{target.nama || target.username}</strong> ({target.username}){target.nik && (
            <> — NIK saat ini: <strong>{target.nik}</strong></>
          )}
        </div>
        <input
          value={query}
          onChange={(e) => handleQuery(e.target.value)}
          placeholder="🔍 Cari nama atau NIK karyawan…"
          autoFocus
          style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border2)', borderRadius: 7, fontSize: 13, background: 'var(--bg2)', color: 'var(--text)', boxSizing: 'border-box', marginBottom: 8 }}
        />
        {results.length > 0 && (
          <div style={{ border: '1px solid var(--border2)', borderRadius: 8, maxHeight: 200, overflowY: 'auto', marginBottom: 10 }}>
            {results.map((r) => (
              <div
                key={r.nik}
                onClick={() => { setPicked(r); setQuery(`${r.nama} (${r.nik})`); setResults([]) }}
                style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid var(--border)' }}
              >
                <div style={{ fontWeight: 700 }}>{r.nama}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>{r.nik} · {r.posisi || '—'}</div>
              </div>
            ))}
          </div>
        )}
        {err && <div style={{ fontSize: 11.5, color: 'var(--danger)', marginBottom: 8 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'space-between' }}>
          {target.nik ? (
            <button
              type="button"
              onClick={() => onSubmit(null)}
              disabled={submitting}
              style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--danger)', background: 'transparent', color: 'var(--danger)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}
            >
              Lepas Tautan
            </button>
          ) : <span />}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onClose} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Batal
            </button>
            <button type="button" onClick={handleSubmit} disabled={submitting} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}>
              {submitting ? 'Menyimpan…' : 'Tautkan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


function UserListTab() {
  const { user: me } = useAuth()
  const myRole = String(me?.role || 'user').toLowerCase()

  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [pwModalTarget, setPwModalTarget] = useState(null)
  const [delModalTarget, setDelModalTarget] = useState(null)
  const [nikModalTarget, setNikModalTarget] = useState(null)

  function load() {
    setRows(null)
    listProfiles().then(setRows).catch((e) => setError(e.message || String(e)))
  }
  useEffect(load, [])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3200)
  }

  async function handleRoleChange(row, newRole) {
    if (newRole === row.role) return
    setBusyId(row.id)
    try {
      await adminUpdateRole(row.id, newRole)
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, role: newRole } : r)))
      showToast(`✅ Role ${row.nama || row.username} diubah jadi ${ROLE_LABEL[newRole]}`)
    } catch (e) {
      showToast('❌ ' + e.message)
    } finally {
      setBusyId(null)
    }
  }

  async function handleResetPassword(newPassword) {
    const target = pwModalTarget
    setBusyId(target.id)
    try {
      await adminResetPassword(target.id, newPassword)
      showToast(`✅ Password ${target.nama || target.username} berhasil diubah`)
      setPwModalTarget(null)
    } catch (e) {
      showToast('❌ ' + e.message)
    } finally {
      setBusyId(null)
    }
  }

  async function handleUpdateNik(nik) {
    const target = nikModalTarget
    setBusyId(target.id)
    try {
      await adminUpdateNik(target.id, nik)
      setRows((prev) => prev.map((r) => (r.id === target.id ? { ...r, nik } : r)))
      showToast(nik ? `✅ NIK ${target.nama || target.username} ditautkan ke ${nik}` : `✅ Tautan NIK ${target.nama || target.username} dilepas`)
      setNikModalTarget(null)
    } catch (e) {
      showToast('❌ ' + e.message)
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete() {
    const target = delModalTarget
    setBusyId(target.id)
    try {
      await adminDeleteUser(target.id)
      setRows((prev) => prev.filter((r) => r.id !== target.id))
      showToast(`✅ ${target.nama || target.username} dihapus`)
      setDelModalTarget(null)
    } catch (e) {
      showToast('❌ ' + e.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="page active">
      <div className="card">
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div className="card-title-icon" style={{ background: '#ede9fe' }}>👑</div>
            Daftar User
          </div>
        </div>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
          Ubah role, ganti password, atau hapus akun user lain. <strong>Superadmin</strong> bisa mengelola
          Admin/Executive/User (bukan superadmin lain). <strong>Admin</strong> hanya bisa mengelola role{' '}
          <strong>User</strong>.
        </p>

        {rows === null && !error && <div style={{ color: 'var(--muted)', fontSize: 12 }}>Memuat…</div>}

        {error && (
          <div className="empty-state">
            <div className="es-icon">⚠️</div>
            <div className="es-title">Gagal memuat daftar user</div>
            <div className="es-sub">{error}</div>
          </div>
        )}

        {rows && rows.length === 0 && (
          <div className="empty-state">
            <div className="es-icon">👥</div>
            <div className="es-title">Belum ada user lain yang bisa ditampilkan</div>
          </div>
        )}

        {rows && rows.length > 0 && (
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Nama</th>
                  <th style={{ textAlign: 'center' }}>Role</th>
                  <th>NIK</th>
                  <th style={{ textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isMe = r.id === me?.id
                  const editable = !isMe && canManage(myRole, r.role)
                  const rowBusy = busyId === r.id
                  const roleOptions = myRole === 'superadmin' ? ['admin', 'executive', 'user'] : ['user']
                  return (
                    <tr key={r.id}>
                      <td>{r.username || '—'}</td>
                      <td>{r.nama || '—'}{isMe && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--dim)' }}>(kamu)</span>}</td>
                      <td style={{ textAlign: 'center' }}>
                        {editable ? (
                          <select
                            value={r.role}
                            disabled={rowBusy}
                            onChange={(e) => handleRoleChange(r, e.target.value)}
                            className="fselect"
                            style={{ fontSize: 11, minWidth: 100 }}
                          >
                            <option value={r.role}>{ROLE_LABEL[r.role] || r.role}</option>
                            {roleOptions.filter((opt) => opt !== r.role).map((opt) => (
                              <option key={opt} value={opt}>{ROLE_LABEL[opt]}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`badge ${ROLE_BADGE[r.role] || 'badge-null'}`}>{ROLE_LABEL[r.role] || r.role}</span>
                        )}
                      </td>
                      <td>
                        {editable ? (
                          <button
                            onClick={() => setNikModalTarget(r)}
                            disabled={rowBusy}
                            style={{ padding: '3px 8px', borderRadius: 6, border: '1px dashed var(--border2)', background: 'transparent', color: r.nik ? 'var(--text)' : 'var(--muted)', fontSize: 11.5, cursor: 'pointer' }}
                          >
                            {r.nik || '+ Tautkan NIK'}
                          </button>
                        ) : (
                          r.nik || '—'
                        )}
                      </td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button
                          disabled={!editable || rowBusy}
                          onClick={() => setPwModalTarget(r)}
                          style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border2)', background: 'transparent', color: editable ? 'var(--muted)' : 'var(--dim)', fontSize: 11, cursor: editable ? 'pointer' : 'not-allowed', marginRight: 6 }}
                        >
                          Ganti Password
                        </button>
                        <button
                          disabled={!editable || rowBusy}
                          onClick={() => setDelModalTarget(r)}
                          style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--danger)', background: 'transparent', color: editable ? 'var(--danger)' : 'var(--dim)', fontSize: 11, cursor: editable ? 'pointer' : 'not-allowed', opacity: editable ? 1 : 0.5 }}
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: toast.startsWith('✅') ? 'var(--accent)' : 'var(--danger)', color: '#fff', padding: '10px 18px', borderRadius: 9, fontSize: 12.5, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,.2)', zIndex: 1100 }}>
          {toast}
        </div>
      )}

      {pwModalTarget && (
        <ResetPasswordModal target={pwModalTarget} submitting={busyId === pwModalTarget.id} onClose={() => setPwModalTarget(null)} onSubmit={handleResetPassword} />
      )}
      {delModalTarget && (
        <DeleteConfirmModal target={delModalTarget} submitting={busyId === delModalTarget.id} onClose={() => setDelModalTarget(null)} onConfirm={handleDelete} />
      )}
      {nikModalTarget && (
        <NikLinkModal target={nikModalTarget} submitting={busyId === nikModalTarget.id} onClose={() => setNikModalTarget(null)} onSubmit={handleUpdateNik} />
      )}
    </div>
  )
}

function UploadUserTab() {
  return (
    <div className="page">
      <div className="card">
        <div className="card-title"><div className="card-title-icon" style={{ background: '#dbeafe' }}>📤</div>Bulk Tambah User dari Excel</div>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
          Upload file Excel berisi kolom <strong>USERNAME, NAMA, ROLE, PASSWORD</strong> (urutan bebas, huruf
          besar/kecil tidak masalah). Username yang sudah ada akan di-update, username baru otomatis ditambahkan.
          Password langsung di-hash — tidak pernah tersimpan sebagai teks polos.
        </p>
        <button
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8,
            border: '1.5px solid var(--accent2)', background: 'transparent', color: 'var(--accent2)',
            fontFamily: 'var(--font-b)', fontSize: 12, fontWeight: 700, cursor: 'pointer', marginBottom: 14,
          }}
        >
          <Icon name="download" size={13} strokeWidth={2.5} />
          Download Template Excel
        </button>
        <div className="upload-zone" style={{ padding: 20 }}>
          <input type="file" accept=".xlsx,.xls,.xlsm,.csv" />
          <div style={{ fontSize: 22, marginBottom: 4 }}>📊</div>
          <div style={{ fontSize: 12.5, fontWeight: 700 }}>Klik atau drag &amp; drop file Excel/CSV</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Kolom: USERNAME, NAMA, ROLE, PASSWORD</div>
        </div>
      </div>
    </div>
  )
}

export default function Users() {
  const [tab, setTab] = useState('list')

  return (
    <div>
      <div className="topbar">
        <div className={`top-tab${tab === 'list' ? ' active' : ''}`} onClick={() => setTab('list')}>
          <Icon name="users" size={14} />
          Daftar User
        </div>
        <div className={`top-tab${tab === 'upload' ? ' active' : ''}`} onClick={() => setTab('upload')}>
          <Icon name="upload2" size={14} />
          Upload &amp; Tambah User
        </div>
      </div>
      <div className="content">{tab === 'list' ? <UserListTab /> : <UploadUserTab />}</div>
    </div>
  )
}
