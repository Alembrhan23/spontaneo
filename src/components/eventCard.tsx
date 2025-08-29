'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type Business = {
  id: string
  name: string
  neighborhood: string
  location?: string | null
   image_url?: string | null 
}

type EventRow = {
  id: string
  business_id: string
  title: string
  start_at: string
  end_at?: string | null
  url?: string | null
  image_url?: string | null
  price_text?: string | null
  is_free?: boolean
  tags?: string[] | null
  notes?: string | null
}

type Props = {
  event: EventRow
  business?: Business
  userId?: string | null
  isAdmin?: boolean
}

/* ---------- small helpers ---------- */
function fmtTimeLabel(d: Date) {
  const now = new Date()
  const same = d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth() && d.getDate()===now.getDate()
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate()+1)
  const isTomorrow = d.getFullYear()===tomorrow.getFullYear() && d.getMonth()===tomorrow.getMonth() && d.getDate()===tomorrow.getDate()
  const t = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  if (same) return `${d.getHours()>=17 ? 'Tonight' : 'Today'} • ${t}`
  if (isTomorrow) return `Tomorrow • ${t}`
  return `${d.toLocaleDateString([], { weekday:'short', month:'short', day:'numeric' })} • ${t}`
}

function relStartsIn(start: Date) {
  const diffMs = start.getTime() - Date.now()
  if (diffMs <= 0) return null
  const mins = Math.round(diffMs / 60000)
  if (mins < 60) return `${mins} min`
  const h = Math.round(mins / 60)
  return `${h} hr`
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? 'h-4 w-4 text-rose-600'} fill="currentColor" aria-hidden>
      <path d="M12 2c-3.314 0-6 2.63-6 5.875 0 4.94 6 13.25 6 13.25s6-8.31 6-13.25C18 4.63 15.314 2 12 2Zm0 8.25a2.375 2.375 0 1 1 0-4.75 2.375 2.375 0 0 1 0 4.75Z"/>
    </svg>
  )
}

