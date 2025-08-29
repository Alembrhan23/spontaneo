'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/client' // ✅ new browser client

type Venue = { id: string; name: string; neighborhood: string }
type Tmpl = {
  id: string
  venue_id: string
  title: string
  weekday: number
  time_local: string
  duration_min: number | null
  url: string | null
  image_url: string | null
  price_text: string | null
  is_free: boolean
  tags: string[] | null
  notes: string | null
  active: boolean
}

function toLocalISO(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export default function TemplatesPage() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [templates, setTemplates] = useState<Tmpl[]>([])
  const [neighborhood, setNeighborhood] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    ;(async () => {
      const [{ data: vns, error: vErr }, { data: tmps, error: tErr }] = await Promise.all([
        supabase.from('venues').select('id,name,neighborhood').order('neighborhood'),
        supabase.from('event_templates').select('*').order('created_at', { ascending: false }),
      ])
      if (vErr || tErr) {
        setMsg(vErr?.message || tErr?.message || 'Failed to load')
        return
      }
      setVenues(vns || [])
      setTemplates(tmps || [])
    })()
  }, [])

  const vById = useMemo(() => Object.fromEntries(venues.map(v => [v.id, v])), [venues])
  const filtered = useMemo(
    () => (neighborhood ? templates.filter(t => vById[t.venue_id]?.neighborhood === neighborhood) : templates),
    [templates, neighborhood, vById]
  )

  async function generateToday() {
    setMsg('')
    const now = new Date()
    const todayWeekday = now.getDay() // 0..6 local (Denver)
    const todayStr = toLocalISO(now).slice(0, 10) // YYYY-MM-DD

    const todays = filtered.filter(t => t.active && t.weekday === todayWeekday)
    if (!todays.length) { setMsg('No active templates for today.'); return }

    for (const t of todays) {
      const startLocal = new Date(`${todayStr}T${t.time_local}:00`)
      const endLocal = new Date(startLocal.getTime() + (t.duration_min ?? 120) * 60 * 1000)

      const { error } = await supabase.from('manual_events').insert({
        venue_id: t.venue_id,
        title: t.title,
        start_at: startLocal.toISOString(),
        end_at: endLocal.toISOString(),
        url: t.url,
        image_url: t.image_url,
        price_text: t.price_text,
        is_free: t.is_free,
        tags: t.tags,
        notes: t.notes,
      })
      if (error && !error.message.toLowerCase().includes('duplicate')) {
        setMsg(`Error: ${error.message}`); return
      }
    }
    setMsg('Generated today’s events from templates!')
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Event Templates</h1>

      <div className="flex gap-2">
        {['', 'Five Points', 'RiNo', 'LoHi'].map(n => (
          <button
            key={n}
            onClick={() => setNeighborhood(n)}
            className={`border rounded px-3 py-1 ${neighborhood === n ? 'bg-black text-white' : ''}`}
          >
            {n || 'All'}
          </button>
        ))}
        <button onClick={generateToday} className="ml-auto border rounded px-3 py-1">Generate Today</button>
      </div>

      <div className="space-y-3">
        {filtered.map(t => {
          const v = vById[t.venue_id]
          return (
            <div key={t.id} className="border rounded p-3">
              <div className="flex justify-between">
                <div>
                  <div className="font-semibold">{t.title}</div>
                  <div className="text-sm opacity-70">{v?.neighborhood} — {v?.name}</div>
                  <div className="text-sm mt-1">
                    {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][t.weekday]} {t.time_local} ({t.duration_min ?? 120}m)
                    {t.is_free ? ' · Free' : ''}{t.price_text ? ` · ${t.price_text}` : ''}
                  </div>
                </div>
                <span className="text-xs border rounded px-2 py-1 self-start">{t.active ? 'active' : 'inactive'}</span>
              </div>
              {t.tags?.length ? <div className="text-xs opacity-70 mt-1">#{t.tags.join(' #')}</div> : null}
            </div>
          )
        })}
      </div>

      {msg && <p className="text-sm">{msg}</p>}
      <a href="/admin/events/new" className="inline-block mt-3 text-sm underline">Add a one-off event</a>
    </main>
  )
}
