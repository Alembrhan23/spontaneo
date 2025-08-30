// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/database.types'

/**
 * Create a Supabase server client at request time.
 * Next 15: you MUST await cookies().
 */
export async function createClient() {
  const cookieStore = await cookies()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new Error(
      'Supabase env vars missing (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)'
    )
  }

  return createServerClient<Database>(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options?: any) {
        cookieStore.set({ name, value, ...options })
      },
      remove(name: string, options?: any) {
        // Use an expired cookie to remove (Supabase SSR pattern)
        cookieStore.set({ name, value: '', ...options, expires: new Date(0) })
      },
    },
  })
}

// ✅ Backwards-compatible alias so old imports keep working:
export const server = createClient
