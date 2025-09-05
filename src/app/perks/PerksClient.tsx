'use client'

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { PerkRow } from "./page"

type StatusKey = "inactive" | "soldout" | "soon" | "live" | "ended"

function cn(...s: Array<string | false | null | undefined>) { return s.filter(Boolean).join(" ") }

function statusOf(p: PerkRow, nowMS: number) {
  const start = p.start_at ? new Date(p.start_at).getTime() : null
  const end = p.end_at ? new Date(p.end_at).getTime() : null
  const soldOut = (p.max_claims || 0) > 0 && (p.claimed_count ?? 0) >= (p.max_claims || 0)

  if (!p.active)   return { key: "inactive" as StatusKey, label: "Inactive",       badge: "bg-gray-200 text-gray-700" }
  if (soldOut)     return { key: "soldout"  as StatusKey, label: "Sold out",       badge: "bg-indigo-50 text-indigo-700" }
  if (start && nowMS < start)
                   return { key: "soon"     as StatusKey, label: "Starting soon",  badge: "bg-amber-100 text-amber-800" }
  if ((!start || nowMS >= start) && (!end || nowMS <= end))
                   return { key: "live"     as StatusKey, label: "Live",           badge: "bg-emerald-100 text-emerald-800" }
  return             { key: "ended"    as StatusKey, label: "Ended",         badge: "bg-gray-100 text-gray-600" }
}

function sortTupleTimeLeft(p: PerkRow, now: number): [number, number, number] {
  const st = statusOf(p, now).key
  const start = p.start_at ? new Date(p.start_at).getTime() : Number.POSITIVE_INFINITY
  const end = p.end_at ? new Date(p.end_at).getTime() : Number.POSITIVE_INFINITY
  // buckets: 0 live, 1 soon/soldout, 2 scheduled/other, 3 ended
  const bucket =
    st === "live" ? 0 :
    (st === "soon" || st === "soldout") ? 1 :
    st === "ended" ? 3 : 2

  const value =
    st === "live" ? Math.max(0, end - now) :
    (st === "soon" || st === "soldout") ? Math.max(0, start - now) :
    start

  return [bucket, value, p.id]
}

