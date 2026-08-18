import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CliMini } from './TalentProfile.jsx'

describe('CliMini (kartu Hasil CLI Terakhir)', () => {
  const cli = { diukur: 10, benar: 7, rerata: 70 }

  it('menampilkan pesan "Belum ada data" kalau diukur = 0', () => {
    render(<CliMini cli={{ diukur: 0 }} label="Soft CLI" />)
    expect(screen.getByText(/Belum ada data Soft CLI/)).toBeInTheDocument()
  })

  it('menampilkan angka Diukur dan Tercapai dengan benar', () => {
    render(<CliMini cli={cli} label="Soft CLI" />)
    expect(screen.getByText('Diukur')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('Tercapai')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('kotak "Diukur" berwarna kuning (bukan warna netral bg3)', () => {
    render(<CliMini cli={cli} label="Soft CLI" />)
    const diukurBox = screen.getByText('Diukur').closest('div')
    expect(diukurBox.style.background).toBe('rgb(254, 249, 195)') // #fef9c3
  })

  it('kotak "Tercapai" berwarna hijau muda (bukan warna netral bg3)', () => {
    render(<CliMini cli={cli} label="Soft CLI" />)
    const tercapaiBox = screen.getByText('Tercapai').closest('div')
    expect(tercapaiBox.style.background).toBe('rgb(220, 252, 231)') // #dcfce7
  })

  it('warna Diukur dan Tercapai berbeda satu sama lain', () => {
    render(<CliMini cli={cli} label="Soft CLI" />)
    const diukurBox = screen.getByText('Diukur').closest('div')
    const tercapaiBox = screen.getByText('Tercapai').closest('div')
    expect(diukurBox.style.background).not.toBe(tercapaiBox.style.background)
  })
})
