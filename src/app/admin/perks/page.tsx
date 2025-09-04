// app/perks/page.tsx
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import Link from "next/link"

export const metadata = { title: "Perks • Nowio" }
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type PerkCard = {
  id: number
  venue_name: string | null
  neighborhood: string | null
  title: string
  sponsor_tag: string | null
  start_at: string | null
  end_at: string | null
  max_claims: number
  claimed_count: number | null
}

function computeState(p: PerkCard) {
  const now = Date.now()
  const start = p.start_at ? new Date(p.start_at).getTime() : null
  const end = p.end_at ? new Date(p.end_at).getTime() : null
  const claimed = p.claimed_count ?? 0
  const max = p.max_claims || 0
  const soldOut = max > 0 && claimed >= max

  if (soldOut) return { key: "soldout" as const, label: "Sold out", color: "bg-gray-200 text-gray-700" }
  if (start && now < start) {
    const mins = Math.max(1, Math.round((start - now) / 60000))
    return { key: "soon" as const, label: mins >= 60 ? `Starts in ${Math.round(mins/60)}h` : `Starts in ${mins}m`, color: "bg-amber-100 text-amber-800" }
  }
  if ((!start || now >= start) && (!end || now <= end)) {
    return { key: "live" as const, label: "Live now", color: "bg-emerald-100 text-emerald-800" }
  }
  return { key: "ended" as const, label: "Ended", color: "bg-gray-100 text-gray-600" }
}

export default async function PerksPage() {
  const cookieStore = await cookies()
  const supa = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (n) => cookieStore.get(n)?.value,
        set: (n, v, o: any) => cookieStore.set({ name: n, value: v, ...o }),
        remove: (n, o: any) => cookieStore.set({ name: n, value: "", ...o }),
      },
    }
  )

  const { data: perks, error } = await supa
    .from("perk_summaries")
    .select("*")
    .limit(100)

  if (error) throw new Error(error.message)

  const enriched = (perks || []).map((p: PerkCard) => ({ p, state: computeState(p) }))
  // Sort: live → soon → others
  const order = { live: 0, soon: 1, soldout: 2, ended: 3 } as Record<string, number>
  enriched.sort((a, b) => (order[a.state.key] ?? 99) - (order[b.state.key] ?? 99))

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-2xl font-semibold">Perks</h1>
        <span className="text-sm text-gray-500">{enriched.length} available</span>
      </div>

      {!enriched.length && (
        <p className="text-sm text-gray-600">
          No perks right now. Check back later or try different neighborhoods.
        </p>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {enriched.map(({ p, state }) => {
          const claimed = p.claimed_count ?? 0
          const max = p.max_claims || 0
          const pct = max ? Math.min(100, Math.round((claimed / max) * 100)) : 0

          return (
            <Link key={p.id} href={`/perks/${p.id}`} className="block rounded-2xl border p-4 hover:shadow-sm transition">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-medium truncate">{p.venue_name || "Venue"}</div>
                    {p.neighborhood && (
                      <span className="text-xs text-gray-500 shrink-0">• {p.neighborhood}</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-800 mt-0.5 line-clamp-2">{p.title}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${state.color}`}>{state.label}</span>
              </div>

              <div className="text-xs text-gray-500 mt-1">
                {p.start_at ? new Date(p.start_at).toLocaleString() : "Live"}
                {p.end_at ? ` – ${new Date(p.end_at).toLocaleTimeString()}` : ""}
              </div>

              <div className="mt-3">
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-1 text-xs text-gray-600">{claimed}/{max} claimed</div>
              </div>

              {p.sponsor_tag && (
                <div className="mt-2 text-[11px] text-indigo-700 bg-indigo-50 inline-block px-2 py-0.5 rounded">
                  {p.sponsor_tag}
                </div>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
