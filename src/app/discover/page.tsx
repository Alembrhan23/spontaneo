'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import ActivityCard from '@/components/ActivityCard'
import { PlusCircle, Shuffle, Utensils, Dumbbell, Music2, Coffee } from 'lucide-react'

type ActivityRow = {
  id: string
  title: string
  description: string | null
  category: string | null
  neighborhood: string | null
  location: string | null
  location_name?: string | null
  location_lat?: number | null
  location_lng?: number | null
  start_at: string
  end_at: string | null
  max_spots: number | null
  created_at: string | null
  creator_id: string
}
type ProfileRow = {
  id: string
  full_name: string | null
  avatar_url: string | null
  is_verified: boolean | null
}
type ParticipantRow = { activity_id: string; user_id: string }

const quickActions = [
  { icon: PlusCircle, label: 'Create Plan',  desc: 'Start something new',   action: 'create' },
  { icon: Shuffle,   label: 'Surprise Me',  desc: 'Find something random', action: 'surprise' },
  { icon: Utensils,  label: 'Food & Drink', desc: 'Find dining options',   action: 'filter:Food & Drink' },
  { icon: Dumbbell,  label: 'Active',       desc: 'Sports & outdoors',     action: 'filter:Sports' },
  { icon: Music2,    label: 'Nightlife',    desc: 'Live music & DJs',      action: 'filter:Music & Nightlife' },
  { icon: Coffee,    label: 'Co-work',      desc: 'Coffee & sprints',      action: 'filter:Coffee & Co-work' },
] as const

const neighborhoods = ['All Neighborhoods', 'RiNo', 'LoHi', 'Five Points'] as const
const filters = [
  'All Activities',
  'Outdoors',
  'Food & Drink',
  'Sports',
  'Music & Nightlife',
  'Arts & Culture',
  'Games & Trivia',
  'Wellness',
  'Coffee & Co-work',
] as const

