'use client'

import React, { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { ChevronDown, MapPin, Users } from 'lucide-react'

type Props = {
  mode: 'hosting' | 'joined'
  activity: any
  onChange?: () => void
  unreadCount?: number
}

function Avatar({ url, name }: { url?: string|null, name?: string|null }) {
  if (url) return <img src={url} alt={name ?? 'avatar'} className="h-9 w-9 rounded-full object-cover" />
  const initials = (name||'?').split(' ').slice(0,2).map(w=>w[0]?.toUpperCase()).join('')
  return (
    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-sm font-bold">
      {initials || '?'}
    </div>
  )
}

function VerifiedTick() {
  return (
    <span className="ml-1 inline-flex items-center align-middle" title="Verified">
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-sky-500 text-white shadow-sm ring-1 ring-white/70">
        ✓
      </span>
    </span>
  )
}

/* ---------- Helpers ---------- */
function formatDayAndTime(startISO: string, endISO?: string | null) {
  const start = new Date(startISO)
  const end = endISO ? new Date(endISO) : null
  const now = new Date()

  const sameDay = start.toDateString() === now.toDateString()
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1)
  const isTomorrow = start.toDateString() === tomorrow.toDateString()

  const startTime = start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const endTime = end ? end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : null

  const dayLabel = sameDay ? 'Today' : isTomorrow ? 'Tomorrow' :
    start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  return `${dayLabel} • ${startTime}${endTime ? ` – ${endTime}` : ''}`
}

function getStatus(startISO: string, endISO?: string | null, now: Date) {
  const start = new Date(startISO)
  const end = endISO ? new Date(endISO) : null

  if (now < start) {
    const diffMs = start.getTime() - now.getTime()
    if (diffMs <= 12 * 60 * 60 * 1000) {
      return { label: 'Soon', color: 'bg-yellow-100 text-yellow-800', bar: 'from-yellow-400 to-yellow-600' }
    }
    return { label: 'Upcoming', color: 'bg-gray-100 text-gray-600', bar: null }
  }

  if (end && now >= start && now <= end) {
    return { label: 'Live', color: 'bg-green-100 text-green-700 animate-pulse', bar: 'from-green-400 to-green-600' }
  }

  if (end && now > end && now <= new Date(end.getTime() + 12 * 60 * 60 * 1000)) {
    return { label: 'Ended', color: 'bg-red-100 text-red-700', bar: 'from-red-400 to-red-600' }
  }

  return null
}

function RichText({ text, expanded }: { text: string; expanded: boolean }) {
  const parts = useMemo(() => text.split(/(https?:\/\/[^\s]+)/g), [text])
  return (
    <span className={`${expanded ? 'whitespace-pre-wrap break-words' : 'block truncate'}`}>
      {parts.map((p, i) =>
        /^https?:\/\//i.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="underline">
            {p}
          </a>
        ) : (
          <React.Fragment key={i}>{p}</React.Fragment>
        )
      )}
    </span>
  )
}

