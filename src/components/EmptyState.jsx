export default function EmptyState({ icon = '🚧', title, subtitle }) {
  return (
    <div className="card">
      <div className="empty-state">
        <div className="es-icon">{icon}</div>
        <div className="es-title">{title}</div>
        {subtitle && <div className="es-sub">{subtitle}</div>}
      </div>
    </div>
  )
}
