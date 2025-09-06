'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function VerificationCallback() {
  const router = useRouter()

  useEffect(() => {
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        await fetch('/api/verify/sync', {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
      } catch {}
      setTimeout(() => router.push('/dashboard'), 800)
    })()
  }, [router])

  return (
    <div className="flex flex-col items-center justify-center h-[80vh]">
      <h1 className="text-2xl font-bold mb-2">Verification Complete ✅</h1>
      <p className="text-gray-600">You’ll be redirected shortly…</p>
    </div>
  )
}
