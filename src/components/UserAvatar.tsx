'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { LogIn } from 'lucide-react'

export default function UserAvatar() {
  const [user, setUser] = useState<any>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [fullName, setFullName] = useState<string>('')

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUser(user)

      const { data } = await supabase
        .from('profiles')
        .select('avatar_url, full_name')
        .eq('id', user.id)
        .maybeSingle()

      setFullName(data?.full_name ?? '')
      setAvatarUrl(data?.avatar_url ?? null)
    })()
  }, [])

  // Logged-out: show Login
  if (!user) {
    return (
      <Link href="/login" className="flex items-center gap-2 text-white/90 hover:text-white">
        <LogIn className="w-5 h-5" />
        <span className="hidden sm:inline">Log in</span>
      </Link>
    )
  }

  // Build a safe fallback so src is NEVER empty
  const fallback = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
    fullName || user.email || 'User'
  )}`
  const src = avatarUrl || fallback

  return (
    <Link href="/profile" className="shrink-0">
      <img
        src={src}             // never ""
        alt="Profile"
        className="w-8 h-8 rounded-full ring-2 ring-white/60 hover:ring-white transition"
      />
    </Link>
  )
}
