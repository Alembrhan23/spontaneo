'use client'

import Link from 'next/link'
import React, { useState, useMemo, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { MapPin, ChevronDown } from 'lucide-react'

type Props = {
  a: any
  isOwner: boolean
  isJoined: boolean
  hasUnread?: boolean
  onJoined?: (id: string) => void
}

function VerifiedTick() {
  return (
    <span className="ml-1 inline-flex items-center" title="Verified">
      <span className="w-4 h-4 rounded-full bg-sky-500 text-white grid place-items-center text-[10px] shadow">
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
    const mins = Math.floor(diffMs / 60000)
    const hours = Math.floor(mins / 60)
    const remaining = hours > 0 ? `${hours}h ${mins % 60}m` : `${mins}m`

    if (diffMs <= 12 * 60 * 60 * 1000) {
      return { label: `Soon • in ${remaining}`, color: 'bg-yellow-100 text-yellow-800' }
    }
    return { label: `Upcoming • in ${remaining}`, color: 'bg-gray-100 text-gray-600' }
  }

  if (end && now >= start && now <= end) {
    return { label: 'Live', color: 'bg-green-100 text-green-700 animate-pulse' }
  }

  if (end && now > end && now <= new Date(end.getTime() + 60 * 60 * 1000)) {
    return { label: 'Ended', color: 'bg-red-100 text-red-700' }
  }

  return null
}

function RichText({ text, expanded }: { text: string; expanded: boolean }) {
  const parts = useMemo(() => text.split(/(https?:\/\/[^\s]+)/g), [text])
  return (
    <span className={`${expanded ? 'whitespace-pre-wrap break-words' : 'block truncate'} text-inherit`}>
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

export default function ActivityCard({ a, isOwner, isJoined, onJoined }: Props) {
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [now, setNow] = useState(new Date())

  // ⏱ auto-update every minute for countdowns
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Always include the creator in the count
  const count = (typeof a.participants_count === 'number'
    ? a.participants_count
    : (a.participants?.length ?? 0)) || 1

  const creatorName = a?.creator?.full_name || 'Someone'
  const creatorVerified = !!a?.creator?.is_verified
  const displayName = isOwner ? 'You' : creatorName

  const avatarSrc = useMemo(() => {
    return a?.creator?.avatar_url ||
      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(creatorName)}`
  }, [a?.creator?.avatar_url, creatorName])

  const locationLabel = a.location_name?.trim?.() || a.location?.trim?.() || ''
  const mapsHref = a.location_lat && a.location_lng
    ? `https://www.google.com/maps/search/?api=1&query=${a.location_lat},${a.location_lng}`
    : (locationLabel ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationLabel)}` : '')

  const status = getStatus(a.start_at, a.end_at, now)

  /* ----- Join & Leave ----- */
  async function join() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { alert('Please log in.'); return }

      const { error } = await supabase
        .from('activity_participants')
        .insert({ activity_id: a.id, user_id: user.id })
      if (error) throw error

      onJoined?.(a.id)
    } catch (e: any) {
      alert(e?.message ?? 'Failed to join')
    } finally {
      setLoading(false)
    }
  }

  async function leave() {
    if (!confirm('Leave this plan?')) return
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')

      const { error } = await supabase
        .from('activity_participants')
        .delete()
        .eq('activity_id', a.id)
        .eq('user_id', user.id)
      if (error) throw error

      onJoined?.(a.id)
    } catch (e: any) {
      alert(e?.message ?? 'Failed to leave')
    } finally {
      setLoading(false)
    }
  }

  /* ----- UI ----- */
  return (
    <div className={`group bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-xl transition transform hover:-translate-y-1 ${status?.label === 'Live' ? 'border-green-400' : 'border-zinc-200'}`}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 border-b bg-gray-50">
        <img src={avatarSrc} className="w-10 h-10 rounded-full object-cover" alt="" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate flex items-center gap-1">
            {displayName}
            {creatorVerified && <VerifiedTick />}
          </div>
          <div className="text-xs text-gray-500">{formatDayAndTime(a.start_at, a.end_at)}</div>
        </div>
        {status && (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
            {status.label}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <div className="text-lg font-bold leading-snug">{a.title}</div>

        {a.description && (
          <>
            <div className="text-sm text-gray-700">
              <RichText text={a.description} expanded={expanded} />
            </div>
            <button
              type="button"
              onClick={() => setExpanded(v => !v)}
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
            >
              {expanded ? 'Hide details' : 'Show details'}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>

            {expanded && (
  <div className="mt-3 space-y-3 text-sm">
    {/* Location */}
    {locationLabel && (
      <div className="flex items-center gap-2 text-gray-700">
        <MapPin className="w-4 h-4 shrink-0 text-indigo-600" />
        {mapsHref ? (
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            {locationLabel}
          </a>
        ) : (
          <span>{locationLabel}</span>
        )}
      </div>
    )}

    {/* Chips */}
    <div className="flex flex-wrap gap-2">
      {a.neighborhood && (
        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs">
          {a.neighborhood}
        </span>
      )}
      {a.category && (
        <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">
          {a.category}
        </span>
      )}
    </div>
  </div>
)}
          </>
        )}

        {/* Participants row */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="flex -space-x-2">
            {Array.from({ length: Math.min(3, count) }).map((_, i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white relative overflow-hidden"
              >
                {/* shimmer effect */}
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
      </div>

      {/* Actions */}
      <div className="px-4 pb-4">
        {isOwner ? (
          <Link
            href={`/activity/${a.id}/edit`}
            className="block text-center w-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 py-2.5 rounded-xl font-medium"
          >
            Edit Activity
          </Link>
        ) : isJoined ? (
          <button
            onClick={leave}
            disabled={loading}
            className="w-full bg-white border border-zinc-300 text-zinc-800 hover:bg-zinc-50 py-2.5 rounded-xl font-medium disabled:opacity-50"
          >
            {loading ? 'Leaving…' : 'Leave'}
          </button>
        ) : (
          <button
            onClick={join}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2.5 rounded-xl font-medium"
          >
            {loading ? 'Joining…' : "I’m In!"}
          </button>
        )}
      </div>
    </div>
  )
}
