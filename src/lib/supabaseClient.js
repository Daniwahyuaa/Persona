import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Tidak melempar error agar app tetap bisa jalan untuk dicek strukturnya,
  // tapi login/session tidak akan berfungsi sampai env var diisi.
  // eslint-disable-next-line no-console
  console.error(
    '[supabaseClient] VITE_SUPABASE_URL dan/atau VITE_SUPABASE_ANON_KEY belum diisi. ' +
      'Isi file .env di root project (lihat .env.example).'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
