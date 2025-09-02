'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function CallbackInner() {
  const sp = useSearchParams()

  useEffect(() => {
    const next = sp.get('next') || '/discover'
    ;(async () => {
      // 1) Exchange the auth code using the PKCE cookie in the browser
      const { data } = await supabase.auth.exchangeCodeForSession(window.location.href)

      // 2) Bridge tokens -> httpOnly cookies on the server
      const at = data?.session?.access_token
      const rt = data?.session?.refresh_token
      if (at && rt) {
        try {
          await fetch('/auth/set', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token: at, refresh_token: rt }),
          })
        } catch {}
      }

      // 3) Go to the final page
      window.location.replace(next)
    })()
  }, [sp])

  return <div className="p-6 text-sm text-zinc-600">Signing you in…</div>
}

export default function OAuthCallback() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-zinc-600">Signing you in…</div>}>
      <CallbackInner />
    </Suspense>
  )
}
