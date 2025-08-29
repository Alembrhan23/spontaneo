'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type BusinessMini = { name: string; neighborhood: string }

type Row = {
  id: string
  title: string
  start_at: string
  end_at: string | null
  business_id: string
  url: string | null
  image_url: string | null
  price_text: string | null
  is_free: boolean
  tags: string[] | null
  business: BusinessMini | null          // <— normalized, single object
}

const RANGE_PRESETS = [
  { label: '48h', hours: 48 },
  { label: '7d',  hours: 24 * 7 },
  { label: 'All upcoming', hours: 24 * 365 },
] as const

export default function AdminEventsListPage() {
  const [hours, setHours] = useState<number>(48)
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string>('')

  async function load() {
    setLoading(true); setErr('')

    const now = new Date()
    const horizon = new Date(now.getTime() + hours * 60 * 60 * 1000)

    const { data, error } = await supabase
      .from('manual_events')
      .select(`
        id, title, start_at, end_at, business_id, url, image_url, price_text, is_free, tags,
        businesses:business_id ( name, neighborhood )
      `)
      .gte('start_at', now.toISOString())
      .lte('start_at', horizon.toISOString())
      .order('start_at', { ascending: true })

    if (error) { setErr(error.message); setLoading(false); return }

    // Normalize the join (array or object) to a single "business" field
    const normalized: Row[] = (data as unknown as any[]).map((d) => {
      const joined = d.businesses
      const business: BusinessMini | null =
        Array.isArray(joined) ? (joined[0] ?? null) : (joined ?? null)

      // Strip the raw "businesses" field from the object and return typed Row
      const {
        businesses: _ignore,
        ...rest
      } = d

      return { ...(rest as Omit<Row, 'business'>), business }
    })

    setRows(normalized)
    setLoading(false)
  }

  useEffect(() => { load() }, [hours])

  const grouped = useMemo(() => {
    const g: Record<string, Row[]> = {}
    for (const r of rows) {
      const d = new Date(r.start_at)
      const key = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
      if (!g[key]) g[key] = []
      g[key].push(r)
    }
    return g
  }, [rows])

  async function remove(id: string) {
    if (!confirm('Delete this event?')) return
    const { error } = await supabase.from('manual_events').delete().eq('id', id)
    if (error) { alert(error.message); return }
    setRows(r => r.filter(x => x.id !== id))
  }

  return (
    <main className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">Manage Events</h1>
        <div className="ml-auto flex gap-2">
          {RANGE_PRESETS.map(p => (
            <button key={p.label}
              onClick={() => setHours(p.hours)}
              className={`border rounded px-3 py-1 text-sm ${hours===p.hours ? 'bg-black text-white' : ''}`}>
              {p.label}
            </button>
          ))}
          <a href="/admin/events/new" className="border rounded px-3 py-1 text-sm">+ Add Event</a>
        </div>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}
      {loading && <p>Loading…</p>}

      {!loading && rows.length === 0 ? (
        <p>No events in the selected range.</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([label, list]) => (
            <section key={label} className="space-y-2">
              <h2 className="text-lg font-semibold">{label}</h2>
              <ul className="space-y-2">
                {list.map(r => {
                  const t = new Date(r.start_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                  return (
                    <li key={r.id} className="flex items-center gap-3 rounded border p-3">
                      <div className="min-w-24 text-sm text-gray-600">{t}</div>
                      <div className="flex-1">
                        <div className="font-medium">{r.title}</div>
                        {r.business && (
                          <div className="text-sm text-gray-600">
                            {r.business.neighborhood} • {r.business.name}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <a className="text-sm underline" href={`/admin/events/new?copyId=${r.id}`}>Duplicate</a>
                        {r.url && <a className="text-sm underline" href={r.url} target="_blank">Open</a>}
                        <button onClick={() => remove(r.id)} className="text-sm text-red-600 underline">Delete</button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  )
}
