// src/app/activity/[id]/chat/page.tsx
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type Msg = {
  id: string
  activity_id: string
  user_id: string
  content: string
  created_at: string
  user?: { full_name?: string | null } | null
}

type Member = { id: string; full_name: string | null }

const PAGE_SIZE = 40

// Function to generate consistent color from user ID
const getUserColor = (userId: string) => {
  // Professional WhatsApp-inspired colors
  const colors = [
    'bg-[#005C4B]', // WhatsApp green (for current user)
    'bg-[#202C33]', // Dark gray-blue
    'bg-[#2A3942]', // Medium gray-blue
    'bg-[#3D5460]', // Desaturated blue
    'bg-[#4F5B66]', // Muted gray-blue
    'bg-[#5C6BC0]', // Soft indigo
    'bg-[#427D9D]', // Muted teal
    'bg-[#5D8A7F]', // Sage green
  ];
  
  // Simple hash function for consistent color assignment
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

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

  const [members, setMembers] = useState<Member[]>([])
  const [showMembers, setShowMembers] = useState(false)

  const listRef = useRef<HTMLDivElement>(null)
  const profileCache = useRef<Record<string, { full_name?: string | null }>>({})

  const timeStr = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  const groups = useMemo(() => {
    const byDay: Record<string, Msg[]> = {}
    for (const m of msgs) {
      const k = new Date(m.created_at).toDateString()
      ;(byDay[k] ||= []).push(m)
    }
    return Object.entries(byDay)
  }, [msgs])

  function initials(name?: string | null) {
    if (!name) return '?'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || '?'
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const markRead = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('activity_reads').upsert(
      {
        activity_id: activityId,
        user_id: user.id,
        last_read_at: new Date().toISOString(),
      },
      { onConflict: 'activity_id,user_id' }
    )
  }, [activityId])

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setMe(user.id)

      const [{ data: act }, { data: part }] = await Promise.all([
        supabase.from('activities').select('id,creator_id').eq('id', activityId).single(),
        supabase
          .from('activity_participants')
          .select('activity_id')
          .eq('activity_id', activityId)
          .eq('user_id', user.id)
          .maybeSingle(),
      ])
      const member = !!part || act?.creator_id === user.id
      setIsMember(member)
      if (!member) {
        setLoading(false)
        return
      }

      await loadLatest()
      await markRead()
      await loadMembers(act!.creator_id)

      channel = supabase
        .channel('chat:' + activityId)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'activity_messages',
            filter: `activity_id=eq.${activityId}`,
          },
          async (payload: any) => {
            const m: Msg = payload.new
            if (!profileCache.current[m.user_id]) {
              const { data } = await supabase
                .from('profiles')
                .select('id, full_name')
                .eq('id', m.user_id)
                .single()
              if (data) profileCache.current[m.user_id] = data
            }
            m.user = profileCache.current[m.user_id]
            setMsgs((prev) => [...prev, m])

            const el = listRef.current
            if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 160) {
              el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
              await markRead()
            }
          }
        )
        .subscribe()

      setLoading(false)
      setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }), 0)
    })()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [activityId, router, markRead])

  async function loadLatest() {
    const { data } = await supabase
      .from('activity_messages')
      .select('id, activity_id, user_id, content, created_at, user:profiles(full_name)')
      .eq('activity_id', activityId)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)

    const list = (data ?? []).reverse()
    setMsgs(list as Msg[])
    setHasMore((data?.length ?? 0) === PAGE_SIZE)
    setOldestCursor(list[0]?.created_at ?? null)
    list.forEach((m) => {
      if (m.user_id && m.user && !profileCache.current[m.user_id])
        profileCache.current[m.user_id] = m.user
    })
  }

  async function loadMore() {
    if (!oldestCursor) return
    const { data } = await supabase
      .from('activity_messages')
      .select('id, activity_id, user_id, content, created_at, user:profiles(full_name)')
      .eq('activity_id', activityId)
      .lt('created_at', oldestCursor)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)

    const older = (data ?? []).reverse() as Msg[]
    setMsgs((prev) => [...older, ...prev])
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
      user: profileCache.current[me] ?? { full_name: 'You' },
    }
    setMsgs((prev) => [...prev, temp])
    setText('')

    const { error } = await supabase
      .from('activity_messages')
      .insert({ activity_id: activityId, user_id: me, content: body })
    if (error) {
      setMsgs((prev) => prev.filter((m) => m.id !== temp.id))
      setText(body)
      alert(error.message)
    } else {
      await markRead()
    }
    setSending(false)
  }

  async function loadMembers(hostId: string) {
    const [{ data: host }, { data: parts }] = await Promise.all([
      supabase.from('profiles').select('id, full_name').eq('id', hostId).single(),
      supabase
        .from('activity_participants')
        .select('user_id, profiles(full_name)')
        .eq('activity_id', activityId),
    ])

    const list: Member[] = []
    if (host) list.push({ id: host.id, full_name: host.full_name })

    if (parts) {
      parts.forEach((p: any) => {
        if (p.profiles) list.push({ id: p.user_id, full_name: p.profiles.full_name })
      })
    }

    setMembers(list)
  }

  if (loading) return <div className="max-w-3xl mx-auto p-6">Loading…</div>

  if (!isMember) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow p-6 space-y-3">
        <h1 className="text-lg font-bold">Join to view the chat</h1>
        <p className="text-sm text-gray-600">Only participants (or the host) can see and send messages.</p>
        <button onClick={() => router.push('/discover')} className="w-full bg-[#005C4B] text-white py-2 rounded-lg">
          Back to Discover
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 md:px-8 py-6">
      <div className="bg-white rounded-2xl shadow overflow-hidden flex flex-col h-[80vh] relative">
        {/* Header */}
        <div className="px-4 py-3 border-b flex justify-between items-center font-semibold bg-[#F0F2F5]">
          <span>Activity Chat</span>
          <button
            onClick={() => setShowMembers(true)}
            className="text-sm px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200"
          >
            Members ({members.length})
          </button>
        </div>

        {/* Messages */}
        <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-6 bg-[#E6EBE5]">
          {groups.map(([day, items]) => (
            <div key={day} className="space-y-2">
              <div className="flex items-center justify-center">
                <div className="text-xs text-white px-2 py-1 bg-[#54656F] rounded-full">
                  {new Date(items[0].created_at).toLocaleDateString([], {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
              </div>
              <div className="space-y-1">
                {items.map((m) => {
                  const mine = m.user_id === me
                  const userColor = getUserColor(m.user_id)
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'} px-1`}>
                      <div className={`flex ${mine ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 max-w-[85%]`}>
                        {/* Avatar initials */}
                        {!mine && (
                          <div className="w-7 h-7 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center text-xs font-semibold">
                            {initials(m.user?.full_name)}
                          </div>
                        )}
                        {/* Bubble */}
                        <div className="flex flex-col">
                          {!mine && (
                            <div className="text-[11px] text-gray-600 mb-0.5 ml-1">
                              {m.user?.full_name || 'Someone'}
                            </div>
                          )}
                          <div className="flex items-end gap-1">
                            <div
                              className={`rounded-2xl px-3 py-2 text-sm ${
                                mine 
                                  ? 'bg-[#D9FDD3] rounded-br-none' 
                                  : `${userColor} text-white rounded-bl-none`
                              }`}
                              style={{
                                maxWidth: '100%',
                                wordBreak: 'break-word',
                                whiteSpace: 'pre-line',
                              }}
                            >
                              {m.content}
                            </div>
                            <div className={`text-[10px] ${mine ? 'text-gray-500' : 'text-gray-300'} mb-1`}>
                              {timeStr(m.created_at)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <form onSubmit={send} className="p-3 border-t flex gap-2 bg-[#F0F2F5]">
          <textarea
            className="flex-1 border rounded-lg px-3 py-2 resize-none"
            rows={1}
            placeholder="Write a message…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send(e)
              }
            }}
          />
          <button
            disabled={sending || !text.trim()}
            className="px-4 py-2 rounded-lg bg-[#005C4B] disabled:opacity-50 text-white"
          >
            Send
          </button>
        </form>
      </div>

      {/* Members drawer */}
      {showMembers && (
        <div className="fixed inset-0 bg-black/40 flex justify-end z-50">
          <div className="w-80 bg-white h-full shadow-xl p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-lg">Chat Members</h2>
              <button onClick={() => setShowMembers(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <ul className="space-y-2">
              {members.map((m) => (
                <li key={m.id} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold">
                    {initials(m.full_name)}
                  </div>
                  <span className="text-sm">{m.full_name || 'Unknown'}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}