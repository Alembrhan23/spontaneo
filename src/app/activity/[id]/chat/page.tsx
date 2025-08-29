'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Image from 'next/image'

type Msg = {
  id: string
  activity_id: string
  user_id: string
  content: string
  created_at: string
  user?: { full_name?: string | null; avatar_url?: string | null } | null
}

const PAGE_SIZE = 40

export default function ActivityChatPage() {
  const router = useRouter()
  const { id: activityId } = useParams<{ id: string }>()
  const [me, setMe] = useState<string | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [text, setText] = useState('')
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [oldestCursor, setOldestCursor] = useState<string | null>(null)

  const listRef = useRef<HTMLDivElement>(null)
  const profileCache = useRef<Record<string, { full_name?: string | null; avatar_url?: string | null }>>({})

  const timeStr = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  const groups = useMemo(() => {
    const byDay: Record<string, Msg[]> = {}
    for (const m of msgs) {
      const k = new Date(m.created_at).toDateString()
      ;(byDay[k] ||= []).push(m)
    }
    return Object.entries(byDay)
  }, [msgs])

  const markRead = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('activity_reads').upsert({
      activity_id: activityId,
      user_id: user.id,
      last_read_at: new Date().toISOString(),
    }, { onConflict: 'activity_id,user_id' })
  }, [activityId])

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setMe(user.id)

      const [{ data: act }, { data: part }] = await Promise.all([
        supabase.from('activities').select('creator_id').eq('id', activityId).single(),
        supabase.from('activity_participants').select('activity_id').eq('activity_id', activityId).eq('user_id', user.id).maybeSingle(),
      ])
      const member = !!part || act?.creator_id === user.id
      setIsMember(member)
      if (!member) { setLoading(false); return }

      await loadLatest()
      await markRead()

      const channel = supabase.channel('room:' + activityId)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_messages', filter: `activity_id=eq.${activityId}` },
          async (payload: any) => {
            const m: Msg = payload.new
            if (!profileCache.current[m.user_id]) {
              const { data } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', m.user_id).single()
              profileCache.current[m.user_id] = data || {}
            }
            m.user = profileCache.current[m.user_id]
            setMsgs(prev => [...prev, m])

            const el = listRef.current
            if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 160) {
              el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
              await markRead()
            }
          })
        .subscribe()

      setLoading(false)
      setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }), 0)

      return () => { supabase.removeChannel(channel) }
    })()
  }, [activityId, router, markRead])

  // mark read on focus, visibility change, and before unmount
  useEffect(() => {
    const onFocus = () => { if (isMember) markRead() }
    const onVis = () => { if (document.visibilityState === 'visible' && isMember) markRead() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVis)
      markRead()
    }
  }, [isMember, markRead])

  // mark read when scrolled near bottom
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const onScroll = () => {
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) markRead()
    }
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [markRead])

  async function loadLatest() {
    const { data } = await supabase
      .from('activity_messages')
      .select('id, activity_id, user_id, content, created_at, user:profiles(full_name, avatar_url)')
      .eq('activity_id', activityId)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)

    const list = (data ?? []).reverse()
    setMsgs(list as Msg[])
    setHasMore((data?.length ?? 0) === PAGE_SIZE)
    setOldestCursor(list[0]?.created_at ?? null)
    list.forEach(m => { if (m.user_id && m.user && !profileCache.current[m.user_id]) profileCache.current[m.user_id] = m.user })
  }

  async function loadMore() {
    if (!oldestCursor) return
    const { data } = await supabase
      .from('activity_messages')
      .select('id, activity_id, user_id, content, created_at, user:profiles(full_name, avatar_url)')
      .eq('activity_id', activityId)
      .lt('created_at', oldestCursor)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)

    const older = (data ?? []).reverse() as Msg[]
    setMsgs(prev => [...older, ...prev])
    setHasMore((data?.length ?? 0) === PAGE_SIZE)
    setOldestCursor(older[0]?.created_at ?? oldestCursor)
  }

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || !isMember || !me) return
    const body = text.trim()
    setSending(true)

    const temp: Msg = {
      id: 'temp-' + Math.random().toString(36).slice(2),
      activity_id: activityId,
      user_id: me,
      content: body,
      created_at: new Date().toISOString(),
      user: profileCache.current[me] ?? { full_name: 'You', avatar_url: undefined },
    }
    setMsgs(prev => [...prev, temp])
    setText('')

    const { error } = await supabase.from('activity_messages').insert({ activity_id: activityId, user_id: me, content: body })
    if (error) {
      setMsgs(prev => prev.filter(m => m.id !== temp.id))
      setText(body)
      alert(error.message)
    } else {
      await markRead()
    }
    setSending(false)
  }

  if (loading) return <div className="max-w-3xl mx-auto p-6">Loading…</div>

  if (!isMember) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow p-6 space-y-3">
        <h1 className="text-lg font-bold">Join to view the chat</h1>
        <p className="text-sm text-gray-600">Only participants (or the host) can see and send messages.</p>
        <button onClick={() => router.push('/discover')} className="w-full bg-indigo-600 text-white py-2 rounded-lg">
          Back to Discover
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 md:px-8 py-6">
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="px-4 py-3 border-b font-semibold">Activity Chat</div>

        <div ref={listRef} className="h-[62vh] sm:h-[70vh] overflow-y-auto px-3 py-4 space-y-6">
          {groups.map(([day, items]) => (
            <div key={day} className="space-y-2">
              <div className="flex items-center justify-center">
                <div className="text-xs text-gray-500 px-2 py-1 bg-gray-50 rounded-full border">
                  {new Date(items[0].created_at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
              </div>

              <div className="space-y-1">
                {items.map((m, i) => {
                  const prev = items[i - 1]
                  const sameSender =
                    prev && prev.user_id === m.user_id &&
                    new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000

                  const mine = m.user_id === me
                  const avatar = m.user?.avatar_url ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(m.user?.full_name || 'User')}`

                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'} px-1`}>
                      <div className={`flex max-w-[85%] ${mine ? 'flex-row-reverse' : ''} items-end gap-2`}>
                        <div className={`${sameSender ? 'invisible' : ''} w-7 h-7 relative shrink-0`}>
                          {!mine && <Image src={avatar} alt="" fill sizes="28px" className="rounded-full object-cover" />}
                        </div>

                        <div>
                          {!mine && !sameSender && (
                            <div className="text-[11px] text-gray-500 mb-0.5">
                              {(m.user?.full_name || 'Someone')} • {timeStr(m.created_at)}
                            </div>
                          )}
                          <div className={`rounded-2xl px-3 py-2 text-sm break-words ${mine ? 'bg-indigo-600 text-white' : 'bg-gray-100'} ${sameSender && !mine ? 'rounded-t-2xl rounded-bl-md' : ''}`}>
                            {m.content}
                          </div>
                          {mine && <div className="text-[10px] text-gray-400 text-right mt-0.5">{timeStr(m.created_at)}</div>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {hasMore && (
            <div className="flex justify-center">
              <button onClick={loadMore} className="text-xs px-3 py-1 rounded-full border bg-white hover:bg-gray-50">
                Load earlier
              </button>
            </div>
          )}

          {msgs.length === 0 && (
            <div className="h-full grid place-items-center text-gray-400 text-sm">
              No messages yet. Say hi 👋
            </div>
          )}
        </div>

        <form onSubmit={send} className="p-3 border-t flex gap-2">
          <input
            className="flex-1 border rounded-lg px-3 py-2"
            placeholder="Write a message…"
            value={text}
            onChange={e => setText(e.target.value)}
          />
          <button disabled={sending || !text.trim()} className="px-4 py-2 rounded-lg bg-indigo-600 disabled:opacity-50 text-white">
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
