'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import MyPlanCard from '@/components/MyPlanCard'

export default function Plans() {
  const [hosting, setHosting] = useState<any[]>([])
  const [joined, setJoined] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true); setError(null)

    const { data: { user }, error: uErr } = await supabase.auth.getUser()
    if (uErr) { setError(uErr.message); setLoading(false); return }
    if (!user) { setHosting([]); setJoined([]); setLoading(false); return }

    // Pull “hosting”
    const { data: hostRows, error: hErr } = await supabase
      .from('activities')
      .select('*')
      .eq('creator_id', user.id)
      .order('start_at', { ascending: true })

    // Pull “joined” (two-step to play nice with RLS)
    const { data: myJoins, error: j1Err } = await supabase
      .from('activity_participants')
      .select('activity_id')
      .eq('user_id', user.id)

    let joinedRows: any[] = []
    if (!j1Err && myJoins?.length) {
      const ids = [...new Set(myJoins.map(r => r.activity_id))]
      const { data: j2, error: j2Err } = await supabase
        .from('activities')
        .select('*')
        .in('id', ids)
        .order('start_at', { ascending: true })
      if (j2Err) setError(j2Err.message)
      joinedRows = j2 || []
    } else if (j1Err) setError(j1Err.message)

    // Attach host profiles (avatar, name)
    const hostIds = Array.from(new Set([... (hostRows||[]).map(a=>a.creator_id), ...joinedRows.map(a=>a.creator_id)]))
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', hostIds.length ? hostIds : ['00000000-0000-0000-0000-000000000000'])
    const pmap = new Map((profiles||[]).map(p => [p.id, p]))

    const attachHost = (rows:any[]) => rows.map(a => ({ ...a, host: pmap.get(a.creator_id) || null }))
    setHosting(attachHost(hostRows||[]))
    setJoined(attachHost(joinedRows||[]))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-semibold text-lg mb-3">Hosting</h2>
        {loading && <div className="text-gray-500">Loading…</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hosting.map(a => <MyPlanCard key={a.id} mode="hosting" activity={a} onChange={load} />)}
          {!loading && hosting.length===0 && <div className="text-gray-500">You’re not hosting anything yet.</div>}
        </div>
      </section>

      <section>
        <h2 className="font-semibold text-lg mb-3">Joined</h2>
        {loading && <div className="text-gray-500">Loading…</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {joined.map(a => <MyPlanCard key={a.id} mode="joined" activity={a} onChange={load} />)}
          {!loading && joined.length===0 && <div className="text-gray-500">You haven’t joined any plans yet.</div>}
        </div>
      </section>

      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  )
}
