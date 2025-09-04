import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { notFound } from "next/navigation"
import ClaimClientStandalone from "@/components/ClaimClientStandalone"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type PerkSummary = {
  id: number
  venue_name: string | null
  neighborhood: string | null
  title: string
  fine_print: string | null
  sponsor_tag: string | null
  start_at: string | null
  end_at: string | null
  max_claims: number
  claimed_count: number | null
  redeemed_count: number | null
}

export default async function PerkDetail({ params }: { params: { id: string } }) {
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

  const { data: perk, error } = await supa
    .from("perk_summaries")
    .select("*")
    .eq("id", params.id)
    .maybeSingle<PerkSummary>()

  if (error) throw new Error(error.message)
  if (!perk) notFound()

  return (
    <div className="max-w-xl mx-auto p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{perk.title}</h1>
          <p className="text-sm text-gray-600">
            {perk.venue_name || "Venue"} {perk.neighborhood ? " • " + perk.neighborhood : ""}
          </p>
          <div className="text-xs text-gray-500 mt-1">
            {perk.start_at ? new Date(perk.start_at).toLocaleString() : "Live"}
            {perk.end_at ? ` – ${new Date(perk.end_at).toLocaleTimeString()}` : ""}
          </div>
        </div>
        {perk.sponsor_tag && (
          <span className="text-xs rounded bg-indigo-50 text-indigo-700 px-2 py-0.5 whitespace-nowrap">
            {perk.sponsor_tag}
          </span>
        )}
      </div>

      {perk.fine_print && <p className="text-xs text-gray-500 mt-3">{perk.fine_print}</p>}

      <div className="mt-4 text-xs text-gray-600">
        {perk.claimed_count ?? 0}/{perk.max_claims} claimed
        {typeof perk.redeemed_count === "number" ? ` • ${perk.redeemed_count} redeemed` : null}
      </div>

      {/* Standalone claim flow (no plan) */}
      <div className="mt-4">
        <ClaimClientStandalone perkId={Number(perk.id)} title={perk.title} total={perk.max_claims} />
      </div>
    </div>
  )
}
