'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Search, X } from 'lucide-react'

type ActivityRow = {
  id: string
  title: string
  description: string | null
  neighborhood: string | null
  location: string | null
  location_name?: string | null
  start_at: string
  creator_id: string
  status?: string | null
}
type EventRow = {
  id: string
  title: string
  start_at: string
  end_at?: string | null
  business_id: string
}
type Business = { id: string; name: string; neighborhood: string; location?: string | null }

export default function GlobalSearch({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const pathname = usePathname() || '/'
  const router = useRouter()
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [me, setMe] = useState<string | null>(null)
  const [results, setResults] = useState<
    Array<
      | { kind: 'activity'; id: string; title: string; when: string; where: string }
      | { kind: 'event'; id: string; title: string; when: string; where: string }
    >
  >([])
  const wrapRef = useRef<HTMLDivElement>(null)

  // figure out current tab
  const tab: 'discover' | 'plans' | 'happening' =
    pathname.startsWith('/plans')
      ? 'plans'
      : pathname.startsWith('/happening')
      ? 'happening'
      : 'discover'

  // who am I (needed for /plans)
  useEffect(() => {
    if (!open) return
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null))
  }, [open])

  // close on ESC / click-outside
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current || wrapRef.current.contains(e.target as Node)) return
      onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDoc)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDoc)
    }
  }, [open, onClose])

  // search (debounced)
  useEffect(() => {
    if (!open) return
    const t = setTimeout(runSearch, 220)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, tab, open, me])

  async function runSearch() {
    const s = q.trim()
    if (!s) {
      setResults([])
      return
    }
    setLoading(true)

    try {
      if (tab === 'happening') {
        // EVENTS: manual_events + business name
        const { data: evts, error } = await supabase
          .from('manual_events')
          .select('id,title,start_at,end_at,business_id')
          .or(`title.ilike.%${s}%,notes.ilike.%${s}%`)
          .order('start_at', { ascending: true })
          .limit(30)
        if (error) throw error
        const ids = Array.from(new Set((evts || []).map((e) => e.business_id)))
        let bizMap: Record<string, Business> = {}
        if (ids.length) {
          const { data: biz } = await supabase
            .from('businesses')
            .select('id,name,neighborhood,location')
            .in('id', ids)
          bizMap = Object.fromEntries((biz || []).map((b) => [b.id, b as Business]))
        }
        setResults(
          (evts || []).map((e) => ({
            kind: 'event' as const,
            id: e.id,
            title: e.title,
            when: timeLabel(new Date(e.start_at)),
            where: businessLabel(bizMap[e.business_id]),
          }))
        )
        setLoading(false)
        return
      }

      // ACTIVITIES (discover/plans)
      const base = supabase
        .from('activities')
        .select(
          'id,title,description,neighborhood,location,location_name,start_at,creator_id,status'
        )
        .gte('start_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
        .neq('status', 'canceled')
        .order('start_at', { ascending: true })
        .or(`title.ilike.%${s}%,description.ilike.%${s}%`)
        .limit(40)

      let acts: ActivityRow[] = []

      if (tab === 'discover') {
        const { data, error } = await base
        if (error) throw error
        acts = (data || []) as ActivityRow[]
      } else {
        // /plans: only my hosting or joined
        if (!me) {
          setResults([])
          setLoading(false)
          return
        }
        const [{ data: mine }, { data: joins }] = await Promise.all([
          supabase.from('activities').select('id').eq('creator_id', me),
          supabase.from('activity_participants').select('activity_id').eq('user_id', me),
        ])
        const ids = Array.from(
          new Set([...(mine || []).map((r: any) => r.id), ...(joins || []).map((r: any) => r.activity_id)])
        )
        if (!ids.length) {
          setResults([])
          setLoading(false)
          return
        }
        const { data, error } = await base.in('id', ids)
        if (error) throw error
        acts = (data || []) as ActivityRow[]
      }

      setResults(
        acts.map((a) => ({
          kind: 'activity' as const,
          id: a.id,
          title: a.title,
          when: timeLabel(new Date(a.start_at)),
          where: placeLabel(a),
        }))
      )
    } catch (e) {
      console.error('global search error:', e)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const hint = useMemo(() => {
    if (!q.trim()) return `Type to search ${tab === 'happening' ? 'events' : 'activities'}…`
    if (loading) return 'Searching…'
    if (results.length === 0) return 'No matches.'
    return ''
  }, [q, loading, results.length, tab])

  function go(r: (typeof results)[number]) {
    // Route back to the current tab with a query and an anchor so the page can filter & scroll.
    if (r.kind === 'event') {
      router.push(`/happening?q=${encodeURIComponent(q.trim())}#evt-${r.id}`)
    } else {
      const dest = tab === 'plans' ? '/plans' : '/discover'
      router.push(`${dest}?q=${encodeURIComponent(q.trim())}#act-${r.id}`)
    }
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-[1px]">
      <div
        ref={wrapRef}
        className="mx-auto mt-16 w-full max-w-3xl rounded-2xl bg-white shadow-2xl border"
      >
        {/* header */}
        <div className="flex items-center gap-2 border-b p-3 sm:p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Search ${tab === 'happening' ? 'events' : 'activities'}…`}
              className="w-full rounded-xl border px-10 py-2 text-base outline-none focus:ring-2 ring-indigo-200"
            />
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="ml-2 rounded-full p-2 hover:bg-zinc-100"
          >
            <X className="h-5 w-5 text-zinc-600" />
          </button>
        </div>

        {/* body */}
        {hint ? (
          <div className="p-6 text-sm text-zinc-500">{hint}</div>
        ) : (
          <ul className="max-h-[70vh] overflow-y-auto divide-y">
            {results.map((r) => (
              <li key={`${r.kind}:${r.id}`}>
                <button
                  className="w-full text-left px-4 py-3 hover:bg-indigo-50"
                  onClick={() => go(r)}
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-[3px] inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold">
                      {r.kind === 'event' ? 'EVENT' : 'ACTIVITY'}
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{r.title}</div>
                      <div className="text-xs text-zinc-500 truncate">
                        {r.when} • {r.where}
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* footer */}
        <div className="flex items-center justify-between border-t p-3 text-xs text-zinc-500">
          <span className="hidden sm:inline">Press Esc to close</span>
          <span>Searching: {tab === 'happening' ? 'Happening' : tab === 'plans' ? 'My Plans' : 'Discover'}</span>
        </div>
      </div>
    </div>
  )
}

/* ---------- tiny helpers ---------- */

function timeLabel(d: Date) {
  const now = new Date()
  const same =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  const isTomorrow =
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate()
  const t = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  if (same) return `${d.getHours() >= 17 ? 'Tonight' : 'Today'} • ${t}`
  if (isTomorrow) return `Tomorrow • ${t}`
  return `${d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} • ${t}`
}

function placeLabel(a: ActivityRow) {
  return a.location_name?.trim?.() || a.location?.trim?.() || a.neighborhood || '—'
}

function businessLabel(b?: Business) {
  if (!b) return '—'
  const left = [b.name, b.neighborhood].filter(Boolean).join(' • ')
  return b.location ? `${left} • ${b.location}` : left
}
