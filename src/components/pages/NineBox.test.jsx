import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import NineBox from './NineBox.jsx'

describe('NineBox page', () => {
  it('menampilkan judul "9-Box Talent Grid" dan penjelasan kategori', () => {
    render(<NineBox />)
    expect(screen.getByText('9-Box Talent Grid')).toBeInTheDocument()
    expect(screen.getByText(/Talenta berpotensi tinggi/)).toBeInTheDocument()
  })

  it('menampilkan 5 kategori penjelasan (High Potential s.d. Unfit)', () => {
    render(<NineBox />)
    expect(screen.getByText(/High Potential/)).toBeInTheDocument()
    expect(screen.getByText(/Promotable/)).toBeInTheDocument()
    expect(screen.getByText(/Solid Contributor/)).toBeInTheDocument()
    expect(screen.getByText(/Sleeping Tiger/)).toBeInTheDocument()
    expect(screen.getByText(/Unfit/)).toBeInTheDocument()
  })

  it('matriks 9box (grid) berada SEBELUM (di kiri) blok penjelasan dalam urutan DOM', () => {
    const { container } = render(<NineBox />)
    const layout = container.querySelector('.nb-layout')
    expect(layout).toBeTruthy()

    // Anak pertama dari .nb-layout harus berisi grid (card "9-Box Talent Grid"),
    // anak kedua berisi kartu penjelasan kategori ("Talenta berpotensi tinggi").
    const [first, second] = Array.from(layout.children)
    expect(first.textContent).toContain('9-Box Talent Grid')
    expect(second.textContent).toContain('Talenta berpotensi tinggi')
  })

  it('grid berisi 9 sel dengan angka romawi I - IX', () => {
    render(<NineBox />)
    ;['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'].forEach((roman) => {
      expect(screen.getByText(roman)).toBeInTheDocument()
    })
  })
})
