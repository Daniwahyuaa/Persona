// Setup global untuk Vitest: menambahkan matcher jest-dom (toBeInTheDocument, dll)
// dan membersihkan DOM setelah tiap test supaya test satu sama lain tidak bocor.
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
})

// import.meta.env dipakai supabaseClient.js — isi nilai dummy supaya createClient()
// tidak melempar warning/error saat file itu di-import dalam test.
if (!import.meta.env.VITE_SUPABASE_URL) {
  import.meta.env.VITE_SUPABASE_URL = 'https://example.supabase.co'
}
if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
  import.meta.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key'
}

// matchMedia tidak ada di jsdom — beberapa komponen tema/responsive mungkin memakainya.
window.matchMedia = window.matchMedia || function () {
  return {
    matches: false,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }
}
