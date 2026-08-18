// Mock ringan untuk `supabase` (chainable query builder) supaya komponen/lib yang
// bergantung pada Supabase bisa ditest tanpa koneksi jaringan asli.
// Pakai: vi.mock('../../lib/supabaseClient.js', () => ({ supabase: makeSupabaseMock({...}) }))
import { vi } from 'vitest'

export function makeSupabaseMock(overrides = {}) {
  const resultFor = (table) => overrides.tableResults?.[table] || { data: [], error: null, count: 0 }
  let currentTable = null

  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    or: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    maybeSingle: vi.fn(() => Promise.resolve(resultFor(currentTable))),
    // Chain itu sendiri "thenable" (meniru query builder Supabase yang bisa langsung
    // di-await/.then()/.finally() tanpa perlu memanggil method terminal lain dulu).
    // Diimplementasikan lewat Promise asli supaya `.then().finally()` tetap bisa dirantai.
    then: (onFulfilled, onRejected) => Promise.resolve(resultFor(currentTable)).then(onFulfilled, onRejected),
    finally: (onFinally) => Promise.resolve(resultFor(currentTable)).finally(onFinally),
    insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    update: vi.fn(() => chain),
  }

  return {
    from: vi.fn((table) => {
      currentTable = table
      return chain
    }),
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithPassword: vi.fn(() => Promise.resolve({ data: {}, error: null })),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
    },
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/foto.jpg' } })),
      })),
    },
    ...overrides,
  }
}
