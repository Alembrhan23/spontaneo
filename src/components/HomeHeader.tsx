// src/components/HomeHeader.tsx
'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth'

export default function HomeHeader() {
  const { user, loading } = useAuth()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  if (loading || user) return null

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!panelRef.current) return
      if (!panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 sm:px-6 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold text-gray-900">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-600 text-white">N</span>
          <span>Nowio</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <a href="#activities" className="text-gray-700 hover:text-gray-900">Activities</a>
          <a href="#how" className="text-gray-700 hover:text-gray-900">How It Works</a>
          <a href="#niches" className="text-gray-700 hover:text-gray-900">Popular Categories</a>
          <Link href="/pricing" className="text-gray-700 hover:text-gray-900">Pricing</Link>
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Link href="/login" className="btn-cta-ghost">Sign In</Link>
          <Link href="/signup" className="btn-cta-primary">Get Started</Link>
        </div>

        {/* Mobile burger */}
        <button
          type="button"
          aria-label="Menu"
          onClick={() => setOpen(v => !v)}
          className="md:hidden rounded-lg p-2 hover:bg-gray-100"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M4 6h16M4 12h16M4 18h16" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Mobile panel */}
      {open && (
        <div ref={panelRef} className="md:hidden border-t bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3">
            <div className="flex flex-col gap-2">
              <a href="#activities" className="mobile-item" onClick={() => setOpen(false)}>Activities</a>
              <a href="#how" className="mobile-item" onClick={() => setOpen(false)}>How It Works</a>
              <a href="#niches" className="mobile-item" onClick={() => setOpen(false)}>Popular Categories</a>
              <Link href="/pricing" className="mobile-item" onClick={() => setOpen(false)}>Pricing</Link>
              <div className="h-px bg-gray-200 my-2" />
              <div className="flex gap-2">
                <Link href="/login" className="btn-cta-ghost flex-1" onClick={() => setOpen(false)}>Sign In</Link>
                <Link href="/signup" className="btn-cta-primary flex-1" onClick={() => setOpen(false)}>Get Started</Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .btn-cta-primary { padding:.55rem .9rem;border-radius:10px;font-weight:600;color:#fff;background:#4f46e5;box-shadow:0 6px 16px rgba(79,70,229,.18) }
        .btn-cta-primary:hover { filter:saturate(1.08) }
        .btn-cta-ghost { padding:.55rem .9rem;border-radius:10px;font-weight:600;border:1px solid #e5e7eb;background:#fff }
        .btn-cta-ghost:hover { background:#f3f4f6 }
        .mobile-item { padding:.6rem .25rem;border-radius:.5rem;color:#111827 }
        .mobile-item:hover { background:#f9fafb }
      `}</style>
    </header>
  )
}