/* ---------- component ---------- */
export default function EventCard({ event, business, userId, isAdmin }: Props) {
  const start = useMemo(() => new Date(event.start_at), [event.start_at])
  const end = useMemo(() => (event.end_at ? new Date(event.end_at) : null), [event.end_at])
  const timeLabel = useMemo(() => fmtTimeLabel(start), [start])
  const startsIn = useMemo(() => relStartsIn(start), [start])

  const [interested, setInterested] = useState(false)
  const [interestedCount, setInterestedCount] = useState<number>(0)
  const [clicksCount, setClicksCount] = useState<number>(0)
  const [working, setWorking] = useState(false)
  const [shared, setShared] = useState(false)
  const [open, setOpen] = useState(false)

  const hero = event.image_url || business?.image_url || null


  // counts / state
  useEffect(() => {
    let alive = true
    ;(async () => {
      if (userId) {
        const { data } = await supabase
          .from('event_interests').select('event_id')
          .eq('event_id', event.id).eq('user_id', userId).limit(1)
        if (!alive) return
        setInterested(!!data?.length)
      }
      const res = await supabase
        .from('event_interests')
        .select('event_id', { count: 'exact', head: true })
        .eq('event_id', event.id)
      if (!alive) return
      setInterestedCount(res.count ?? 0)

      if (isAdmin) {
        const clicks = await supabase
          .from('event_engagements')
          .select('id', { count: 'exact', head: true })
          .eq('event_id', event.id).eq('action', 'click')
        if (!alive) return
        setClicksCount(clicks.count ?? 0)
      }
    })()
    return () => { alive = false }
  }, [event.id, userId, isAdmin])

  async function toggleInterested() {
    if (!userId) { alert('Please log in to mark interest.'); return }
    setWorking(true)
    try {
      if (interested) {
        await supabase.from('event_interests').delete().eq('event_id', event.id).eq('user_id', userId)
        setInterested(false); setInterestedCount(c => Math.max(0, c-1))
      } else {
        const { error } = await supabase.from('event_interests').insert({ event_id: event.id, user_id: userId })
        if (!error) { setInterested(true); setInterestedCount(c => c+1) }
      }
    } finally { setWorking(false) }
  }

  async function openDetails() {
    await supabase.from('event_engagements').insert({ event_id: event.id, user_id: userId ?? null, action: 'click' })
    setOpen(true)
  }

  async function openTickets() {
    if (!event.url) return
    await supabase.from('event_engagements').insert({ event_id: event.id, user_id: userId ?? null, action: 'click' })
    window.open(event.url, '_blank', 'noopener,noreferrer')
  }

  async function share() {
    try {
      const text = `${event.title} — ${business?.name ?? ''} (${business?.neighborhood ?? ''}) ${timeLabel}`
      const shareUrl = location.href
      if (navigator.share) await navigator.share({ title: event.title, text, url: shareUrl })
      else await navigator.clipboard.writeText(`${text}\n${shareUrl}`)
      setShared(true); setTimeout(()=>setShared(false), 1200)
      await supabase.from('event_engagements').insert({ event_id: event.id, user_id: userId ?? null, action: 'share' })
    } catch {}
  }

  const price = event.is_free ? 'Free' : (event.price_text || '').trim()
  const mapsQuery = encodeURIComponent(
    business ? `${business.name}, ${business.location || business.neighborhood || ''}` : event.title
  )
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`

  return (
    <>
      <article className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-[2px] hover:shadow-lg">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100"
             style={{ background: 'linear-gradient(90deg, rgba(99,102,241,.12), rgba(14,165,233,.12))' }} />

        <div className="flex gap-3">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border bg-gray-50">
  {hero ? (
    <img
      src={hero}
      alt={business?.name ? `${business.name} cover` : 'Event image'}
      loading="lazy"
      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
    />
  ) : (
    <div className="flex h-full w-full items-center justify-center text-xl">📍</div>
  )}
</div>


          <div className="min-w-0 flex-1">
            {/* title + happening badge */}
            <div className="flex items-start gap-2">
              <h3 className="truncate text-base font-semibold text-gray-900">{event.title}</h3>
              <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-pink-200 bg-pink-50 px-2 py-0.5 text-[11px] font-medium text-pink-700">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-pink-600" />
                happening
              </span>
            </div>

            {/* business left • address link right */}
            <div className="mt-0.5 flex items-center gap-2 text-sm">
              {business && (
                <div className="min-w-0 flex-1 truncate text-gray-600">
                  {business.neighborhood} • {business.name}
                </div>
              )}
              {business?.location && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  title={business.location || undefined}
                  className="shrink-0 inline-flex items-center gap-1 text-indigo-700 hover:underline"
                >
                  <MapPinIcon />
                  <span className="truncate max-w-[180px] sm:max-w-[260px]">{business.location}</span>
                </a>
              )}
            </div>

            {/* time + price + starts in */}
            <div className="mt-1 text-sm text-gray-800">
              🕒 {timeLabel}
              {startsIn ? <span className="ml-2 rounded-full bg-yellow-100 px-2 py-[1px] text-[11px] text-yellow-800">starts in {startsIn}</span> : null}
              {price ? <span className="ml-2 text-gray-600">• {price}</span> : null}
            </div>

            {/* tags */}
            {!!event.tags?.length && (
              <div className="mt-1 flex flex-wrap gap-1">
                {event.tags.slice(0, 4).map((t) => (
                  <span key={t} className="rounded-full border border-gray-200 bg-white px-2 py-[2px] text-[11px] text-gray-700">#{t}</span>
                ))}
                {event.tags.length > 4 && (
                  <span className="rounded-full border border-gray-200 bg-white px-2 py-[2px] text-[11px] text-gray-500">+{event.tags.length - 4}</span>
                )}
              </div>
            )}

            {/* actions */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleInterested}
                disabled={working}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold shadow border
                  ${interested ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'}`}
              >
                {interested ? 'Interested ✓' : 'I’m interested'}
                <span className={`rounded-full px-1.5 text-[11px] ${interested ? 'bg-white/20' : 'bg-indigo-100 text-indigo-700'}`}>{interestedCount}</span>
              </button>

              <button type="button" onClick={openDetails} className="inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
                Details
              </button>

              {event.url ? (
                <button
                  type="button"
                  onClick={openTickets}
                  className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-indigo-600 to-sky-500 px-3 py-1.5 text-sm font-semibold text-white shadow hover:opacity-95"
                >
                  Tickets
                </button>
              ) : null}

              <button type="button" onClick={share} className="inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
                {shared ? 'Copied! ✅' : 'Share'}
              </button>

              {isAdmin && <span className="ml-auto text-xs text-gray-500">⭐ {interestedCount} • 👀 {clicksCount}</span>}
            </div>
          </div>
        </div>
      </article>

      {/* DETAILS MODAL */}
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative z-[71] w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start gap-3">
              {event.image_url
                ? <img src={event.image_url} alt="" className="h-20 w-20 rounded-lg object-cover border" />
                : <div className="h-20 w-20 rounded-lg border grid place-items-center">📍</div>}
              <div className="min-w-0">
                <div className="text-lg font-semibold">{event.title}</div>
                {business && <div className="text-sm text-gray-600">{business.neighborhood} • {business.name}</div>}
                {business?.location && (
                  <a href={mapsUrl} target="_blank" title={business.location || undefined}
                     className="mt-1 inline-flex items-center gap-1 text-sm text-indigo-700 hover:underline">
                    <MapPinIcon />
                    <span className="truncate">{business.location}</span>
                  </a>
                )}
              </div>
              <button className="ml-auto rounded-full border px-2 py-1 text-sm" onClick={() => setOpen(false)}>Close</button>
            </div>

            <div className="mt-3 text-sm text-gray-800">
              🕒 {timeLabel}{end ? <> — {end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</> : null}
            </div>
            {(event.is_free || event.price_text) && (
              <div className="mt-1 text-sm text-gray-700">{event.is_free ? 'Free' : event.price_text}</div>
            )}

            {!!event.tags?.length && (
              <div className="mt-3 flex flex-wrap gap-1">
                {event.tags.map((t) => (
                  <span key={t} className="rounded-full border border-gray-200 bg-white px-2 py-[2px] text-[11px] text-gray-700">#{t}</span>
                ))}
              </div>
            )}

            {event.notes ? <div className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">{event.notes}</div> : null}

            <div className="mt-4 flex gap-2">
              {event.url ? (
                <button onClick={openTickets} className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-indigo-600 to-sky-500 px-3 py-1.5 text-sm font-semibold text-white shadow hover:opacity-95">
                  Tickets
                </button>
              ) : null}
              <button onClick={() => setOpen(false)} className="ml-auto rounded-lg border px-3 py-1.5 text-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
