'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { MapPin, Clock, Users } from 'lucide-react'

type Props = {
  a: any
  isOwner: boolean
  isJoined: boolean
  hasUnread?: boolean
  onJoined?: (id: string) => void
}

function VerifiedBadge({ small=false }:{ small?: boolean }) {
  return (
    <span
      className={`ml-1 inline-flex items-center gap-1 rounded-full ${small?'px-1.5 py-0.5 text-[10px]':'px-2 py-0.5 text-xs'} bg-emerald-600/10 text-emerald-700`}
      title="ID-verified host"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" className="fill-current">
        <path d="M9 16.2 4.8 12l1.4-1.4L9 13.4l8.8-8.8L19.2 6z"/>
      </svg>
      <span>Verified</span>
    </span>
  )
}

function whenLabel(startISO: string) {
  const d = new Date(startISO)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate()+1)
  const isTomorrow = d.toDateString() === tomorrow.toDateString()
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return `${sameDay ? 'Today' : isTomorrow ? 'Tomorrow' : d.toLocaleDateString(undefined,{ month:'short', day:'numeric' })} • ${time}`
}

function categoryGradient(cat?: string | null) {
  switch ((cat || '').toLowerCase()) {
    case 'food & drink': return 'from-rose-500 via-orange-500 to-amber-500'
    case 'sports':
    case 'active':       return 'from-sky-500 via-cyan-500 to-emerald-500'
    case 'outdoors':     return 'from-emerald-500 via-lime-500 to-teal-500'
    default:             return 'from-indigo-500 via-violet-500 to-fuchsia-500'
  }
}

export default function ActivityCard({ a, isOwner, isJoined, onJoined }: Props) {
  const [loading, setLoading] = useState(false)

  const count = typeof a.participants_count === 'number'
    ? a.participants_count
    : (a.participants?.length ?? 0)

  const capacity = a.max_spots ?? 0
  const spotsLeft = Math.max(0, capacity ? capacity - count : 0)
  const pct = capacity ? Math.min(100, Math.round((count / capacity) * 100)) : 0

  const creatorName = a?.creator?.full_name || 'Someone'
  const creatorVerified = !!a?.creator?.is_verified
  const avatarSrc = useMemo(() => {
    return a?.creator?.avatar_url ||
      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(creatorName)}`
  }, [a?.creator?.avatar_url, creatorName])

  const locationLabel = a.location_name?.trim?.() || a.location?.trim?.() || ''
  const mapsHref = a.location_lat && a.location_lng
    ? `https://www.google.com/maps/search/?api=1&query=${a.location_lat},${a.location_lng}`
    : (locationLabel ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationLabel)}` : '')

  async function tryConfirmEndpoint(): Promise<boolean> {
    try { const r = await fetch(`/api/plans/${a.id}/confirm`, { method: 'POST' }); return r.ok } catch { return false }
  }

  async function join() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { alert('Please log in.'); return }

      const { data: prof, error: perr } = await supabase
        .from('profiles').select('is_verified').eq('id', user.id).maybeSingle()
      if (perr) throw perr
      if (!prof?.is_verified) { alert('Please verify your identity to join activities.'); window.location.href = '/verify'; return }

      const ok = await tryConfirmEndpoint()
      if (!ok) {
        const { error } = await supabase
          .from('activity_participants')
          .insert({ activity_id: a.id, user_id: user.id, state: 'confirmed' })
        if (error) throw error
      }
      onJoined?.(a.id)
    } catch (e: any) {
      alert(e?.message ?? 'Failed to join')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="group bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition">
      {/* Gradient ribbon */}
      <div className={`h-1 bg-gradient-to-r ${categoryGradient(a.category)}`} />

      {/* Top row: host + time/neighborhood chips */}
      <div className="px-4 pt-4 flex items-center gap-3">
        <img src={avatarSrc} className="w-9 h-9 rounded-full object-cover" alt="" />
        <div className="min-w-0">
          <div className="font-semibold truncate">
            {creatorName}
            {creatorVerified && <VerifiedBadge small />}
            {isOwner && <span className="ml-2 text-xs text-indigo-600">(You)</span>}
          </div>
          <div className="text-[11px] text-gray-400">{a.created_at ? new Date(a.created_at).toLocaleString() : ''}</div>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 text-xs">
            {whenLabel(a.start_at)}
          </span>
          {a.neighborhood && (
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs">
              {a.neighborhood}
            </span>
          )}
        </div>
      </div>

      {/* Title + desc */}
      <div className="px-4 mt-3">
        <div className="text-lg font-bold leading-snug">{a.title}</div>
        {a.description && <div className="text-sm text-gray-700 line-clamp-2 mt-1">{a.description}</div>}
      </div>

      {/* Time + Place row */}
      <div className="px-4 mt-3 flex items-center gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          {new Date(a.start_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </div>
        {locationLabel && (
          <div className="flex items-center gap-1 min-w-0">
            <MapPin className="w-4 h-4 shrink-0" />
            {mapsHref ? (
              <a
                href={mapsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate max-w-[14rem] hover:underline"
                title={locationLabel}
              >
                {locationLabel}
              </a>
            ) : (
              <span className="truncate max-w-[14rem]" title={locationLabel}>{locationLabel}</span>
            )}
          </div>
        )}
      </div>

      {/* Capacity bar */}
      <div className="px-4 mt-3 flex items-center gap-2 text-xs text-zinc-700">
        <Users className="w-4 h-4" />
        {capacity
          ? <span>{count}/{capacity} going • {spotsLeft} left</span>
          : <span>{count} going</span>
        }
      </div>

      {capacity ? (
        <div className="px-4 mt-2">
          <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
            <div
              className="h-1.5 bg-gradient-to-r from-indigo-500 to-violet-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* Primary action */}
      <div className="px-4 pb-4 pt-3">
        {isOwner ? (
          <Link
            href={`/activity/${a.id}/edit`}
            className="block text-center w-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 py-3 rounded-xl font-medium"
          >
            Edit Activity
          </Link>
        ) : isJoined ? (
          <>
            <button
              disabled
              className="w-full bg-indigo-50 text-indigo-700 py-3 rounded-xl font-medium cursor-default"
            >
              You’re In
            </button>
            <div className="mt-1 text-[11px] text-gray-500 text-center">
              You’ll earn +20 VP when you check in.
            </div>
          </>
        ) : (capacity && spotsLeft === 0) ? (
          <button
            disabled
            className="w-full bg-gray-200 text-gray-500 py-3 rounded-xl font-medium cursor-not-allowed"
          >
            Full
          </button>
        ) : (
          <>
            <button
              onClick={join}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3 rounded-xl font-medium"
            >
              {loading ? 'Joining…' : "I’m In!"}
            </button>
            <div className="mt-1 text-[11px] text-gray-500 text-center">
              +5 VP now • +20 VP at check-in.
            </div>
          </>
        )}
      </div>
    </div>
  )
}
