import { createClient } from '@/lib/supabase/server'
export async function getServerUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}