'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type Ctx = {
  user: any | null
  profile: { id: string; full_name: string | null; avatar_url: string | null; is_verified?: boolean } | null
  loading: boolean
  refresh: () => Promise<void>
}

const AuthCtx = createContext<Ctx>({ user: null, profile: null, loading: true, refresh: async () => {} })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null)
  const [profile, setProfile] = useState<Ctx['profile']>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user ?? null)
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, is_verified')
        .eq('id', user.id)
        .maybeSingle()
      setProfile(data ?? null)
    } else {
      setProfile(null)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (!u) { setProfile(null); return }
      supabase
        .from('profiles')
        .select('id, full_name, avatar_url, is_verified')
        .eq('id', u.id)
        .maybeSingle()
        .then(({ data }) => setProfile(data ?? null))
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return (
    <AuthCtx.Provider value={{ user, profile, loading, refresh: load }}>
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth() {
  return useContext(AuthCtx)
}
