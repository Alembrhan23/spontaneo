// src/lib/server-user.ts
import { createClient } from '@/lib/supabase/server'

/**
 * Lazily creates a Supabase server client and fetches the current user.
 * IMPORTANT: `createClient()` is async — you must `await` it.
 */
export async function getServerUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}