/* ---------- Component ---------- */
export default function MyPlanCard({ mode, activity: a, onChange, unreadCount = 0 }: Props) {
  const [busy, setBusy] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [now, setNow] = useState(new Date())

  const hostName   = a?.host?.full_name ?? 'Host'
  const hostAvatar = a?.host?.avatar_url ?? null
  const hostVerified = !!a?.host?.is_verified

  const isCanceled = a?.status === 'canceled'
  const actionLabel   = mode === 'hosting' ? 'Cancel' : 'Leave'
  const actionHandler = mode === 'hosting' ? cancelPlan : leavePlan

  const unread = isCanceled ? 0 : Number(unreadCount ?? a?.unread_count ?? 0)

  const locationLabel = a.location_name?.trim?.() || a.location?.trim?.() || ''
  const mapsHref = a.location_lat && a.location_lng
    ? `https://www.google.com/maps/search/?api=1&query=${a.location_lat},${a.location_lng}`
    : (locationLabel ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationLabel)}` : '')

  const status = getStatus(a.start_at, a.end_at, now)

  // Always include host as participant
  const count = (a.participants_count ?? 0) + 1

  // ⏱ auto-update every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // 🗑 Skip rendering if activity ended >12h ago
  if (a.end_at && new Date(a.end_at).getTime() + 12 * 60 * 60 * 1000 < now.getTime()) {
    return null
  }

  async function tryEndpoint(path: string) {
    try {
      const r = await fetch(path, { method: 'POST' })
      if (r.ok) return true
    } catch {}
    return false
  }

  async function cancelPlan() {
    if (!confirm('Cancel this plan for everyone?')) return
    setBusy(true)
    const ok = await tryEndpoint(`/api/plans/${a.id}/cancel`)
    if (!ok) {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('activities')
        .update({ status: 'canceled', canceled_at: new Date().toISOString() })
        .eq('id', a.id)
        .eq('creator_id', user?.id ?? '')
      if (error) { alert(error.message); setBusy(false); return }
    }
    setBusy(false)
    onChange?.()
  }

  async function leavePlan() {
    if (!confirm('Leave this plan?')) return
    setBusy(true)
    const ok = await tryEndpoint(`/api/plans/${a.id}/leave`)
    if (!ok) {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('activity_participants')
        .delete()
        .eq('activity_id', a.id)
        .eq('user_id', user?.id ?? '')
      if (error) { alert(error.message); setBusy(false); return }
    }
    setBusy(false)
    onChange?.()
  }

  const barClass = status?.bar
    ? `bg-gradient-to-r ${status.bar}`
    : mode === 'hosting'
    ? 'bg-gradient-to-r from-amber-500 to-rose-500'
    : 'bg-gradient-to-r from-sky-500 to-indigo-500'

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-shadow">
      {/* Dynamic top bar */}
      <div className={`h-1 rounded-t-2xl ${barClass}`} />

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Avatar url={hostAvatar} name={hostName} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <span className="flex items-center">
                {mode === 'hosting' ? 'You are hosting' : <>Hosted by <span className="ml-1 font-medium text-zinc-700">{hostName}</span></>}
                {hostVerified && <VerifiedTick />}
              </span>
            </div>
            <h3 className="font-semibold text-zinc-900 truncate">{a.title || 'Untitled plan'}</h3>
          </div>
          {status && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
              {status.label}
            </span>
          )}
        </div>

        {/* Time */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="px-2 py-1 rounded-full bg-zinc-100 text-zinc-700">
            {formatDayAndTime(a.start_at, a.end_at)}
          </span>
          {isCanceled && <span className="px-2 py-1 rounded-full bg-rose-100 text-rose-700">Canceled</span>}
        </div>

        {/* Description + Details */}
        {a.description && (
          <>
            <div className="text-sm text-zinc-600">
              <RichText text={a.description} expanded={expanded} />
            </div>
            <button
              type="button"
              onClick={() => setExpanded(v => !v)}
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
            >
              {expanded ? 'Hide details' : 'Show details'}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>

            {expanded && (
              <div className="mt-3 space-y-2 text-sm text-gray-600">
                {locationLabel && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 shrink-0 text-indigo-600" />
                    {mapsHref ? (
                      <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {locationLabel}
                      </a>
                    ) : (
                      <span>{locationLabel}</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Participants row */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="w-4 h-4" />
          <div className="flex -space-x-2">
            {Array.from({ length: Math.min(3, count) }).map((_, i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-shimmer" />
              </div>
            ))}
            {count > 3 && (
              <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] text-gray-600">
                +{count - 3}
              </div>
            )}
          </div>
          <span>{count} going</span>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <Link
            href={`/activity/${a.id}/chat`}
            className={`relative px-3 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 ${isCanceled ? 'pointer-events-none opacity-50' : ''}`}
            title="Open chat"
          >
            Chat
            {unread > 0 && (
              <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] grid place-items-center">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </Link>

          <button
            disabled={busy || isCanceled}
            onClick={actionHandler}
            className="px-3 py-2 rounded-lg text-sm font-medium transition border border-zinc-300 text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
          >
            {busy ? 'Working…' : actionLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
