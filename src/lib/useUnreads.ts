'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'

export function useUnreads(userId?: string | null) {
  const [total, setTotal] = useState(0)
  const [byActivity, setByActivity] = useState<Record<string, number>>({})

  const fetchCounts = useCallback(async () => {
    if (!userId) return
    const { data: rows } = await supabase.rpc('activity_unreads_for_user', { u: userId })
    const map: Record<string, number> = {}
    ;(rows || []).forEach((r: any) => { map[r.activity_id] = r.unread })
    setByActivity(map)

    const { data: t } = await supabase.rpc('activity_unreads_total', { u: userId })
    setTotal((t as number) ?? 0)
  }, [userId])

  useEffect(() => { fetchCounts() }, [fetchCounts])

  // realtime on new messages + when you mark read
  useEffect(() => {
    if (!userId) return
    const ch = supabase
      .channel('unreads')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_messages' }, fetchCounts)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'activity_last_reads', filter: `user_id=eq.${userId}` }, fetchCounts)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [userId, fetchCounts])

  return { total, byActivity, refresh: fetchCounts }
}
