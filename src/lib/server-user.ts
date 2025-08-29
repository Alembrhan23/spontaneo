// src/lib/server-user.ts
import { createClient } from '@/lib/supabase/server'

export async function getServerUser() {
  // ⬅️ CRITICAL: await the async factory
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabase, user }
}
