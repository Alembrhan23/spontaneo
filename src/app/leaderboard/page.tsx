// app/leaderboard/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export default function Leaderboard() {
  const [rows, setRows] = useState<any[]>([])
  useEffect(() => {
    supabase.from('vibe_leaderboard_week').select('*').then(({ data }) => setRows(data || []))
  }, [])
  return (
    <div className="max-w-xl mx-auto bg-white rounded-2xl shadow p-6">
      <h1 className="text-xl font-bold mb-4">Weekly Vibe Leaderboard</h1>
      <ol className="space-y-3">
        {rows.map((r, i) => (
          <li key={r.user_id} className="flex items-center gap-3">
            <div className="w-6 text-right">{i+1}.</div>
            <img src={r.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(r.full_name || 'User')}`} className="w-8 h-8 rounded-full"/>
            <div className="flex-1">{r.full_name || 'Someone'}</div>
            <div className="font-semibold text-indigo-700">{r.points}</div>
          </li>
        ))}
      </ol>
    </div>
  )
}
