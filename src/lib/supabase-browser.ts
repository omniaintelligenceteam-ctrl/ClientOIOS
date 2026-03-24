import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/types'

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    // During SSR prerender, env vars may not be available — return a stub
    // The actual client will be created on the browser where env vars exist
    return null as any
  }
  return createBrowserClient<Database>(url, key)
}
