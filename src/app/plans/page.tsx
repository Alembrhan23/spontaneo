'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import MyPlanCard from '@/components/MyPlanCard'

type Profile = { id: string; full_name: string | null; avatar_url: string | null; is_verified?: boolean | null }
type Activity = any

export default function Plans() {
  const [hosting, setHosting] = useState<Activity[]>([])
  const [joined, setJoined] = useState<Activity[]>([])
  const [unreads, setUnreads] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const activityIdsRef = useRef<string[]>([])

  async function load() {
    setLoading(true); setError(null)

    const { data: { user }, error: uErr } = await supabase.auth.getUser()
    if (uErr) { setError(uErr.message); setLoading(false); return }
    if (!user) { setHosting([]); setJoined([]); setUnreads({}); setLoading(false); return }

    // HOSTING
    const { data: hostRows, error: hErr } = await supabase
      .from('activities')
      .select('*')
      .eq('creator_id', user.id)
      .order('start_at', { ascending: true })
    if (hErr) setError(hErr.message)

    // JOINED (current membership)
    const { data: myJoins, error: j1Err } = await supabase
      .from('activity_participants')
      .select('activity_id')
      .eq('user_id', user.id)

    let joinedRows: Activity[] = []
    if (!j1Err && (myJoins?.length ?? 0) > 0) {
      const ids = [...new Set(myJoins!.map(r => r.activity_id))]
      const { data: j2, error: j2Err } = await supabase
        .from('activities')
        .select('*')
        .in('id', ids)
        .order('start_at', { ascending: true })
      if (j2Err) setError(j2Err.message)
      joinedRows = j2 || []
    } else if (j1Err) {
      setError(j1Err.message)
    }

    // PROFILES
    const hostIds = Array.from(new Set([...(hostRows||[]).map(a=>a.creator_id), ...joinedRows.map(a=>a.creator_id)]))
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, is_verified')
      .in('id', hostIds.length ? hostIds : ['00000000-0000-0000-0000-000000000000'])
    const pmap = new Map<string, Profile>((profiles||[]).map(p => [p.id, p]))

    const attachHost = (rows:Activity[]) => rows.map(a => ({ ...a, host: pmap.get(a.creator_id) || null }))

    // Exclude canceled from unread math (but you may still render them if you want)
    const hostWithProfile = attachHost(hostRows || [])
    const joinedWithProfile = attachHost(joinedRows || [])
    const activeForUnread = [...hostWithProfile, ...joinedWithProfile].filter(a => a?.status !== 'canceled')

    setHosting(hostWithProfile)
    setJoined(joinedWithProfile)

    await computeUnreads(user.id, activeForUnread)
    activityIdsRef.current = activeForUnread.map(a => a.id)

    setLoading(false)
  }

  async function computeUnreads(userId: string, activities: Activity[]) {
    const ids = activities.map(a => a.id)
    if (ids.length === 0) { setUnreads({}); return }

    const { data: reads } = await supabase
      .from('activity_reads')
      .select('activity_id,last_read_at')
      .eq('user_id', userId)
      .in('activity_id', ids)

    const lastReadMap: Record<string, string> = {}
    ids.forEach(id => { lastReadMap[id] = '1970-01-01T00:00:00Z' })
    ;(reads || []).forEach(r => {
      const cur = lastReadMap[r.activity_id]
      if (!cur || new Date(r.last_read_at) > new Date(cur)) {
        lastReadMap[r.activity_id] = r.last_read_at
      }
    })

    const minRead = Object.values(lastReadMap).sort()[0] || '1970-01-01T00:00:00Z'

    const { data: msgs } = await supabase
      .from('activity_messages')
      .select('activity_id, created_at, user_id')
      .in('activity_id', ids)
      .gt('created_at', minRead)
      .neq('user_id', userId)

    const map: Record<string, number> = {}
    ids.forEach(id => { map[id] = 0 })
    ;(msgs || []).forEach(m => {
      if (new Date(m.created_at) > new Date(lastReadMap[m.activity_id])) {
        map[m.activity_id] = (map[m.activity_id] || 0) + 1
      }
    })
    setUnreads(map)
  }

  useEffect(() => { load() }, [])

  // realtime: refresh on new messages or when reads update
  useEffect(() => {
    let ch: ReturnType<typeof supabase.channel> | null = null
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const refresh = async () => {
        const allActs = [...hosting, ...joined].filter(a => a?.status !== 'canceled')
        if (allActs.length) await computeUnreads(user.id, allActs)
      }
      ch = supabase
        .channel('plans_unreads')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_messages' }, refresh)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'activity_reads', filter: `user_id=eq.${user.id}` }, refresh)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'activities' }, refresh) // catch status updates
        .subscribe()
    })()
    return () => { if (ch) supabase.removeChannel(ch) }
  }, [hosting, joined])

  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-semibold text-lg mb-3">Hosting</h2>
        {loading && <div className="text-gray-500">Loading…</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hosting.map(a => (
            <MyPlanCard
              key={a.id}
              mode="hosting"
              activity={a}
              onChange={load}
              unreadCount={a.status === 'canceled' ? 0 : (unreads[a.id] || 0)}
            />
          ))}
          {!loading && hosting.length===0 && <div className="text-gray-500">You’re not hosting anything yet.</div>}
        </div>
      </section>

      <section>
        <h2 className="font-semibold text-lg mb-3">Joined</h2>
        {loading && <div className="text-gray-500">Loading…</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {joined.map(a => (
            <MyPlanCard
              key={a.id}
              mode="joined"
              activity={a}
              onChange={load}
              unreadCount={a.status === 'canceled' ? 0 : (unreads[a.id] || 0)}
            />
          ))}
          {!loading && joined.length===0 && <div className="text-gray-500">You haven’t joined any plans yet.</div>}
        </div>
      </section>

      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  )
}
