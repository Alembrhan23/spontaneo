import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createServerClient } from "@supabase/ssr"
import ClientPerksPage from "./PerksClient"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export type PerkRow = {
  id: number
  title: string
  venue_name: string | null
  neighborhood: string | null
  sponsor_tag: string | null
  start_at: string | null
  end_at: string | null
  max_claims: number
  active: boolean
  claimed_count: number | null
  redeemed_count: number | null
  business_id?: string
  business_name?: string
  business_description?: string
  business_category?: string
  business_vibe_tags?: string[]
  business_amenities?: string[]
  image_url?: string
  perk_type?: string
  is_active_now?: boolean
}

export default async function PerksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  // Auth gate (members only) - SERVER SIDE
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

  const { data: userRes } = await supa.auth.getUser()
  if (!userRes?.user) redirect(`/login?next=/perks`)

  // Fetch once server-side
  const { data, error } = await supa.from("business_perks_view").select("*").limit(300)
  if (error) throw new Error(error.message)

  // De-dupe by id in case the view returns multiples
  const perks = Array.from(new Map((data || []).map((p: PerkRow) => [p.id, p])).values())

  // ✅ Await searchParams before use
  const sp = await searchParams
  const q = typeof sp.q === "string" ? sp.q : ""
  const status = (typeof sp.status === "string" ? sp.status : "all") as "all" | "live" | "soon" | "soldout" | "ended"
  const sort = (typeof sp.sort === "string" ? sp.sort : "timeleft") as "timeleft" | "start" | "title"

  return (
    <ClientPerksPage
      initialPerks={perks}
      initialQ={q}
      initialStatus={status}
      initialSort={sort}
    />
  )
}