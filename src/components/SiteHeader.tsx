'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function SiteHeader() {
  const pathname = usePathname()
  const isAuthRoute = /^\/(login|signup|reset|auth)(\/|$)/.test(pathname || '')

  return (
    <header className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">⚡</span>
          Nowio
        </Link>

        <nav className="flex items-center gap-5 text-sm">
          <Link href="/discover" className="hover:text-indigo-700">Discover</Link>
          <Link href="/happening" className="hover:text-indigo-700">Happening</Link>
          <Link href="/plans" className="hover:text-indigo-700">My Plans</Link>
          <Link href="/neighborhood" className="hover:text-indigo-700">Neighborhood</Link>
        </nav>

        {/* Hide CTAs on auth routes */}
        {!isAuthRoute && (
          <div className="auth-ctas flex items-center gap-3">
            <Link href="/login" className="rounded-xl border px-3 py-1.5 font-semibold text-indigo-700 hover:bg-indigo-50">
              Log in
            </Link>
            <Link href="/signup" className="rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 px-3 py-1.5 font-semibold text-white hover:opacity-90">
              Sign up
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
