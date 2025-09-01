'use client'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function OAuthCallback() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const next = params.get('next') || '/discover'
    ;(async () => {
      // Complete PKCE flow and get a client session
      const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href)
      if (!error && data?.session) {
        // Bridge to server cookies (so SSR sees the session)
        const { access_token, refresh_token } = data.session
        await fetch('/auth/set', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token, refresh_token }),
        }).catch(() => {})
      }
      window.location.replace(next)
    })()
  }, [params, router])

  return <div className="p-6 text-sm text-zinc-600">Signing you in…</div>
}
