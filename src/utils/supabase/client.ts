import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // We use non-null assertions here because if these are missing, the app cannot function
  // and we want it to throw early rather than failing silently.
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
