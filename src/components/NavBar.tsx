'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth'
import GlobalSearch from '@/components/GlobalSearch'
import { Search, ChevronDown, LogOut, LogIn, Plus } from 'lucide-react'

export default function NavBar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, profile, loading } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // close dropdown on route change
  useEffect(() => { setMenuOpen(false) }, [pathname])

  // close dropdown on click outside
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!menuRef.current || menuRef.current.contains(e.target as Node)) return
      setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  // keyboard shortcut for search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const inInput = (e.target as HTMLElement)?.closest('input,textarea,[contenteditable="true"]')
      if ((e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !inInput)) {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const avatarSrc =
    profile?.avatar_url ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile?.full_name || 'U')}`

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-3">
        <Link href="/discover" className="font-semibold text-indigo-700">⚡ Spontaneo</Link>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
            className="p-2 rounded-full hover:bg-zinc-100"
          >
            <Search className="w-5 h-5" />
          </button>

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
            <Link
              href="/login"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
            >
              <LogIn className="w-4 h-4" /> Log in
            </Link>
          )}
        </div>
      </div>

      {/* Global search dialog */}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  )
}
