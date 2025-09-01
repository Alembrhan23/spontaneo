'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function HomeHeader() {
  const [open, setOpen] = useState(false)

  // Close on ESC + when a hash link is used
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const onHash = () => setOpen(false)
    window.addEventListener('keydown', onKey)
    window.addEventListener('hashchange', onHash)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('hashchange', onHash)
    }
  }, [])

  // Lock body scroll when sheet is open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = open ? 'hidden' : prev
    return () => { document.body.style.overflow = prev }
  }, [open])

  return (
    <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-3">
        {/* Brand → hero */}
        <a href="#hero" className="flex items-center gap-2 text-lg font-semibold">
          <span className="inline-grid h-7 w-7 place-items-center rounded-md bg-indigo-600 text-white">⚡</span>
          Nowio
        </a>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-2">
          <a href="#how" className="nav-link">How it works</a>
          <a href="#niches" className="nav-link">Niches</a>
          <Link href="/login"  className="px-3 py-2 text-sm font-semibold rounded-lg border hover:bg-zinc-50">
            Log in
          </Link>
          <Link href="/signup" className="px-3 py-2 text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm">
            Sign up
          </Link>
        </nav>

        {/* Burger (mobile) */}
        <button
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
          className="sm:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-zinc-100"
        >
          <span
            className={`relative block h-[2px] w-6 bg-indigo-900 transition-all
                        before:content-[''] before:absolute before:-top-2 before:h-[2px] before:w-6 before:bg-indigo-900
                        after:content-['']  after:absolute  after:top-2  after:h-[2px] after:w-6  after:bg-indigo-900
                        ${open ? 'bg-transparent before:rotate-45 before:top-0 after:-rotate-45 after:top-0' : ''}`}
          />
        </button>
      </div>

      {/* Mobile dropdown sheet — content aligned left, compact links (not full row) */}
      {open && (
        <div className="sm:hidden border-t bg-white/95 backdrop-blur">
          <div className="mx-auto w-full max-w-7xl px-6 py-4">
            {/* Link list */}
            <ul className="space-y-3">
              <li>
                <a
                  href="#how"
                  className="inline-flex items-center px-1 py-1 text-[15px] font-medium text-zinc-800 hover:text-indigo-700"
                >
                  How it works
                </a>
              </li>
              <li>
                <a
                  href="#niches"
                  className="inline-flex items-center px-1 py-1 text-[15px] font-medium text-zinc-800 hover:text-indigo-700"
                >
                  Niches
                </a>
              </li>
            </ul>

            <div className="my-4 h-px bg-zinc-200" />

            {/* CTAs — left aligned, not full-width */}
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center px-3 py-2 text-sm font-semibold rounded-lg border hover:bg-zinc-50"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center px-3 py-2 text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
