import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/types'

/**
 * Creates a Supabase browser client. Throws if called during SSR or if
 * required environment variables are missing. All consumers must be
 * 'use client' components.
 */
 
export function createSupabaseBrowserClient(): any {
  if (typeof window === 'undefined') {
    return null as any
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.'
    )
  }
  return createBrowserClient<Database>(url, key)
}
