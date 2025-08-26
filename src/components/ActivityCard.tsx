// components/ActivityCard.tsx
'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { MapPin, Clock, MessageCircle } from 'lucide-react'

type Props = {
  a: any
  isOwner: boolean
  isJoined: boolean
  hasUnread?: boolean
  onJoined?: (id: string) => void
}

export default function ActivityCard({ a, isOwner, isJoined, hasUnread, onJoined }: Props) {
  const [loading, setLoading] = useState(false)

  const count = typeof a.participants_count === 'number'
    ? a.participants_count
    : (a.participants?.length ?? 0)

  const spotsLeft = Math.max(0, (a.max_spots ?? 0) - count)
  

  const creatorName = a?.creator?.full_name || 'Someone'
  const avatarSrc = useMemo(() => {
    return a?.creator?.avatar_url ||
      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(creatorName)}`
  }, [a?.creator?.avatar_url, creatorName])

  // prefer new fields if you add them; fall back to old `location`
  const locationLabel =
  a.location_name?.trim?.() || a.location?.trim?.() || ''

  const mapsHref = a.location_lat && a.location_lng
  ? `https://www.google.com/maps/search/?api=1&query=${a.location_lat},${a.location_lng}`
  : (locationLabel
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationLabel)}`
      : '')

 async function join() {
  setLoading(true)
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { 
      alert('Please log in.'); 
      return 
    }

    // fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('verified')
      .eq('id', user.id)
      .single()

    if (!profile?.verified) {
      alert('You need to verify your identity before joining activities.')
      // optional: redirect them to Stripe verification
      window.location.href = '/verify' 
      return
    }

    // if verified → join
    const rpc = await supabase.rpc('join_activity', { a_id: a.id })
    if (!rpc.error) { onJoined?.(a.id); return }

    const { error } = await supabase
      .from('activity_participants')
      .insert({ activity_id: a.id, user_id: user.id })
    if (error) throw error

    onJoined?.(a.id)
  } catch (e: any) {
    alert(e.message ?? 'Failed to join')
  } finally {
    setLoading(false)
  }
}


  return (
    <div className="bg-white rounded-2xl shadow p-4">
      {/* header */}
      <div className="flex items-center gap-3 mb-2">
        <img src={avatarSrc} className="w-8 h-8 rounded-full" alt="" />
        <div className="leading-tight">
          <div className="font-semibold">
            {creatorName} {isOwner && <span className="ml-2 text-xs text-indigo-600">(You)</span>}
          </div>
          <div className="text-xs text-gray-400">
            {a.created_at ? new Date(a.created_at).toLocaleString() : ''}
          </div>
        </div>
        <span className="ml-auto bg-pink-100 text-pink-600 px-2 py-1 rounded-full text-xs">🔥 Happening</span>
        {a.neighborhood && (
          <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full">
            {a.neighborhood}
          </span>
        )}
      </div>

      {/* body */}
      <div className="text-lg font-bold mb-1">{a.title}</div>
      {a.description && <div className="text-sm text-gray-700">{a.description}</div>}

      <div className="flex items-center gap-4 text-sm text-gray-600 mt-3">
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
        <span className="truncate max-w-[14rem]" title={locationLabel}>
          {locationLabel}
        </span>
      )}
    </div>
  )}
</div>

      {/* meta + chat */}
      <div className="flex items-center justify-between mt-3">
        <div className="text-xs text-indigo-600">{spotsLeft} spots left</div>

        {(isOwner || isJoined) ? (
          <Link href={`/activity/${a.id}/chat`} className="relative text-indigo-600 text-sm flex items-center gap-1">
            <MessageCircle className="w-4 h-4" />
            Chat
            {hasUnread && <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-red-500" />}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => alert('Join this activity to see the chat.')}
            className="text-indigo-600 text-sm flex items-center gap-1 opacity-80"
          >
            <MessageCircle className="w-4 h-4" />
            Chat
          </button>
        )}
      </div>

      {/* primary action */}
      <div className="mt-3">
        {isOwner ? (
          <Link
            href={`/activity/${a.id}/edit`}
            className="block text-center w-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 py-3 rounded-xl font-medium"
          >
            Edit Activity
          </Link>
        ) : isJoined ? (
          <button
            disabled
            className="w-full bg-indigo-50 text-indigo-700 py-3 rounded-xl font-medium cursor-default"
          >
            You’re In
          </button>
        ) : spotsLeft === 0 ? (
          <button
            disabled
            className="w-full bg-gray-200 text-gray-500 py-3 rounded-xl font-medium cursor-not-allowed"
          >
            Full
          </button>
        ) : (
          <button
            onClick={join}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3 rounded-xl font-medium"
          >
            {loading ? 'Joining…' : "I’m In!"}
          </button>
        )}
      </div>
    </div>
  )
}
