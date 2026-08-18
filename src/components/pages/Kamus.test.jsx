import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Kamus.jsx memakai useAuth() untuk cek role -> mock supaya tidak butuh AuthProvider/supabase asli.
vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { role: 'admin' } }),
}))

const { default: Kamus } = await import('./Kamus.jsx')

describe('Kamus page — ikon pada tab', () => {
  it('tab "10 Kompetensi BUMN" dan "Kompetensi PTPN Group" masing-masing punya ikon SVG', () => {
    render(<Kamus />)
    const tabBumn = screen.getByText('10 Kompetensi BUMN').closest('.top-tab')
    const tabPtpn = screen.getByText('Kompetensi PTPN Group').closest('.top-tab')
    expect(tabBumn.querySelector('svg')).toBeTruthy()
    expect(tabPtpn.querySelector('svg')).toBeTruthy()
  })

  it('sub-tab "Soft Competency" dan "Hard Competency" masing-masing punya ikon SVG', () => {
    render(<Kamus />)
    // default topTab adalah 'bumn', pindah dulu ke tab PTPN supaya sub-tab muncul
    screen.getByText('Kompetensi PTPN Group').click()
    const softBtn = screen.getByText('Soft Competency').closest('button')
    const hardBtn = screen.getByText('Hard Competency').closest('button')
    expect(softBtn.querySelector('svg')).toBeTruthy()
    expect(hardBtn.querySelector('svg')).toBeTruthy()
  })

  it('ikon tab berukuran minimalis (<=14px)', () => {
    render(<Kamus />)
    const tabBumn = screen.getByText('10 Kompetensi BUMN').closest('.top-tab')
    const svg = tabBumn.querySelector('svg')
    expect(Number(svg.getAttribute('width'))).toBeLessThanOrEqual(14)
    expect(Number(svg.getAttribute('height'))).toBeLessThanOrEqual(14)
  })
})
