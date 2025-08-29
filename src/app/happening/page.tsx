'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import EventCard from '@/components/eventCard'

type Business = { id: string; name: string; neighborhood: string; location?: string | null }
type EventRow = {
  id: string
  business_id: string
  title: string
  start_at: string
  end_at: string | null
  url: string | null
  image_url: string | null
  price_text: string | null
  is_free: boolean
  tags: string[] | null
  notes: string | null
}

const HOUR_PRESETS = [6, 12, 24, 48] as const
const MVP_NEIGHBORHOODS = ['Five Points', 'RiNo', 'LoHi'] as const

function toLocalISO(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function HappeningPage() {
  const [hours, setHours] = useState<number>(48)
  const [neighborhood, setNeighborhood] = useState<string>('') // All
  const [events, setEvents] = useState<EventRow[]>([])
  const [bizMap, setBizMap] = useState<Record<string, Business>>({})
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string>('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  async function load() {
    setLoading(true); setErr('')

    const now = new Date()
    const horizon = new Date(now.getTime() + hours * 60 * 60 * 1000)

    // 1) events
    const { data: evts, error: e1 } = await supabase
      .from('manual_events')
      .select('id,business_id,title,start_at,end_at,url,image_url,price_text,is_free,tags,notes')
      .gte('start_at', now.toISOString())
      .lte('start_at', horizon.toISOString())
      .order('start_at', { ascending: true })

    if (e1) { setErr(e1.message); setLoading(false); return }

    const eventsData = (evts || []) as EventRow[]
    setEvents(eventsData)

    // 2) businesses we need (include location)
    const bizIds = Array.from(new Set(eventsData.map(e => e.business_id)))
    if (bizIds.length === 0) {
      setBizMap({})
      setLoading(false)
      return
    }

    const { data: biz, error: e2 } = await supabase
      .from('businesses')
      .select('id,name,neighborhood,location')  // <— ensure this column exists
      .in('id', bizIds)

    if (e2) { setErr(e2.message); setLoading(false); return }

    const map: Record<string, Business> = {}
    ;(biz || []).forEach(b => { map[b.id] = b as Business })
    setBizMap(map)
    setLoading(false)
  }

  // initial load + auth/admin check
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id ?? null)

      if (user) {
        const { data } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
        setIsAdmin(!!data?.is_admin)
      } else {
        setIsAdmin(false)
      }

      await load()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hours])

  // realtime refresh
  useEffect(() => {
    const ch = supabase
      .channel('happening_events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'manual_events' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hours])

  // filters + groups
  const filtered = useMemo(() => {
    if (!neighborhood) return events
    return events.filter(e => bizMap[e.business_id]?.neighborhood === neighborhood)
  }, [events, neighborhood, bizMap])

  const groups = useMemo(() => {
    const g: Record<string, EventRow[]> = {}
    for (const e of filtered) {
      const d = new Date(e.start_at)
      const key = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
      if (!g[key]) g[key] = []
      g[key].push(e)
    }
    return g
  }, [filtered])

  // ADMIN — generate from templates (optional)
  async function generateToday() {
    setErr('')
    const today = new Date()
    const weekday = today.getDay()
    const todayStr = toLocalISO(today).slice(0, 10)

    const { data: tmps, error } = await supabase
      .from('event_templates')
      .select('business_id,title,weekday,time_local,duration_min,url,image_url,price_text,is_free,tags,notes,active')
      .eq('active', true)

    if (error) { setErr(error.message); return }

    const pick = (tmps || []).filter((t: any) => {
      const okDay = t.weekday === weekday
      const b = bizMap[t.business_id]
      const okN = !neighborhood || (b && b.neighborhood === neighborhood)
      return okDay && okN
    })

    for (const t of pick) {
      const startLocal = new Date(`${todayStr}T${t.time_local}:00`)
      const endLocal = new Date(startLocal.getTime() + (t.duration_min ?? 120) * 60 * 1000)
      const { error: insErr } = await supabase.from('manual_events').insert({
        business_id: t.business_id,
        title: t.title,
        start_at: startLocal.toISOString(),
        end_at: endLocal.toISOString(),
        url: t.url,
        image_url: t.image_url,
        price_text: t.price_text,
        is_free: t.is_free,
        tags: t.tags,
        notes: t.notes
      })
      if (insErr && !insErr.message.toLowerCase().includes('duplicate')) { setErr(insErr.message); return }
    }
    await load()
  }

  if (loading) return <div className="p-6">Loading…</div>

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold">Happening (next {hours}h)</h1>
        <div className="ml-auto flex gap-2">
          {HOUR_PRESETS.map(h => (
            <button key={h}
              onClick={() => setHours(h)}
              className={`border rounded px-3 py-1 text-sm ${hours===h ? 'bg-black text-white' : ''}`}>
              {h}h
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        {['', ...MVP_NEIGHBORHOODS].map(n => (
          <button key={n || 'all'}
            onClick={() => setNeighborhood(n)}
            className={`border rounded px-3 py-1 text-sm ${neighborhood===n ? 'bg-black text-white' : ''}`}>
            {n || 'All neighborhoods'}
          </button>
        ))}

        {isAdmin && (
          <div className="ml-auto flex gap-2">
            <button onClick={generateToday} className="border rounded px-3 py-1 text-sm">Generate Today</button>
            <a href="/admin/events/new" className="border rounded px-3 py-1 text-sm">Add Event</a>
            <a href="/admin/events/templates" className="border rounded px-3 py-1 text-sm">Templates</a>
            <a href="/admin/events/list" className="border rounded px-3 py-1 text-sm">Manage</a>
          </div>
        )}
      </div>

      {err && <p className="text-sm text-red-500">{err}</p>}

      {!filtered.length ? (
        <div className="p-6">
          <p>No events in the next {hours} hours{neighborhood ? ` for ${neighborhood}` : ''}.</p>
          {isAdmin && <a href="/admin/events/new" className="inline-block mt-3 border rounded px-3 py-2">Add Event</a>}
        </div>
      ) : (
        <section className="space-y-6">
          {Object.entries(groups).map(([label, list]) => (
            <div key={label} className="space-y-3">
              <h2 className="text-lg font-semibold">{label}</h2>
              {list.map(e => (
                <EventCard
                  key={e.id}
                  event={e}
                  business={bizMap[e.business_id]}
                  userId={userId}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          ))}
        </section>
      )}
    </main>
  )
}
