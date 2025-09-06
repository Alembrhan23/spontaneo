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
  const [activeTab, setActiveTab] = useState<'hosting' | 'joined'>('hosting')

  const activityIdsRef = useRef<string[]>([])

  async function load() {
    setLoading(true); setError(null)

    const { data: { user }, error: uErr } = await supabase.auth.getUser()
    if (uErr) { setError(uErr.message); setLoading(false); return }
    if (!user) { setHosting([]); setJoined([]); setUnreads({}); setLoading(false); return }

    // HOSTING — exclude deleted & canceled
    const { data: hostRows, error: hErr } = await supabase
      .from('activities')
      .select('*')
      .eq('creator_id', user.id)
      .neq('status', 'deleted')
      .neq('status', 'canceled')
      .order('start_at', { ascending: true })
    if (hErr) setError(hErr.message)

    // JOINED
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
        .neq('status', 'deleted')
        .neq('status', 'canceled')
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

    const hostWithProfile   = attachHost(hostRows || [])
    const joinedWithProfile = attachHost(joinedRows || [])

    const activeForUnread = [...hostWithProfile, ...joinedWithProfile]

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

  useEffect(() => {
    let ch: ReturnType<typeof supabase.channel> | null = null
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const refreshUnreads = async () => {
        const allActs = [...hosting, ...joined]
        if (allActs.length) await computeUnreads(user.id, allActs)
      }
      ch = supabase
        .channel('plans_unreads')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_messages' }, refreshUnreads)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'activity_reads', filter: `user_id=eq.${user.id}` }, refreshUnreads)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'activities' }, () => load())
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'activities' }, () => load())
        .subscribe()
    })()
    return () => { if (ch) supabase.removeChannel(ch) }
  }, [hosting, joined])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
            My Plans
          </h1>
          <p className="mt-2 text-gray-600 max-w-2xl mx-auto">Manage your hosted and joined activities in one place</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex rounded-xl bg-white p-1 shadow-md border border-gray-200">
            <button
              onClick={() => setActiveTab('hosting')}
              className={`px-6 py-3 rounded-xl font-medium text-sm transition-all duration-300 ${
                activeTab === 'hosting'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Hosting
                {hosting.length > 0 && (
                  <span className="ml-2 py-0.5 px-2.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    {hosting.length}
                  </span>
                )}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('joined')}
              className={`px-6 py-3 rounded-xl font-medium text-sm transition-all duration-300 ${
                activeTab === 'joined'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Joined
                {joined.length > 0 && (
                  <span className="ml-2 py-0.5 px-2.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    {joined.length}
                  </span>
                )}
              </span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 border border-red-200 max-w-2xl mx-auto">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading plans</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-3 text-gray-600">Loading your plans...</p>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'hosting' && (
              <section>
                <div className="mb-8 text-center">
                  <h2 className="text-2xl font-semibold text-gray-900">Activities You're Hosting</h2>
                  <p className="text-gray-600 mt-2">Manage the activities you've created</p>
                </div>

                {hosting.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-sm max-w-2xl mx-auto">
                    <div className="mx-auto h-24 w-24 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                      <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="mt-6 text-lg font-medium text-gray-900">No activities hosted yet</h3>
                    <p className="mt-2 text-gray-500 max-w-md mx-auto">Get started by creating your first activity and inviting others to join.</p>
                    <button className="mt-6 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg">
                      Create Your First Activity
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {hosting.map(a => (
                      <MyPlanCard
                        key={a.id}
                        mode="hosting"
                        activity={a}
                        onChange={load}
                        unreadCount={unreads[a.id] || 0}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {activeTab === 'joined' && (
              <section>
                <div className="mb-8 text-center">
                  <h2 className="text-2xl font-semibold text-gray-900">Activities You've Joined</h2>
                  <p className="text-gray-600 mt-2">Activities you're participating in</p>
                </div>

                {joined.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-sm max-w-2xl mx-auto">
                    <div className="mx-auto h-24 w-24 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                      <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h3 className="mt-6 text-lg font-medium text-gray-900">No activities joined yet</h3>
                    <p className="mt-2 text-gray-500 max-w-md mx-auto">Discover and join activities that match your interests.</p>
                    <button className="mt-6 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg">
                      Browse Activities
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {joined.map(a => (
                      <MyPlanCard
                        key={a.id}
                        mode="joined"
                        activity={a}
                        onChange={load}
                        unreadCount={unreads[a.id] || 0}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
