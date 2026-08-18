import { createContext, useContext, useMemo, useState } from 'react'

// Context ini menyimpan state hasil pencarian & analisa di halaman
// "Talent Point System" (5 slot kandidat + hasil ranking) secara GLOBAL,
// di luar komponen halamannya sendiri.
//
// Alasannya: komponen halaman TalentPointSystem di-unmount setiap kali user
// pindah ke menu lain (lihat MainContent.jsx yang hanya me-render 1 komponen
// aktif), jadi kalau state-nya disimpan lokal (useState di dalam komponen),
// hasil pencarian 5 orang otomatis hilang begitu pindah halaman lalu balik lagi.
// Dengan menyimpannya di context yang di-mount di level atas (main.jsx),
// state ini tetap ada selama sesi berjalan — baru hilang kalau user sendiri
// menekan tombol "Reset".
const TalentPointSystemContext = createContext(null)

const INITIAL_SLOTS = ['', '', null, null, null]

export function TalentPointSystemProvider({ children }) {
  const [slots, setSlots] = useState(INITIAL_SLOTS)
  const [ranked, setRanked] = useState(null)
  const [analyzeError, setAnalyzeError] = useState(null)

  function resetAll() {
    setSlots(INITIAL_SLOTS)
    setRanked(null)
    setAnalyzeError(null)
  }

  const value = useMemo(
    () => ({ slots, setSlots, ranked, setRanked, analyzeError, setAnalyzeError, resetAll }),
    [slots, ranked, analyzeError]
  )

  return (
    <TalentPointSystemContext.Provider value={value}>
      {children}
    </TalentPointSystemContext.Provider>
  )
}

export function useTalentPointSystem() {
  const ctx = useContext(TalentPointSystemContext)
  if (!ctx) throw new Error('useTalentPointSystem harus dipakai di dalam <TalentPointSystemProvider>')
  return ctx
}