export default function PerksClient({
  initialPerks,
  initialQ,
  initialStatus,
  initialSort,
}: {
  initialPerks: PerkRow[]
  initialQ: string
  initialStatus: "all" | "live" | "soon" | "soldout" | "ended"
  initialSort: "timeleft" | "start" | "title"
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Live "now" for countdown/status; tick every 30s
  const [now, setNow] = useState<number>(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  // Filters (controlled)
  const [q, setQ] = useState(initialQ)
  const [status, setStatus] = useState<"all" | "live" | "soon" | "soldout" | "ended">(initialStatus)
  const [sort, setSort] = useState<"timeleft" | "start" | "title">(initialSort)

  // Keep URL in sync when filters change (no reload)
  useEffect(() => {
    const sp = new URLSearchParams(searchParams.toString())
    q ? sp.set("q", q) : sp.delete("q")
    status !== "all" ? sp.set("status", status) : sp.delete("status")
    sort !== "timeleft" ? sp.set("sort", sort) : sp.delete("sort")
    router.replace(`${pathname}${sp.toString() ? `?${sp.toString()}` : ""}`, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, sort])

  // Derive filtered + sorted rows on the client (instant)
  const rows = useMemo(() => {
    const normQ = q.trim().toLowerCase()
    const filtered = initialPerks.filter(p => {
      if (!p.active) return false // hide inactive for members
      if (normQ) {
        const blob = `${p.title} ${p.venue_name ?? ""} ${p.neighborhood ?? ""} ${p.sponsor_tag ?? ""}`.toLowerCase()
        if (!blob.includes(normQ)) return false
      }
      const st = statusOf(p, now).key
      if (status !== "all" && st !== status) return false
      return true
    })

    return filtered.sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title)
      if (sort === "start") {
        const sa = a.start_at ? new Date(a.start_at).getTime() : now + 9e12
        const sb = b.start_at ? new Date(b.start_at).getTime() : now + 9e12
        return sa - sb || a.id - b.id
      }
      const [ba, va, ia] = sortTupleTimeLeft(a, now)
      const [bb, vb, ib] = sortTupleTimeLeft(b, now)
      return ba - bb || va - vb || ia - ib
    })
  }, [initialPerks, q, status, sort, now])

  // Totals (based on current filter set except status)
  const totals = useMemo(() => {
    let live = 0, soon = 0, ended = 0, soldout = 0
    for (const p of initialPerks) {
      if (!p.active) continue
      if (q && !`${p.title} ${p.venue_name ?? ""} ${p.neighborhood ?? ""} ${p.sponsor_tag ?? ""}`.toLowerCase().includes(q.toLowerCase())) {
        continue
      }
      const st = statusOf(p, now).key
      if (st === "live") live++
      else if (st === "soon") soon++
      else if (st === "ended") ended++
      const sold = (p.max_claims || 0) > 0 && (p.claimed_count ?? 0) >= (p.max_claims || 0)
      if (sold) soldout++
    }
    return { total: rows.length, live, soon, ended, soldout }
  }, [initialPerks, rows.length, q, now])

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Perks</h1>
        <span className="text-sm text-slate-600">{totals.total} available</span>
        <div className="sm:ml-auto flex flex-wrap gap-2">
          <span className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-800">Live {totals.live}</span>
          <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-800">Soon {totals.soon}</span>
          <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">Ended {totals.ended}</span>
          <span className="text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-700">Sold out {totals.soldout}</span>
        </div>
      </div>

      {/* Controls (instant, syncs to URL) */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-2">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search perks, venues, sponsors…"
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
        <select value={status} onChange={e => setStatus(e.target.value as any)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="all">All statuses</option>
          <option value="live">Live</option>
          <option value="soon">Starting soon</option>
          <option value="soldout">Sold out</option>
          <option value="ended">Ended</option>
        </select>
        <select value={sort} onChange={e => setSort(e.target.value as any)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="timeleft">Sort by time left</option>
          <option value="start">Sort by start</option>
          <option value="title">Sort by title</option>
        </select>
        <button
          type="button"
          onClick={() => { setQ(""); setStatus("all"); setSort("timeleft") }}
          className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm border"
        >
          Clear
        </button>
      </div>

      {/* Card grid */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map(p => {
          const st = statusOf(p, now)
          const start = p.start_at ? new Date(p.start_at) : null
          const end = p.end_at ? new Date(p.end_at) : null
          const claimed = p.claimed_count ?? 0
          const redeemed = p.redeemed_count ?? 0
          const max = p.max_claims || 0
          const pct = max ? Math.min(100, Math.round((claimed / max) * 100)) : 0

          const timeLeftPill = (() => {
            if (st.key === "live" && end) {
              const min = Math.max(0, Math.round((end.getTime() - now)/60000))
              return `Ends in ${min >= 60 ? `${Math.floor(min/60)}h` : `${min}m`}`
            }
            if (st.key === "soon" && start) {
              const min = Math.max(0, Math.round((start.getTime() - now)/60000))
              return `Starts in ${min >= 60 ? `${Math.floor(min/60)}h` : `${min}m`}`
            }
            return null
          })()

          const color = {
            live:     { stripe: "bg-emerald-500", glow: "ring-emerald-100", badge: "bg-emerald-100 text-emerald-800" },
            soon:     { stripe: "bg-amber-500",   glow: "ring-amber-100",   badge: "bg-amber-100 text-amber-800" },
            soldout:  { stripe: "bg-indigo-500",  glow: "ring-indigo-100",  badge: "bg-indigo-50 text-indigo-700" },
            ended:    { stripe: "bg-gray-400",    glow: "ring-gray-100",    badge: "bg-gray-100 text-gray-600" },
            inactive: { stripe: "bg-gray-300",    glow: "ring-gray-100",    badge: "bg-gray-200 text-gray-700" },
          }[st.key] || { stripe: "bg-slate-300", glow: "ring-slate-100", badge: "bg-slate-100 text-slate-700" }

          return (
            <article
              key={p.id}
              className={cn(
                "relative group rounded-2xl border bg-gradient-to-br from-white to-slate-50 shadow-sm transition-all overflow-hidden",
                "hover:shadow-md hover:-translate-y-[2px] hover:ring-2",
                color.glow,
                "border-slate-200"
              )}
            >
              {/* Status stripe */}
              <div className={cn("absolute left-0 top-0 h-full w-1", color.stripe)} />

              {/* Decorative corner gradient */}
              <div className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.12),transparent_60%)]" />

              {/* Header */}
              <div className="p-4 pb-3 flex items-start gap-2">
                <span className={cn("text-xs px-2 py-0.5 rounded-full", color.badge)}>{st.label}</span>
                {p.sponsor_tag && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">{p.sponsor_tag}</span>
                )}
                {timeLeftPill && (
                  <span className="ml-auto text-[11px] px-2 py-0.5 rounded bg-slate-900 text-white">
                    {timeLeftPill}
                  </span>
                )}
              </div>

              {/* Body */}
              <div className="px-4 pb-4">
                <h3 className="text-base font-semibold text-slate-900">{p.title}</h3>
                <p className="mt-0.5 text-sm text-slate-600">
                  {(p.venue_name || "—")}{p.neighborhood ? ` • ${p.neighborhood}` : ""}
                </p>

                {/* Window on two lines */}
                <div className="mt-3 text-sm">
                  {start ? (
                    <>
                      <div className="text-slate-900">{start.toLocaleDateString()}</div>
                      <div className="text-slate-600 text-xs">
                        {start.toLocaleTimeString()}
                        {end ? ` – ${end.toLocaleTimeString()}` : ""}
                      </div>
                    </>
                  ) : <div className="text-slate-600">—</div>}
                </div>

                {/* Progress */}
                <div className="mt-3">
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    {claimed}/{max} claimed • {redeemed} redeemed
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-4 flex items-center">
                  <Link
                    href={`/perks/${p.id}`}
                    className="inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-medium text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                  >
                    View details →
                  </Link>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {rows.length === 0 && (
        <div className="mt-12 text-center text-slate-600">
          No perks match your filters.
        </div>
      )}
    </div>
  )
}
