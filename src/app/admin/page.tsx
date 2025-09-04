'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client' // ✅ browser client

type CountRow = { count: number }

function toLocalISO(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function AdminHome() {
  const [neighborhood, setNeighborhood] = useState('')
  const [msg, setMsg] = useState('')
  const [stats, setStats] = useState({
    events48h: 0,
    templates: 0,
    venues: 0,
    perksLive: 0,            // ✅ NEW
    redemptionsToday: 0,     // ✅ NEW
  })

  async function loadStats() {
    const now = new Date()
    const horizon = new Date(now.getTime() + 48 * 60 * 60 * 1000)

    // start/end of today (local)
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date()
    end.setHours(23, 59, 59, 999)

    const [
      ev, tmpl, ven,
      perks, reds,
    ] = await Promise.all([
      supabase
        .from('manual_events')
        .select('id', { count: 'exact', head: true })
        .gte('start_at', now.toISOString())
        .lte('start_at', horizon.toISOString()),
      supabase.from('event_templates').select('id', { count: 'exact', head: true }),
      supabase.from('venues').select('id', { count: 'exact', head: true }),

      // ✅ live perks = active (we keep it simple; time window can be ignored or added later)
      supabase.from('plan_perks').select('id', { count: 'exact', head: true }).eq('active', true),

      // ✅ redemptions today
      supabase
        .from('perk_claims')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'redeemed')
        .gte('redeemed_at', start.toISOString())
        .lt('redeemed_at', end.toISOString()),
    ])

    setStats({
      events48h: (ev as unknown as CountRow)?.count ?? ev.count ?? 0,
      templates: (tmpl as unknown as CountRow)?.count ?? tmpl.count ?? 0,
      venues: (ven as unknown as CountRow)?.count ?? ven.count ?? 0,
      perksLive: (perks as unknown as CountRow)?.count ?? perks.count ?? 0,
      redemptionsToday: (reds as unknown as CountRow)?.count ?? reds.count ?? 0,
    })
  }

  useEffect(() => { loadStats() }, [])

  async function generateToday() {
    setMsg('')
    const today = new Date()
    const weekday = today.getDay()
    const todayStr = toLocalISO(today).slice(0, 10)

    // join venue to filter by neighborhood if chosen
    const { data: tmps, error } = await supabase
      .from('event_templates')
      .select('*, venues:venue_id ( neighborhood )')
      .eq('active', true)

    if (error) { setMsg(error.message); return }

    const pick = (tmps || []).filter((t: any) =>
      t.weekday === weekday && (!neighborhood || t.venues?.neighborhood === neighborhood)
    )

    for (const t of pick) {
      const startLocal = new Date(`${todayStr}T${t.time_local}:00`)
      const endLocal = new Date(startLocal.getTime() + (t.duration_min ?? 120) * 60 * 1000)
      const { error: insErr } = await supabase.from('manual_events').insert({
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
      if (insErr && !insErr.message.includes('duplicate')) { setMsg(insErr.message); return }
    }
    setMsg(`Generated ${pick.length} event(s) from templates.`)
    loadStats()
  }

  return (
    <section className="space-y-6">
      {/* KPI cards */}
      <div className="grid sm:grid-cols-5 gap-3">
        <div className="border rounded p-4">
          <div className="text-sm opacity-70">Events (next 48h)</div>
          <div className="text-2xl font-bold">{stats.events48h}</div>
        </div>
        <div className="border rounded p-4">
          <div className="text-sm opacity-70">Templates</div>
          <div className="text-2xl font-bold">{stats.templates}</div>
        </div>
        <div className="border rounded p-4">
          <div className="text-sm opacity-70">Venues</div>
          <div className="text-2xl font-bold">{stats.venues}</div>
        </div>
        {/* ✅ NEW */}
        <div className="border rounded p-4">
          <div className="text-sm opacity-70">Live Perks</div>
          <div className="text-2xl font-bold">{stats.perksLive}</div>
        </div>
        {/* ✅ NEW */}
        <div className="border rounded p-4">
          <div className="text-sm opacity-70">Redemptions (today)</div>
          <div className="text-2xl font-bold">{stats.redemptionsToday}</div>
        </div>
      </div>

      {/* Filters & actions */}
      <div className="flex flex-wrap gap-2">
        {['', 'Five Points', 'RiNo', 'LoHi'].map((n) => (
          <button
            key={n}
            onClick={() => setNeighborhood(n)}
            className={`border rounded px-3 py-1 text-sm ${neighborhood === n ? 'bg-black text-white' : ''}`}
          >
            {n || 'All neighborhoods'}
          </button>
        ))}
        <button onClick={generateToday} className="ml-auto border rounded px-3 py-1 text-sm">
          Generate Today
        </button>
      </div>

      {msg && <p className="text-sm">{msg}</p>}

      {/* Quick links */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <a className="border rounded p-4 hover:bg-black/5" href="/admin/events/new">➕ Add Event</a>
        <a className="border rounded p-4 hover:bg-black/5" href="/admin/events/list">🗂️ Manage Events</a>
        <a className="border rounded p-4 hover:bg-black/5" href="/admin/events/templates">🧩 Templates</a>
        <a className="border rounded p-4 hover:bg-black/5" href="/admin/partners">🤝 Partners</a>
        <a className="border rounded p-4 hover:bg-black/5" href="/happening">⚡ View Happening</a>

        {/* ✅ NEW Perks shortcuts (won’t break anything if pages don’t exist yet) */}
        <a className="border rounded p-4 hover:bg-black/5" href="/admin/perks/new">🎁 Add Perk</a>
        <a className="border rounded p-4 hover:bg-black/5" href="/admin/perks/list">🗂️ Manage Perks</a>
      </div>
    </section>
  )
}
