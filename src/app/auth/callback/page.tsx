// app/auth/callback/page.tsx
import { Suspense } from 'react'
import CallbackClient from './CallbackClient'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-zinc-600">Signing you in…</div>}>
      <CallbackClient />
    </Suspense>
  )
}
