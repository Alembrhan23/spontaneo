// src/app/admin/layout.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { server } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0
export const runtime = 'nodejs'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await server()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/admin')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/not-authorized')

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">Admin</h1>
        <nav className="ml-auto flex flex-wrap gap-2">
          <Link className="border rounded px-3 py-1 text-sm" href="/admin">Dashboard</Link>
          <Link className="border rounded px-3 py-1 text-sm" href="/admin/events/new">+ Add Event</Link>
          <Link className="border rounded px-3 py-1 text-sm" href="/admin/events/templates">Templates</Link>
          <Link className="border rounded px-3 py-1 text-sm" href="/admin/events/list">Manage Events</Link>
          <Link className="border rounded px-3 py-1 text-sm" href="/admin/partners">Partners</Link>
          <Link className="border rounded px-3 py-1 text-sm" href="/happening">Happening</Link>

          {/* ✅ NEW Perks nav */}
          <Link className="border rounded px-3 py-1 text-sm" href="/admin/perks/new">Add Perk</Link>
          <Link className="border rounded px-3 py-1 text-sm" href="/admin/perks/list">Perks</Link>
        </nav>
      </header>
      {children}
    </main>
  )
}
