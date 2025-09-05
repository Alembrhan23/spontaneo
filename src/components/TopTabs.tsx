'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import AdminLink from '@/components/AdminLink'

type Tab = { href: string; label: string }

/** Tabs: added Perks + First Friday, removed Neighborhood */
const TABS: Tab[] = [
  { href: '/discover',      label: 'Discover' },
  { href: '/happening',     label: 'Happening' },
  { href: '/plans',         label: 'My Plans' },
  { href: '/perks',         label: 'Perks' },
  { href: '/first-friday',  label: 'First Friday' },
]

export default function TopTabs() {
  const pathname = usePathname() || '/'
  const [userId, setUserId] = useState<string | null>(null)
  const [totalUnread, setTotalUnread] = useState(0)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [])

  const activeHref =
    pathname === '/'
      ? '/discover'
      : (TABS.find(t => pathname.startsWith(t.href))?.href
          ?? (pathname.startsWith('/admin') ? '/admin' : '/discover'))

  // Hide tabs on public/auth pages
  const onAuthRoute = /^\/(login|signup|verify|reset|auth|logout)(\/|$)/.test(pathname)
  const hidden = pathname === '/' || onAuthRoute

  async function computeTotal() {
    if (!userId) { setTotalUnread(0); return }

    // ---- 1) Fetch ONLY active activities you host (exclude canceled/deleted)
    const { data: hostActs } = await supabase
      .from('activities')
      .select('id,status')
      .eq('creator_id', userId)
      .neq('status', 'canceled')
      .neq('status', 'deleted')

    // ---- 2) Fetch activities you joined, then resolve only active activities
    const { data: joins } = await supabase
      .from('activity_participants')
      .select('activity_id')
      .eq('user_id', userId)

    let joinedActs: { id: string; status: string | null }[] = []
    const joinedIds = Array.from(new Set((joins || []).map(r => r.activity_id)))
    if (joinedIds.length) {
      const { data } = await supabase
        .from('activities')
        .select('id,status')
        .in('id', joinedIds)
        .neq('status', 'canceled')
        .neq('status', 'deleted')
      joinedActs = data || []
    }

    // Only keep active ids
    const ids = Array.from(new Set([...(hostActs || []), ...joinedActs].map(a => a.id)))
    if (!ids.length) { setTotalUnread(0); return }

    // ---- 3) Last-read fences
    const { data: reads } = await supabase
      .from('activity_reads')
      .select('activity_id,last_read_at')
      .eq('user_id', userId)
      .in('activity_id', ids)

    const lastRead: Record<string, string> =
      Object.fromEntries(ids.map(id => [id, '1970-01-01T00:00:00Z']))
    ;(reads || []).forEach(r => {
      if (new Date(r.last_read_at) > new Date(lastRead[r.activity_id])) {
        lastRead[r.activity_id] = r.last_read_at
      }
    })

    // ---- 4) Count only newer messages in those active threads
    const earliest = Object.values(lastRead).sort()[0] || '1970-01-01T00:00:00Z'
    const { data: msgs } = await supabase
      .from('activity_messages')
      .select('activity_id,created_at,user_id')
      .in('activity_id', ids)
      .gt('created_at', earliest)
      .neq('user_id', userId)

    const perActivity: Record<string, number> =
      Object.fromEntries(ids.map(id => [id, 0]))
    ;(msgs || []).forEach(m => {
      if (new Date(m.created_at) > new Date(lastRead[m.activity_id])) {
        perActivity[m.activity_id]++
      }
    })

    setTotalUnread(Object.values(perActivity).reduce((a, b) => a + b, 0))
  }

  // initial + auth ready
  useEffect(() => { computeTotal() }, [userId])

  // realtime updates (messages/reads/joins/status changes/deletes)
  useEffect(() => {
    if (!userId) return
    const refresh = () => computeTotal()

    const ch = supabase
      .channel('tabs_unreads')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_messages' }, refresh)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_reads',        filter: `user_id=eq.${userId}` }, refresh)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'activity_reads',        filter: `user_id=eq.${userId}` }, refresh)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_participants', filter: `user_id=eq.${userId}` }, refresh)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'activity_participants', filter: `user_id=eq.${userId}` }, refresh)
      // Crucial so canceled/deleted plans drop from the badge immediately
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'activities' }, refresh)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'activities' }, refresh)
      .subscribe()

    const onVis = () => { if (document.visibilityState === 'visible') computeTotal() }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      supabase.removeChannel(ch)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [userId])

  return (
    <div className={`sticky top-14 z-30 bg-white border-b ${hidden ? 'hidden' : ''}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex gap-6 sm:gap-8 overflow-x-auto sm:overflow-visible whitespace-nowrap sm:whitespace-normal no-scrollbar">
          {TABS.map(t => {
            const isActive = activeHref === t.href
            const isPlans  = t.href === '/plans'
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`relative py-3 text-sm md:text-base border-b-2 ${
                  isActive
                    ? 'text-indigo-600 border-indigo-600'
                    : 'text-gray-700 border-transparent hover:text-gray-900 hover:border-gray-200'
                }`}
              >
                {t.label}
                {isPlans && totalUnread > 0 && (
                  <span
                    className="absolute -top-1 -right-4 inline-flex h-5 min-w-[1.25rem] items-center justify-center
                               rounded-full px-1.5 text-[11px] font-semibold text-white bg-rose-600"
                    title={`${totalUnread} unread message${totalUnread===1?'':'s'}`}
                  >
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
                )}
              </Link>
            )
          })}
          <AdminLink />
        </nav>
      </div>
    </div>
  )
}
