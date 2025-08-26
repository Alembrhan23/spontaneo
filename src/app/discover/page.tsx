// app/discover/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import ActivityCard from '@/components/ActivityCard'
import { PlusCircle, Shuffle, Utensils, Dumbbell } from 'lucide-react'

type ActivityRow = {
  id: string
  title: string
  description: string | null
  category: string | null
  neighborhood: string | null
  location: string | null
  start_at: string
  max_spots: number | null
  created_at: string | null
  creator_id: string
}

type ProfileRow = { id: string; full_name: string | null; avatar_url: string | null }
type ParticipantRow = { activity_id: string; user_id: string }

const quickActions = [
  { icon: PlusCircle, label: 'Create Plan', desc: 'Start something new', action: 'create' },
  { icon: Shuffle,   label: 'Surprise Me', desc: 'Find random activity', action: 'surprise' },
  { icon: Utensils,  label: 'Food & Drink', desc: 'Find dining options', action: 'filter:Food & Drink' },
  { icon: Dumbbell,  label: 'Active',       desc: 'Sports & outdoors',   action: 'filter:Sports' },
]

const neighborhoods = ['All Neighborhoods', 'RiNo', 'LoHi', 'Five Points'] as const
const filters = ['All Activities', 'Outdoors', 'Food & Drink', 'Sports'] as const

export default function DiscoverPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<any[]>([])
  const [me, setMe] = useState<string | null>(null)

  const [n, setN] = useState<(typeof neighborhoods)[number]>('All Neighborhoods')
  const [f, setF] = useState<(typeof filters)[number]>('All Activities')

  async function load() {
    setLoading(true)
    try {
      // who am I?
      const { data: { user } } = await supabase.auth.getUser()
      const currentUserId = user?.id ?? null
      setMe(currentUserId)

      // 1) activities
      const { data: activities, error: e1 } = await supabase
        .from('activities')
        .select('id, title, description, category, neighborhood, location, start_at, max_spots, created_at, creator_id, location_name,  location_lat, location_lng')
        .order('start_at', { ascending: true })
      if (e1) throw e1
      if (!activities || activities.length === 0) { setRows([]); return }

      const ids = activities.map(a => a.id)
      const creatorIds = Array.from(new Set(activities.map(a => a.creator_id)))

      // 2) participants for counts
      let parts: ParticipantRow[] = []
      if (ids.length) {
        const { data, error } = await supabase
          .from('activity_participants')
          .select('activity_id, user_id')
          .in('activity_id', ids)
        if (error) throw error
        parts = data ?? []
      }

      // 3) which activities I joined
      let joinedSet = new Set<string>()
      if (currentUserId) {
        const { data } = await supabase
          .from('activity_participants')
          .select('activity_id')
          .eq('user_id', currentUserId)
        joinedSet = new Set((data ?? []).map(d => d.activity_id))
      }

      // 4) creator profiles
      let profiles: ProfileRow[] = []
      if (creatorIds.length) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', creatorIds)
        if (error) throw error
        profiles = data ?? []
      }

      // merge
      const byCreator: Record<string, ProfileRow> = Object.fromEntries(
        profiles.map(p => [p.id, p])
      )
      const byActCount: Record<string, number> = {}
      parts.forEach(p => {
        byActCount[p.activity_id] = (byActCount[p.activity_id] ?? 0) + 1
      })

      const merged = (activities as ActivityRow[]).map(a => ({
        ...a,
        creator: byCreator[a.creator_id] ?? null,
        participants_count: byActCount[a.id] ?? 0,
        _isOwner: currentUserId ? a.creator_id === currentUserId : false,
        _isJoined: joinedSet.has(a.id),
      }))

      setRows(merged)
    } catch (err) {
      console.error('load activities error:', err)
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const items = useMemo(() => {
    return rows.filter((a) =>
      (n === 'All Neighborhoods' || a.neighborhood === n) &&
      (f === 'All Activities'    || a.category === f)
    )
  }, [rows, n, f])

  function onQuick(action: string) {
    if (action === 'create') router.push('/create')
    else if (action === 'surprise') router.push('/create?surprise=1')
    else if (action.startsWith('filter:')) setF(action.split(':')[1] as any)
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickActions.map((c) => (
          <button
            key={c.label}
            onClick={() => onQuick(c.action)}
            className="p-4 rounded-2xl shadow bg-white text-left hover:shadow-md transition"
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
            className={`px-4 py-1 rounded-full text-sm ${
              n === x ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {x}
          </button>
        ))}
      </div>

      {/* Activity chips */}
      <div className="flex flex-wrap gap-2">
        {filters.map((x) => (
          <button
            key={x}
            onClick={() => setF(x)}
            className={`px-4 py-1 rounded-full text-sm ${
              f === x ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {x}
          </button>
        ))}
      </div>

      {/* Feed */}
      {loading ? (
        <div>Loading…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((a: any) => (
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
