// Radar chart SVG murni (tanpa dependensi chart library), meniru konfigurasi
// Chart.js `type: 'radar'` di index.html asli (asesmenRenderDetail()): skala
// 0-4, grid poligon per-tick, garis sudut, label sudut, dan 1-2 dataset
// (garis solid berisi "Skor", garis putus-putus "RCL").
export default function RadarChart({ labels, datasets, min = 0, max = 4, step = 1, size = 320 }) {
  const n = labels.length
  if (n < 3) return null

  const center = size / 2
  const radius = size / 2 - 46 // sisakan ruang utk label sudut
  const angleForIndex = (i) => (Math.PI * 2 * i) / n - Math.PI / 2

  const pointFor = (value, i) => {
    const r = (Math.max(min, Math.min(max, value)) - min) / (max - min) * radius
    const angle = angleForIndex(i)
    return [center + r * Math.cos(angle), center + r * Math.sin(angle)]
  }

  const ticks = []
  for (let t = min; t <= max; t += step) ticks.push(t)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size }}>
        {/* Grid poligon per tick */}
        {ticks.map((t) => {
          const r = (t - min) / (max - min) * radius
          const pts = labels
            .map((_, i) => {
              const angle = angleForIndex(i)
              return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`
            })
            .join(' ')
          return <polygon key={t} points={pts} fill="none" stroke="rgba(0,0,0,.07)" strokeWidth="1" />
        })}
        {/* Garis sudut */}
        {labels.map((_, i) => {
          const angle = angleForIndex(i)
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={center + radius * Math.cos(angle)}
              y2={center + radius * Math.sin(angle)}
              stroke="rgba(0,0,0,.07)"
              strokeWidth="1"
            />
          )
        })}
        {/* Angka skala di sumbu vertikal atas */}
        {ticks.slice(1).map((t) => {
          const r = (t - min) / (max - min) * radius
          return (
            <text key={t} x={center + 4} y={center - r} fontSize="9" fill="#9ca3af">
              {t}
            </text>
          )
        })}
        {/* Dataset polygons */}
        {datasets.map((ds, di) => {
          const pts = ds.data.map((v, i) => pointFor(v, i).join(',')).join(' ')
          return (
            <g key={di}>
              <polygon
                points={pts}
                fill={ds.backgroundColor}
                stroke={ds.borderColor}
                strokeWidth={ds.borderWidth}
                strokeDasharray={ds.borderDash ? ds.borderDash.join(',') : undefined}
              />
              {ds.pointRadius > 0 &&
                ds.data.map((v, i) => {
                  const [x, y] = pointFor(v, i)
                  return <circle key={i} cx={x} cy={y} r={ds.pointRadius} fill={ds.pointBackgroundColor} />
                })}
            </g>
          )
        })}
        {/* Label sudut (nama kompetensi) */}
        {labels.map((label, i) => {
          const angle = angleForIndex(i)
          const lx = center + (radius + 22) * Math.cos(angle)
          const ly = center + (radius + 22) * Math.sin(angle)
          const anchor = Math.cos(angle) > 0.15 ? 'start' : Math.cos(angle) < -0.15 ? 'end' : 'middle'
          return (
            <text
              key={label + i}
              x={lx}
              y={ly}
              fontSize="9.5"
              fontWeight="600"
              fill="#374151"
              textAnchor={anchor}
              dominantBaseline="middle"
            >
              {label}
            </text>
          )
        })}
      </svg>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
        {datasets.map((ds, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5 }}>
            <span
              style={{
                width: 9, height: 9, borderRadius: ds.pointRadius > 0 ? '50%' : 2,
                background: ds.pointRadius > 0 ? ds.borderColor : 'transparent',
                border: ds.pointRadius > 0 ? 'none' : `1.5px dashed ${ds.borderColor}`,
                flexShrink: 0,
              }}
            />
            {ds.label}
          </div>
        ))}
      </div>
    </div>
  )
}
