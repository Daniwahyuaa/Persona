import { useState } from 'react'
import Icon from './Icon.jsx'
import HelpdeskModal from './HelpdeskModal.jsx'
import { getVisibleNavSections } from '../data/navItems.js'
import { useTheme } from '../context/ThemeContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { avatarColor, initials } from '../lib/avatar.js'
import logoColor from '../assets/logo-color.png'
import logoWhite from '../assets/logo-white.png'

// Label peran dalam Bahasa Indonesia, disalin dari roleLabel map di index.html asli.
const ROLE_LABELS = { superadmin: 'Super Admin', admin: 'Admin', executive: 'Executive', user: 'User' }

export default function Sidebar({
  activeMenu,
  onSelectMenu,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  inboxCount = 0,
}) {
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const [helpdeskOpen, setHelpdeskOpen] = useState(false)

  const visibleSections = getVisibleNavSections(user?.role)
  const nama = user?.nama || '—'
  const roleLabel = ROLE_LABELS[String(user?.role || 'user').toLowerCase()] || 'User'

  function handleItemClick(item) {
    onSelectMenu(item.id)
  }

  const sidebarClass = ['sidebar', collapsed ? 'collapsed' : '', mobileOpen ? 'mobile-open' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <div className={sidebarClass}>
      <aside className="sidebar-panel">
        <div className="logo">
          <div className="logo-inner">
            <img src={theme === 'dark' ? logoWhite : logoColor} alt="Persona" />
          </div>
          {!collapsed && (
            <div className="logo-greeting">Halo, <strong>{nama}</strong></div>
          )}
        </div>

        <nav className="nav">
          {visibleSections.map((section) => (
            <div key={section.id || section.label}>
              <div className="nav-section">{section.label}</div>
              {section.items.map((item) => (
                <div
                  key={item.id}
                  className={`nav-item${activeMenu === item.id ? ' active' : ''}`}
                  onClick={() => handleItemClick(item)}
                  style={item.badge && !collapsed ? { justifyContent: 'space-between' } : undefined}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <Icon name={item.icon} />
                    {item.label}
                  </span>
                  {item.badge && !collapsed && inboxCount > 0 && (
                    <span className="nav-badge">{inboxCount}</span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sf-row sf-toggle-row" onClick={toggleTheme}>
            <span className="sf-label">Dark Mode</span>
            <button
              type="button"
              className={`theme-toggle-switch${theme === 'dark' ? ' on' : ''}`}
              aria-label="Toggle dark mode"
              onClick={(e) => {
                e.stopPropagation()
                toggleTheme()
              }}
            />
          </div>

          <button type="button" className="sf-help-btn" onClick={() => setHelpdeskOpen(true)}>
            <Icon name="helpCircle" size={14} strokeWidth={2} />
            Hubungi Helpdesk
          </button>

          <div className="sf-profile-card">
            <div className="sf-profile-avatar" style={{ background: avatarColor(nama) }}>
              {initials(nama)}
            </div>
            <div className="sf-profile-body">
              <div className="sf-profile-name">{nama}</div>
              <div className="sf-profile-role">{roleLabel}</div>
            </div>
            <button type="button" className="sf-profile-logout" onClick={logout} title="Keluar">
              <Icon name="logout" size={15} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      </aside>

      {/* Tombol ciutkan/lebarkan: anak langsung wrapper .sidebar (bukan
          .sidebar-panel yang overflow-y:auto), supaya bagian yang "nongol"
          keluar dari garis batas sidebar tidak ikut ter-clip/ketutupan. */}
      <button id="sidebar-collapse-btn" onClick={onToggleCollapse} title="Ciutkan/lebarkan menu">
        <Icon name="chevronLeft" size={14} strokeWidth={2.5} id="sidebar-collapse-icon" />
      </button>

      {helpdeskOpen && <HelpdeskModal onClose={() => setHelpdeskOpen(false)} />}
    </div>
  )
}
