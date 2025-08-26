'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import ActivityCard from '@/components/ActivityCard'

export default function Happening() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const now = new Date()
    const twoHrs = new Date(now.getTime() + 2*60*60*1000)
    const { data } = await supabase
      .from('activities_with_counts')
      .select('*')
      .gte('start_at', now.toISOString())
      .lte('start_at', twoHrs.toISOString())
      .order('start_at', { ascending: true })
    setItems(data || [])
    setLoading(false)
  }
  useEffect(()=>{ load() }, [])

  if (loading) return <div>Loading…</div>
  return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {items.map(a => <ActivityCard key={a.id} a={a} onJoined={load} />)}
    {items.length===0 && <div className="text-gray-500">Nothing in the next 2 hours. Create one!</div>}
  </div>
}
