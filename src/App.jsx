import { useEffect, useState } from 'react'
import { useAuth } from './context/AuthContext.jsx'
import LoginScreen from './components/LoginScreen.jsx'
import Sidebar from './components/Sidebar.jsx'
import MainContent from './components/MainContent.jsx'
import Icon from './components/Icon.jsx'
import { getDefaultMenu, canAccessMenu } from './data/navItems.js'
import { avatarColor, initials } from './lib/avatar.js'

export default function App() {
  const { user, checkingSession } = useAuth()
  const [activeMenu, setActiveMenu] = useState(null)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Set menu default begitu role diketahui (tp untuk user/executive, ts untuk admin/superadmin).
  useEffect(() => {
    if (user?.role) {
      setActiveMenu(getDefaultMenu(user.role))
    }
  }, [user?.role])

  // Kunci scroll body saat drawer sidebar mobile terbuka, biar konten di
  // belakangnya tidak ikut ter-scroll (perilaku umum drawer di HP).
  // Pakai teknik position:fixed (bukan cuma overflow:hidden) karena di
  // Safari iOS, overflow:hidden pada body saja tidak selalu mencegah
  // konten di belakangnya ikut scroll/rubber-band saat drawer terbuka.
  useEffect(() => {
    if (!mobileOpen) return

    const scrollY = window.scrollY
    const { body } = document
    const prevStyle = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    }

    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
    body.style.overflow = 'hidden'

    return () => {
      body.style.position = prevStyle.position
      body.style.top = prevStyle.top
      body.style.left = prevStyle.left
      body.style.right = prevStyle.right
      body.style.width = prevStyle.width
      body.style.overflow = prevStyle.overflow
      window.scrollTo(0, scrollY)
    }
  }, [mobileOpen])

  if (checkingSession) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
        <div className="loading-text">Memuat sesi...</div>
      </div>
    )
  }

  if (!user) {
    return <LoginScreen />
  }

  // Guard: kalau activeMenu ternyata tidak boleh diakses role ini (mis. sisa state
  // lama, atau role berubah di tengah sesi), paksa balik ke menu default.
  const safeMenu =
    activeMenu && canAccessMenu(user.role, activeMenu) ? activeMenu : getDefaultMenu(user.role)

  function handleToggleSidebar() {
    // Di desktop tombol ini menciutkan/melebarkan sidebar,
    // di layar mobile tombol yang sama dipakai untuk membuka/menutup sidebar.
    if (window.innerWidth <= 768) {
      setMobileOpen((v) => !v)
    } else {
      setCollapsed((v) => !v)
    }
  }

  function handleSelectMenu(menuId) {
    setActiveMenu(menuId)
    setMobileOpen(false)
  }

  const nama = user.nama || user.username || '—'

  return (
    <>
      {/* Badge "Selamat Datang, {Nama}" + avatar inisial — pojok kanan atas, meniru
          #app-welcome-badge di index.html asli (muncul setelah login, menggantikan
          logo watermark yang tampil di layar login). */}
      <div className="app-welcome-badge">
        <div className="app-welcome-avatar" style={{ background: avatarColor(nama) }}>
          {initials(nama)}
        </div>
        <span className="app-welcome-text">Selamat Datang, {nama}</span>
      </div>

      <div className={`app${mobileOpen ? ' mobile-sidebar-open' : ''}`}>
        <button id="mobile-menu-btn" onClick={handleToggleSidebar} title="Buka menu">
          <Icon name="menuBars" size={18} strokeWidth={2.2} />
        </button>

        <Sidebar
          activeMenu={safeMenu}
          onSelectMenu={handleSelectMenu}
          collapsed={collapsed}
          onToggleCollapse={handleToggleSidebar}
          mobileOpen={mobileOpen}
          onOpenUploadModal={() => alert('Modal upload Excel akan dibuat pada tahap berikutnya.')}
          inboxCount={0}
        />

        {/* Backdrop gelap di belakang sidebar saat dibuka di mobile — tap di luar
            sidebar untuk menutupnya, supaya perilakunya seperti drawer aplikasi native. */}
        {mobileOpen && (
          <div
            className="sidebar-backdrop"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* .main sengaja tidak diberi inert/aria-hidden supaya tidak mengganggu
            komponen di dalamnya; scroll & interaksinya dimatikan lewat CSS
            (.mobile-sidebar-open .main) selama drawer terbuka. */}
        <div className="main">
          <MainContent activeMenu={safeMenu} />
        </div>
      </div>
    </>
  )
}
