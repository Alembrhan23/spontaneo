'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import EventCard from '@/components/eventCard'

type Business = {
  id: string
  name: string
  neighborhood: string
  location?: string | null
  image_url?: string | null
  image_path?: string | null
}

type EventRow = {
  id: string
  business_id: string
  title: string
  start_at: string
  end_at: string | null
  url: string | null
  image_url: string | null
  image_path?: string | null
  price_text: string | null
  is_free: boolean
  tags: string[] | null
  notes: string | null
}

const HOUR_PRESETS = [6, 12, 24, 48] as const

const MVP_NEIGHBORHOODS = [
  'Five Points',
  'RiNo',
  'LoHi',
  'Capitol Hill',
  'Cherry Creek',
  'Highlands',
  'Washington Park',
  'Baker',
  'Downtown',
  'Sloan’s Lake',
  'Stapleton',
  'Park Hill'
] as const

function toLocalISO(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function HappeningPage() {
  const [hours, setHours] = useState<number>(48)
  const [neighborhood, setNeighborhood] = useState<string>('')
  const [search, setSearch] = useState<string>('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const [events, setEvents] = useState<EventRow[]>([])
  const [bizMap, setBizMap] = useState<Record<string, Business>>({})
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string>('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [scrolled, setScrolled] = useState(false)

  async function load() {
    setLoading(true)
    setErr('')

    const now = new Date()
    const horizon = new Date(now.getTime() + hours * 60 * 60 * 1000)
    const nowISO = now.toISOString()
    const horizonISO = horizon.toISOString()

    const { data: evts, error: e1 } = await supabase
      .from('manual_events')
      .select('id,business_id,title,start_at,end_at,url,image_url,price_text,is_free,tags,notes')
      .lte('start_at', horizonISO)
      .or(`and(end_at.gte.${nowISO}),and(end_at.is.null,start_at.gte.${nowISO})`)
      .order('start_at', { ascending: true })

    if (e1) {
      setErr(e1.message)
      setLoading(false)
      return
    }

    const eventsData = (evts || []) as EventRow[]
    setEvents(eventsData)

    const bizIds = Array.from(new Set(eventsData.map(e => e.business_id)))
    if (bizIds.length === 0) {
      setBizMap({})
      setLoading(false)
      return
    }

    const { data: biz, error: e2 } = await supabase
      .from('businesses')
      .select('id,name,neighborhood,location,image_url,image_path')
      .in('id', bizIds)

    if (e2) {
      setErr(e2.message)
      setLoading(false)
      return
    }

    const map: Record<string, Business> = {}
    ;(biz || []).forEach(b => {
      map[b.id] = b as Business
    })
    setBizMap(map)
    setLoading(false)
  }

  async function generateToday() {
    setErr('')
    const today = new Date()
    const weekday = today.getDay()
    const todayStr = toLocalISO(today).slice(0, 10)

    const { data: tmps, error } = await supabase
      .from('event_templates')
      .select(
        'business_id,title,weekday,time_local,duration_min,url,image_url,price_text,is_free,tags,notes,active'
      )
      .eq('active', true)

    if (error) {
      setErr(error.message)
      return
    }

    const pick = (tmps || []).filter((t: any) => {
      const okDay = t.weekday === weekday
      const b = bizMap[t.business_id]
      const okN = !neighborhood || (b && b.neighborhood === neighborhood)
      return okDay && okN
    })

    for (const t of pick) {
      const startLocal = new Date(`${todayStr}T${t.time_local}:00`)
      const endLocal = new Date(
        startLocal.getTime() + (t.duration_min ?? 120) * 60 * 1000
      )
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
      if (insErr && !insErr.message.toLowerCase().includes('duplicate')) {
        setErr(insErr.message)
        return
      }
    }
    await load()
  }

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

  useEffect(() => {
    const ch = supabase
      .channel('happening_events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'manual_events' }, () => load())
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hours])

  useEffect(() => {
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hours, neighborhood])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const filtered = useMemo(() => {
    let list = [...events]
    if (neighborhood) {
      list = list.filter(e => bizMap[e.business_id]?.neighborhood === neighborhood)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(e => {
        const biz = bizMap[e.business_id]
        return (
          e.title.toLowerCase().includes(q) ||
          e.notes?.toLowerCase().includes(q) ||
          e.tags?.some(t => t.toLowerCase().includes(q)) ||
          biz?.name.toLowerCase().includes(q)
        )
      })
    }
    list.sort((a, b) => {
      const t1 = new Date(a.start_at).getTime()
      const t2 = new Date(b.start_at).getTime()
      return sortOrder === 'asc' ? t1 - t2 : t2 - t1
    })
    return list
  }, [events, neighborhood, search, sortOrder, bizMap])

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

  function clearFilters() {
    setNeighborhood('')
    setSearch('')
    setSortOrder('asc')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
    </div>
  )

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 space-y-8">
      {/* Sticky Frosted Filters Header */}
      <div
        className={`sticky top-0 z-20 border-b shadow-sm backdrop-blur-lg bg-white/90 transition-all duration-300 ${
          scrolled ? 'py-3' : 'py-5'
        }`}
      >
        <div className="flex flex-wrap items-center gap-3 transition-all duration-300 mb-4">
          <h1
            className={`font-bold text-gray-800 transition-all duration-300 ${
              scrolled ? 'text-xl' : 'text-2xl'
            }`}
          >
            What's Happening <span className="text-gray-500 text-lg font-normal">(next {hours}h)</span>
          </h1>

          <div className="ml-auto flex gap-2">
            {HOUR_PRESETS.map(h => (
              <button
                key={h}
                onClick={() => setHours(h)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                  hours === h 
                    ? 'bg-gradient-to-r from-purple-600 to-blue-500 text-white shadow' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {h}h
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 transition-all duration-300">
          <div className="relative flex-1 min-w-[200px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search events or businesses…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
            </div>
            <select
              value={neighborhood}
              onChange={e => setNeighborhood(e.target.value)}
              className="border border-gray-200 rounded-xl pl-10 pr-8 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white transition-all"
            >
              <option value="">All neighborhoods</option>
              {MVP_NEIGHBORHOODS.map(n => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"></path>
              </svg>
            </div>
            <select
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="border border-gray-200 rounded-xl pl-10 pr-8 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white transition-all"
            >
              <option value="asc">Time: Earliest first</option>
              <option value="desc">Time: Latest first</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>
          </div>

          <button
            onClick={clearFilters}
            className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-all flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            Clear
          </button>

          {isAdmin && (
            <div className="ml-auto flex gap-2 border-l border-gray-200 pl-3">
              <button onClick={generateToday} className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:shadow-md transition-all">
                Generate Today
              </button>
              <a href="/admin/events/new" className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:shadow-md transition-all">
                Add Event
              </a>
              <a href="/admin/events/templates" className="bg-gray-100 text-gray-700 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-gray-200 transition-all">
                Templates
              </a>
              <a href="/admin/events/list" className="bg-gray-100 text-gray-700 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-gray-200 transition-all">
                Manage
              </a>
            </div>
          )}
        </div>
      </div>

      {err && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{err}</p>
            </div>
          </div>
        </div>
      )}

      {!filtered.length ? (
        <div className="text-center py-12 px-4 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No events found</h3>
          <p className="mt-2 text-sm text-gray-500">
            No events in the next {hours} hours
            {neighborhood ? ` for ${neighborhood}` : ''}.
          </p>
          {isAdmin && (
            <div className="mt-6">
              <a href="/admin/events/new" className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                Add your first event
              </a>
            </div>
          )}
        </div>
      ) : (
        <section className="space-y-8">
          {Object.entries(groups).map(([label, list]) => (
            <div key={label} className="space-y-4">
              <h2 className="text-xl font-bold text-gray-800 border-l-4 border-purple-500 pl-3 py-1">{label}</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {list.map((e, idx) => (
                  <div
                    key={e.id}
                    className="animate-fadeIn transform transition-all duration-300 hover:scale-[1.02]"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <EventCard
                      event={e}
                      business={bizMap[e.business_id]}
                      userId={userId}
                      isAdmin={isAdmin}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </main>
  )
}