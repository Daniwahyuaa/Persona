import Icon from './Icon.jsx'

/**
 * Topbar generik dipakai di semua halaman menu, meniru <div class="topbar">
 * di index.html asli. Dua mode:
 *  - tabs: [{ id, label, icon, count }] + activeTab/onSelectTab -> tab bar bisa diklik
 *  - title-only: cukup kirim `icon` + `title` -> judul statis dengan garis bawah aksen
 */
export default function Topbar({ tabs, activeTab, onSelectTab, icon, title, extra }) {
  if (tabs && tabs.length > 0) {
    return (
      <div className="topbar">
        {extra}
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`top-tab${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => onSelectTab?.(tab.id)}
          >
            {tab.icon && <Icon name={tab.icon} size={14} />}
            {tab.label}
            {typeof tab.count !== 'undefined' && <span className="tab-count">{tab.count}</span>}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="topbar" style={{ padding: '0 28px', gap: 4, justifyContent: extra ? 'space-between' : 'flex-start' }}>
      <div className="topbar-simple-title">
        {icon && <Icon name={icon} size={14} strokeWidth={2} style={{ color: 'var(--accent)' }} />}
        <span>{title}</span>
      </div>
      {extra}
    </div>
  )
}
