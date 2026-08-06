import Icon from './Icon.jsx'
import { getVisibleNavSections } from '../data/navItems.js'
import { useTheme } from '../context/ThemeContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import logoColor from '../assets/logo-color.png'
import logoWhite from '../assets/logo-white.png'

// Label peran dalam Bahasa Indonesia, disalin dari roleLabel map di index.html asli.
const ROLE_LABELS = { superadmin: 'super admin', admin: 'admin', executive: 'executive', user: 'user' }

export default function Sidebar({
  activeMenu,
  onSelectMenu,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onOpenUploadModal,
  inboxCount = 0,
}) {
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()

  const visibleSections = getVisibleNavSections(user?.role)

  function handleItemClick(item) {
    if (item.action === 'openUploadModal') {
      onOpenUploadModal?.()
      return
    }
    onSelectMenu(item.id)
  }

  const sidebarClass = ['sidebar', collapsed ? 'collapsed' : '', mobileOpen ? 'mobile-open' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <aside className={sidebarClass}>
      <div className="logo">
        <button id="sidebar-collapse-btn" onClick={onToggleCollapse} title="Ciutkan/lebarkan menu">
          <Icon name="chevronLeft" size={14} strokeWidth={2.5} id="sidebar-collapse-icon" />
        </button>
        <div className="logo-inner">
          <img src={theme === 'dark' ? logoWhite : logoColor} alt="Persona" />
        </div>
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
                style={item.badge ? { justifyContent: 'space-between' } : undefined}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <Icon name={item.icon} />
                  {item.label}
                </span>
                {item.badge && inboxCount > 0 && <span className="nav-badge">{inboxCount}</span>}
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
        <div className="sf-row">
          <span className="sf-label">Login sebagai</span>
          <span className="sf-val">
            {user?.nama || '—'} ({ROLE_LABELS[String(user?.role || 'user').toLowerCase()] || 'user'})
          </span>
        </div>
        <button className="btn-logout" onClick={logout}>
          Keluar
        </button>
      </div>
    </aside>
  )
}
