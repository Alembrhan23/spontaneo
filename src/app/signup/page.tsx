// src/app/signup/page.tsx (SERVER COMPONENT)
import { Suspense } from 'react'
import SignupClient from './SignupClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Nowio — Create or join micro-plans',
  description:
  'Nowio is a social platform for micro-plans — create or join quick activities, meet new people nearby, and unlock local perks.',
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-56px)] grid place-items-center bg-gradient-to-b from-indigo-50/60 via-white to-white px-4">
          <div className="text-sm text-zinc-500">Loading…</div>
        </div>
      }
    >
      <SignupClient />
    </Suspense>
  )
}
