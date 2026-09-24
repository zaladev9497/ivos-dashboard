import { createClient } from '@supabase/supabase-js'

// Server-side only — uses the service role key which bypasses RLS.
// Never import this in client components.
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Check .env.local.'
    )
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  })
}
