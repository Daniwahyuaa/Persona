// Ilustrasi panel kiri halaman login: foto kawasan pabrik & gedung kantor
// Sinergi Gula Nusantara. Tiap mode (light/dark) punya 2 foto yang saling
// crossfade otomatis (slideshow), dan saat tema berpindah, set foto yang
// ditampilkan juga ikut fade ke set siang/malam yang sesuai.

import { useEffect, useState } from 'react'
import factoryDay from '../assets/login/factory-day.png'
import factoryNight from '../assets/login/factory-night.png'
import buildingDay from '../assets/login/building-day.png'
import buildingNight from '../assets/login/building-night.png'

// Durasi tiap foto tampil sebelum fade ke foto berikutnya dalam mode yang sama.
const SLIDE_INTERVAL_MS = 5000

const dayPhotos = [
  { key: 'day-factory', src: factoryDay, alt: 'Pabrik Sinergi Gula Nusantara di siang hari' },
  { key: 'day-building', src: buildingDay, alt: 'Gedung Sinergi Gula Nusantara di siang hari' },
]

const nightPhotos = [
  { key: 'night-factory', src: factoryNight, alt: 'Pabrik Sinergi Gula Nusantara di malam hari' },
  { key: 'night-building', src: buildingNight, alt: 'Gedung Sinergi Gula Nusantara di malam hari' },
]

export default function LoginVisual({ theme = 'light' }) {
  const isNight = theme === 'dark'
  const [dayIndex, setDayIndex] = useState(0)
  const [nightIndex, setNightIndex] = useState(0)

  // Slideshow berjalan terus di background untuk kedua mode, supaya begitu
  // user ganti tema, foto yang muncul tidak selalu foto pertama saja.
  useEffect(() => {
    const interval = setInterval(() => {
      setDayIndex((i) => (i + 1) % dayPhotos.length)
      setNightIndex((i) => (i + 1) % nightPhotos.length)
    }, SLIDE_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      {dayPhotos.map((photo, i) => (
        <img
          key={photo.key}
          className={`login-visual-photo${!isNight && i === dayIndex ? ' is-visible' : ''}`}
          src={photo.src}
          alt={photo.alt}
          draggable={false}
        />
      ))}
      {nightPhotos.map((photo, i) => (
        <img
          key={photo.key}
          className={`login-visual-photo${isNight && i === nightIndex ? ' is-visible' : ''}`}
          src={photo.src}
          alt={photo.alt}
          draggable={false}
        />
      ))}
    </>
  )
}
