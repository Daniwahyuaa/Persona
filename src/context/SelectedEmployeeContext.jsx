import { createContext, useContext, useMemo, useState } from 'react'

// Context ini menyimpan NIK karyawan yang sedang "dipilih" secara GLOBAL,
// dipakai bersama oleh 3 halaman: Talent Profile, Asesmen, dan CLI (Kompetensi).
//
// Tujuannya: ketika user mencari & memilih nama karyawan di salah satu dari
// ketiga halaman itu (paling umum: Talent Profile), lalu pindah ke halaman
// Asesmen atau CLI, karyawan yang sama otomatis ikut tampil di sana — tanpa
// harus mencari ulang. Sebaliknya juga berlaku: memilih karyawan di Asesmen
// atau CLI ikut mengubah tampilan di Talent Profile.
const SelectedEmployeeContext = createContext(null)

export function SelectedEmployeeProvider({ children }) {
  const [selectedNik, setSelectedNik] = useState(null)

  const value = useMemo(() => ({ selectedNik, setSelectedNik }), [selectedNik])

  return (
    <SelectedEmployeeContext.Provider value={value}>
      {children}
    </SelectedEmployeeContext.Provider>
  )
}

export function useSelectedEmployee() {
  const ctx = useContext(SelectedEmployeeContext)
  if (!ctx) throw new Error('useSelectedEmployee harus dipakai di dalam <SelectedEmployeeProvider>')
  return ctx
}
