'use client'
import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'

type Props = {
  mode: 'hosting' | 'joined'
  activity: any
  onChange?: () => void
}

function formatRange(startISO?: string, endISO?: string) {
  if (!startISO) return ''
  const s = new Date(startISO)
  const e = endISO ? new Date(endISO) : null
  const fmt = (d: Date) =>
    d.toLocaleString(undefined, { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' })
  return e ? `${fmt(s)} → ${e.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : fmt(s)
}

function Avatar({ url, name }: { url?: string|null, name?: string|null }) {
  if (url) return <img src={url} alt={name ?? 'avatar'} className="h-9 w-9 rounded-full object-cover" />
  const initials = (name||'?').split(' ').slice(0,2).map(w=>w[0]?.toUpperCase()).join('')
  return (
    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-sm font-bold">
      {initials || '?'}
    </div>
  )
}

export default function MyPlanCard({ mode, activity: a, onChange }: Props) {
  const [busy, setBusy] = useState(false)
  const hostName = a?.host?.full_name ?? 'Host'
  const hostAvatar = a?.host?.avatar_url ?? null

  async function cancelPlan() {
    if (!confirm('Cancel this plan for everyone?')) return
    setBusy(true)
    // use whatever your schema has — here we soft-cancel via status + canceled_at
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('activities')
      .update({ status: 'canceled', canceled_at: new Date().toISOString() })
      .eq('id', a.id)
      .eq('creator_id', user?.id ?? '')
    setBusy(false)
    if (error) return alert(error.message)
    onChange?.()
  }

  async function leavePlan() {
    if (!confirm('Leave this plan?')) return
    setBusy(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('activity_participants')
      .delete()
      .eq('activity_id', a.id)
      .eq('user_id', user?.id ?? '')
    setBusy(false)
    if (error) return alert(error.message)
    onChange?.()
  }

  const isCanceled = a?.status === 'canceled'
  const actionLabel = mode === 'hosting' ? 'Cancel' : 'Leave'
  const actionHandler = mode === 'hosting' ? cancelPlan : leavePlan

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-shadow">
      {/* header stripe to look different from Discover */}
      <div className={`h-1 rounded-t-2xl ${mode==='hosting' ? 'bg-gradient-to-r from-amber-500 to-rose-500' : 'bg-gradient-to-r from-sky-500 to-indigo-500'}`} />

      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Avatar url={hostAvatar} name={hostName} />
          <div className="min-w-0">
            <div className="text-sm text-zinc-500">{mode === 'hosting' ? 'You are hosting' : `Hosted by ${hostName}`}</div>
            <h3 className="font-semibold text-zinc-900 truncate">{a.title || 'Untitled plan'}</h3>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="px-2 py-1 rounded-full bg-zinc-100 text-zinc-700">{formatRange(a.start_at, a.end_at)}</span>
          {a.neighborhood && <span className="px-2 py-1 rounded-full bg-zinc-100 text-zinc-700">{a.neighborhood}</span>}
          {a.capacity && a.participants_count != null && (
            <span className="px-2 py-1 rounded-full bg-zinc-100 text-zinc-700">
              {a.participants_count}/{a.capacity} going
            </span>
          )}
          {isCanceled && <span className="px-2 py-1 rounded-full bg-rose-100 text-rose-700">Canceled</span>}
        </div>

        {a.description && (
          <p className="text-sm text-zinc-600 line-clamp-2">{a.description}</p>
        )}

        <div className="flex items-center justify-between pt-1">
          <Link href={`/activities/${a.id}`} className="text-sm text-indigo-600 hover:underline">
            View details
          </Link>

          <button
            disabled={busy || isCanceled}
            onClick={actionHandler}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition
              ${mode==='hosting'
                ? 'bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50'
                : 'border border-zinc-300 text-zinc-800 hover:bg-zinc-50 disabled:opacity-50'
              }`}
            title={mode==='hosting' ? 'Cancel this plan' : 'Leave this plan'}
          >
            {busy ? 'Working…' : actionLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
