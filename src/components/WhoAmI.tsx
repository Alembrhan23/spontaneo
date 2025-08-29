'use client'
import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function WhoAmI() {
  const supabase = createClientComponentClient()
  const [email, setEmail] = useState<string | null>(null)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null))
  }, [supabase])
  return (
    <span className="text-xs opacity-60">
      {email ? `Signed in as ${email}` : 'Not signed in'}
    </span>
  )
}