export default function DiscoverPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<(ActivityRow & {
    creator: ProfileRow | null
    participants_count: number
    _isOwner: boolean
    _isJoined: boolean
  })[]>([])
  const [me, setMe] = useState<string | null>(null)
  const [n, setN] = useState<(typeof neighborhoods)[number]>('All Neighborhoods')
  const [f, setF] = useState<(typeof filters)[number]>('All Activities')

  const aliveRef = useRef(true)
  useEffect(() => {
    aliveRef.current = true
    return () => { aliveRef.current = false }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const [{ data: uData }, { data: acts, error: eActs }] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from('activities')
          .select('id, title, description, category, neighborhood, location, start_at, end_at, max_spots, created_at, creator_id, location_name, location_lat, location_lng')
          .gte('end_at', cutoff)
          .order('start_at', { ascending: true })
      ])

      const currentUserId = uData?.user?.id ?? null
      if (aliveRef.current) setMe(currentUserId)

      if (eActs) throw eActs
      const activities = (acts ?? []) as ActivityRow[]
      if (!activities.length) {
        if (aliveRef.current) setRows([])
        return
      }

      const activityIds = activities.map(a => a.id)
      const creatorIds = Array.from(new Set(activities.map(a => a.creator_id)))

      const [partsRes, mineRes, profRes] = await Promise.all([
        activityIds.length
          ? supabase.from('activity_participants').select('activity_id, user_id').in('activity_id', activityIds)
          : Promise.resolve({ data: [] as ParticipantRow[], error: null }),
        currentUserId
          ? supabase.from('activity_participants').select('activity_id').eq('user_id', currentUserId)
          : Promise.resolve({ data: [] as { activity_id: string }[], error: null }),
        creatorIds.length
          ? supabase.from('profiles').select('id, full_name, avatar_url, is_verified').in('id', creatorIds)
          : Promise.resolve({ data: [] as ProfileRow[], error: null }),
      ])

      if (partsRes.error) throw partsRes.error
      if (mineRes.error) throw mineRes.error
      if (profRes.error) throw profRes.error

      const parts = (partsRes.data ?? []) as ParticipantRow[]
      const profiles = (profRes.data ?? []) as ProfileRow[]
      const joinedSet = new Set(((mineRes.data ?? []) as { activity_id: string }[]).map(d => d.activity_id))

      const byCreator: Record<string, ProfileRow> = Object.fromEntries(profiles.map(p => [p.id, p]))
      const byActCount: Record<string, number> = {}
      for (const p of parts) byActCount[p.activity_id] = (byActCount[p.activity_id] ?? 0) + 1

      const merged = activities.map(a => ({
        ...a,
        creator: byCreator[a.creator_id] ?? null,
        participants_count: byActCount[a.id] ?? 0,
        _isOwner: currentUserId ? a.creator_id === currentUserId : false,
        _isJoined: joinedSet.has(a.id),
      }))

      if (aliveRef.current) setRows(merged)
    } catch (err: any) {
      console.error('load activities error:', err)
      if (aliveRef.current) {
        setRows([])
        setError(err?.message ?? 'Failed to load activities.')
      }
    } finally {
      if (aliveRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const items = useMemo(() => {
    const now = new Date()
    return rows
      .filter(a =>
        (n === 'All Neighborhoods' || a.neighborhood === n) &&
        (f === 'All Activities' || a.category === f) &&
        (!(!!me) || !a._isJoined)
      )
      .sort((a, b) => {
        const now = new Date()
        const aStart = new Date(a.start_at)
        const bStart = new Date(b.start_at)
        const aEnd = a.end_at ? new Date(a.end_at) : null
        const bEnd = b.end_at ? new Date(b.end_at) : null

        const isALive = aStart <= now && aEnd && now <= aEnd
        const isBLive = bStart <= now && bEnd && now <= bEnd
        if (isALive && !isBLive) return -1
        if (!isALive && isBLive) return 1

        const isASoon = aStart > now
        const isBSoon = bStart > now
        if (isASoon && !isBSoon) return -1
        if (!isASoon && isBSoon) return 1

        // ended last
        if (aEnd && bEnd) return aEnd.getTime() - bEnd.getTime()
        return aStart.getTime() - bStart.getTime()
      })
  }, [rows, n, f, me])

  function onQuick(action: string) {
    if (action === 'create') router.push('/create')
    else if (action === 'surprise') router.push('/create?surprise=1')
    else if (action.startsWith('filter:')) setF(action.split(':')[1] as typeof filters[number])
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {quickActions.map((c) => (
          <button
            key={c.label}
            onClick={() => onQuick(c.action)}
            className="p-4 rounded-2xl shadow bg-white text-left hover:shadow-md hover:-translate-y-0.5 transition"
          >
            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center mb-2">
              <c.icon className="text-indigo-600 w-5 h-5" />
            </div>
            <div className="font-semibold">{c.label}</div>
            <div className="text-sm text-gray-500">{c.desc}</div>
          </button>
        ))}
      </div>

      {/* Neighborhood chips */}
      <div className="flex flex-wrap gap-2">
        {neighborhoods.map((x) => (
          <button
            key={x}
            onClick={() => setN(x)}
            className={`px-4 py-1 rounded-full text-sm ${n === x ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            {x}
          </button>
        ))}
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        {filters.map((x) => (
          <button
            key={x}
            onClick={() => setF(x)}
            className={`px-4 py-1 rounded-full text-sm ${f === x ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            {x}
          </button>
        ))}
      </div>

      {/* Feed */}
      {loading ? (
        <div>Loading…</div>
      ) : error ? (
        <div className="text-rose-600">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((a) => (
            <ActivityCard
              key={a.id}
              a={a}
              isOwner={a._isOwner}
              isJoined={a._isJoined}
              onJoined={load}
            />
          ))}
          {items.length === 0 && (
            <div className="text-gray-500">No activities yet. Create one!</div>
          )}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => router.push('/create')}
        aria-label="Add"
        className="fixed bottom-6 right-6 md:right-10 w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg grid place-items-center text-2xl"
      >
        +
      </button>
    </div>
  )
}
