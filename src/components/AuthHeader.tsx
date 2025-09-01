'use client'

import Link from 'next/link'

export default function AuthHeader() {
  return (
    <header className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">⚡</span>
          Nowio
        </Link>
        {/* Intentionally empty — no Log in / Sign up here */}
        <div />
      </div>
    </header>
  )
}
