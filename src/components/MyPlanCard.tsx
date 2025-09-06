'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { ChevronDown } from 'lucide-react'

type Props = {
  mode: 'hosting' | 'joined'
  activity: any
  onChange?: () => void
  unreadCount?: number
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

/** Kept for backwards-compat (not used now) */
function VerifiedBadge({ small=false }:{ small?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full ${small?'px-1.5 py-0.5 text-[10px]':'px-2 py-0.5 text-xs'} bg-emerald-600/10 text-emerald-700`}
      title="ID-verified host"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" className="fill-current">
        <path d="M9 16.2 4.8 12l1.4-1.4L9 13.4l8.8-8.8L19.2 6z"/>
      </svg>
      <span>Verified</span>
    </span>
  )
}

/** Bold, visible tick: blue circle + white check (Twitter/Facebook style) */
function VerifiedTick() {
  return (
    <span className="ml-1 inline-flex items-center align-middle" title="Verified" aria-label="Verified">
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-sky-500 text-white shadow-sm ring-1 ring-white/70">
        <svg viewBox="0 0 24 24" className="w-[10px] h-[10px]" aria-hidden="true">
          <path d="M9 16.2 4.8 12l1.4-1.4L9 13.4l8.8-8.8L19.2 6z" fill="currentColor" />
        </svg>
      </span>
    </span>
  )
}

/** One-line collapsed, full wrap when expanded */
function RichText({ text, expanded }: { text: string; expanded: boolean }) {
  const parts = React.useMemo(() => text.split(/(https?:\/\/[^\s]+)/g), [text])
  return (
    <span
      className={`${expanded ? 'whitespace-pre-wrap break-words' : 'block truncate'}`}
      style={expanded ? ({ overflowWrap: 'anywhere' } as React.CSSProperties) : undefined}
    >
      {parts.map((p, i) =>
        /^https?:\/\//i.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noopener noreferrer" className={expanded ? 'underline break-all' : 'underline'}>
            {p}
          </a>
        ) : (
          <React.Fragment key={i}>{p}</React.Fragment>
        )
      )}
    </span>
  )
}

export default function MyPlanCard({ mode, activity: a, onChange, unreadCount = 0 }: Props) {
  const [busy, setBusy] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const hostName   = a?.host?.full_name ?? 'Host'
  const hostAvatar = a?.host?.avatar_url ?? null
  const hostVerified = !!a?.host?.is_verified

  async function tryEndpoint(path: string) {
    try {
      const r = await fetch(path, { method: 'POST' })
      if (r.ok) return true
    } catch {}
    return false
  }

  async function cancelPlan() {
    if (!confirm('Cancel this plan for everyone?')) return
    setBusy(true)
    const ok = await tryEndpoint(`/api/plans/${a.id}/cancel`)
    if (!ok) {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('activities')
        .update({ status: 'canceled', canceled_at: new Date().toISOString() })
        .eq('id', a.id)
        .eq('creator_id', user?.id ?? '')
      if (error) { alert(error.message); setBusy(false); return }
    }
    setBusy(false)
    onChange?.()
  }

  async function leavePlan() {
    if (!confirm('Leave this plan?')) return
    setBusy(true)
    const ok = await tryEndpoint(`/api/plans/${a.id}/leave`)
    if (!ok) {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('activity_participants')
        .delete()
        .eq('activity_id', a.id)
        .eq('user_id', user?.id ?? '')
      if (error) { alert(error.message); setBusy(false); return }
    }
    setBusy(false)
    onChange?.()
  }

  const isCanceled = a?.status === 'canceled'
  const actionLabel   = mode === 'hosting' ? 'Cancel' : 'Leave'
  const actionHandler = mode === 'hosting' ? cancelPlan : leavePlan

  // Never show unread numbers for canceled activities
  const unread = isCanceled ? 0 : Number(unreadCount ?? a?.unread_count ?? 0)

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className={`h-1 rounded-t-2xl ${mode==='hosting' ? 'bg-gradient-to-r from-amber-500 to-rose-500' : 'bg-gradient-to-r from-sky-500 to-indigo-500'}`} />

      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Avatar url={hostAvatar} name={hostName} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <span className="flex items-center">
                {mode === 'hosting' ? (
                  'You are hosting'
                ) : (
                  <>
                    Hosted by <span className="ml-1 font-medium text-zinc-700">{hostName}</span>
                  </>
                )}
                {hostVerified && <VerifiedTick />}
              </span>
            </div>
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
          <>
            <div className="text-sm text-zinc-600">
              <RichText text={a.description} expanded={expanded} />
            </div>
            <button
              type="button"
              onClick={() => setExpanded(v => !v)}
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
            >
              {expanded ? 'Hide details' : 'Show details'}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          </>
        )}

        <div className="flex items-center justify-between pt-1">
          <Link href={`/activities/${a.id}`} className="text-sm text-indigo-600 hover:underline">View page</Link>

          <div className="flex items-center gap-2">
            <Link
              href={`/activity/${a.id}/chat`}
              className={`relative px-3 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 ${isCanceled ? 'pointer-events-none opacity-50' : ''}`}
              title="Open chat"
            >
              Chat
              {unread > 0 && (
                <span
                  className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] grid place-items-center"
                  title={`${unread} unread`}
                >
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </Link>

            <button
              disabled={busy || isCanceled}
              onClick={actionHandler}
              className="px-3 py-2 rounded-lg text-sm font-medium transition border border-zinc-300 text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
              title={mode==='hosting' ? 'Cancel this plan' : 'Leave this plan'}
            >
              {busy ? 'Working…' : actionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
