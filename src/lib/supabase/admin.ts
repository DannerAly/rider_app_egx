import { createClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase con service role key.
 * SOLO usar en Route Handlers del servidor — nunca en Client Components.
 * Bypasea RLS completamente.
 */
export function createAdminClient() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY no está configurada')

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession:   false,
    },
  })
}
