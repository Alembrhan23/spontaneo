// lib/ensure-profile.ts
'use client'
import { supabase } from '@/lib/supabase/client'

export async function ensureProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: prof } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!prof) {
    await supabase.from('profiles').insert({ id: user.id, full_name: user.user_metadata?.full_name ?? '' })
  }
  return user
}
