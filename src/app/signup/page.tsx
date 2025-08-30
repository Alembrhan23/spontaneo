// src/app/signup/page.tsx (SERVER COMPONENT)
import { Suspense } from 'react'
import SignupClient from './SignupClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

export const metadata = {
  title: 'Spontaneo — Real people. Real plans. Right now.',
  description:
    'Tap to create or join casual micro-plans in Denver’s RiNo, LoHi, and Five Points. Join → chat → meet.',
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
