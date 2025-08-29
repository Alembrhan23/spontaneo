'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth'
import GlobalSearch from '@/components/GlobalSearch'
import { Search, ChevronDown, LogOut, LogIn, Plus } from 'lucide-react'

function useHasMounted() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  return mounted
}

export default function NavBar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, profile, loading } = useAuth()
  const hasMounted = useHasMounted()

  // Hooks must always run
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close dropdown on route change
  useEffect(() => { setMenuOpen(false) }, [pathname])

  // Click-outside to close
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current || menuRef.current.contains(e.target as Node)) return
      setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  // Shortcut for search (guard inside)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!user) return
      const inInput = (e.target as HTMLElement)?.closest('input,textarea,[contenteditable="true"]')
      if ((e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !inInput)) {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [user])

  async function logout() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const avatarSrc =
    profile?.avatar_url ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile?.full_name || 'U')}`

  const brandHref = user ? '/discover' : '/'

  // Hide NavBar entirely on Home when signed out (after hooks have run)
  const hideOnHome = !user && pathname === '/'
  if (hideOnHome) return null

  // During SSR/first client render, show a stable skeleton to avoid mismatches
  if (!hasMounted) {
    return (
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-3">
          <Link href="/" className="font-semibold text-indigo-700">⚡ Spontaneo</Link>
          <div className="ml-auto h-8 w-24 rounded-full bg-zinc-200" />
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-3">
        <Link href={brandHref} className="font-semibold text-indigo-700">⚡ Spontaneo</Link>

        <div className="ml-auto flex items-center gap-2">
          {user && (
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="p-2 rounded-full hover:bg-zinc-100"
            >
              <Search className="w-5 h-5" />
            </button>
          )}

          {loading ? (
            <div className="text-sm text-zinc-500">…</div>
          ) : user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-zinc-100"
              >
                <img src={avatarSrc} className="h-8 w-8 rounded-full object-cover" alt="" />
                <ChevronDown className="w-4 h-4 text-zinc-600" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border bg-white shadow-lg z-50 p-1">
                  <Link href="/create" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-zinc-50">
                    <Plus className="w-4 h-4" /> Create plan
                  </Link>
                  <Link href="/profile" className="block px-3 py-2 rounded-lg hover:bg-zinc-50">Profile</Link>
                  <Link href="/plans" className="block px-3 py-2 rounded-lg hover:bg-zinc-50">My Plans</Link>
                  {!profile?.is_verified && (
                    <Link href="/verify/start" className="block px-3 py-2 rounded-lg hover:bg-zinc-50 text-emerald-700">
                      Verify
                    </Link>
                  )}
                  <button
                    onClick={logout}
                    className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-50 text-red-600"
                  >
                    <LogOut className="w-4 h-4" /> Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <LogIn className="w-4 h-4" /> Log in
              </Link>
              <Link
                href="/signup"
                className="px-3 py-1.5 rounded-lg border bg-white hover:bg-zinc-50"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>

      {user && <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />}
    </header>
  )
}
