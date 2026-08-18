import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { makeSupabaseMock } from '../../test/mockSupabase.js'

vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { nik: '12345', role: 'user', nama: 'Tester' } }),
}))

vi.mock('../../lib/supabaseClient.js', () => ({
  supabase: makeSupabaseMock(),
}))

const { default: EditProfile } = await import('./EditProfile.jsx')

async function addAchievement(user, text) {
  const input = screen.getByPlaceholderText(/Sertifikasi Project Management/)
  await user.clear(input)
  await user.type(input, text)
  await user.click(screen.getByRole('button', { name: /\+ Tambah ke Daftar/ }))
}

describe('EditProfile — batas maksimal 5 riwayat', () => {
  it('menampilkan keterangan batas maksimal 5 riwayat (4 terakhir + 1 top)', async () => {
    render(<EditProfile />)
    await waitFor(() => expect(screen.getByText(/0\/5 riwayat terpakai/)).toBeInTheDocument())
    expect(screen.getByText(/Maksimal/)).toBeInTheDocument()
  })

  it('boleh menambahkan sampai 4 kegiatan kategori "Kegiatan 5 Tahun Terakhir"', async () => {
    const user = userEvent.setup()
    render(<EditProfile />)
    await waitFor(() => expect(screen.getByText(/0\/5 riwayat terpakai/)).toBeInTheDocument())

    for (let i = 1; i <= 4; i++) {
      await addAchievement(user, `Kegiatan ${i}`)
    }
    expect(screen.getByText(/4\/5 riwayat terpakai/)).toBeInTheDocument()
    expect(screen.getByText(/4\/4 Reguler/)).toBeInTheDocument()
  })

  it('tombol "+ Tambah ke Daftar" nonaktif setelah kategori "recent" mencapai 4', async () => {
    const user = userEvent.setup()
    render(<EditProfile />)
    await waitFor(() => expect(screen.getByText(/0\/5 riwayat terpakai/)).toBeInTheDocument())

    for (let i = 1; i <= 4; i++) {
      await addAchievement(user, `Kegiatan ${i}`)
    }
    const addBtn = screen.getByRole('button', { name: /\+ Tambah ke Daftar/ })
    expect(addBtn).toBeDisabled()
  })

  it('kategori "Top History" dibatasi maksimal 1 walau kuota recent belum penuh', async () => {
    const user = userEvent.setup()
    render(<EditProfile />)
    await waitFor(() => expect(screen.getByText(/0\/5 riwayat terpakai/)).toBeInTheDocument())

    await user.selectOptions(screen.getByDisplayValue(/Kegiatan 5 Tahun Terakhir/), 'top')
    await addAchievement(user, 'Penghargaan Utama')
    expect(screen.getByText(/1\/5 riwayat terpakai/)).toBeInTheDocument()
    expect(screen.getByText(/1\/1 Top/)).toBeInTheDocument()

    // Coba tambah top history kedua -> harus tetap 1/1, tidak nambah ke queue
    await addAchievement(user, 'Penghargaan Kedua')
    expect(screen.getByText(/1\/1 Top/)).toBeInTheDocument()
  })

  it('total gabungan tidak pernah melebihi 5 riwayat', async () => {
    const user = userEvent.setup()
    render(<EditProfile />)
    await waitFor(() => expect(screen.getByText(/0\/5 riwayat terpakai/)).toBeInTheDocument())

    for (let i = 1; i <= 4; i++) {
      await addAchievement(user, `Kegiatan ${i}`)
    }
    await user.selectOptions(screen.getByDisplayValue(/Kegiatan 5 Tahun Terakhir/), 'top')
    await addAchievement(user, 'Top Akhir')

    expect(screen.getByText(/5\/5 riwayat terpakai/)).toBeInTheDocument()
    const addBtn = screen.getByRole('button', { name: /\+ Tambah ke Daftar/ })
    expect(addBtn).toBeDisabled()
  })
})
