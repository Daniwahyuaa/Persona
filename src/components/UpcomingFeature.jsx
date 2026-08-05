export default function UpcomingFeature({ description }) {
  return (
    <div className="upcoming-feature">
      <div className="uf-icon">🚧</div>
      <div className="uf-title">Upcoming Feature</div>
      <p>{description}</p>
    </div>
  )
}
