'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function CallbackClient() {
  const sp = useSearchParams()

  useEffect(() => {
    const next = sp.get('next') || '/discover'
    ;(async () => {
      // 1) Exchange the code in the browser (has PKCE cookie)
      const { data } = await supabase.auth.exchangeCodeForSession(window.location.href)

      // 2) Bridge tokens => httpOnly cookies on the server
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

      // 3) Navigate to the final page
      window.location.replace(next)
    })()
  }, [sp])

  return <div className="p-6 text-sm text-zinc-600">Signing you in…</div>
}
