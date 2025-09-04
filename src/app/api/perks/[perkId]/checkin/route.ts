import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, init?: number | ResponseInit) {
  const res = NextResponse.json(data, init as any)
  res.headers.set("Cache-Control", "no-store")
  return res
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000, toRad = (x: number) => (x * Math.PI) / 180
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export async function POST(req: NextRequest, { params }: { params: { perkId: string } }) {
  try {
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

    const body = await req.json().catch(() => ({} as any))
    const coords = body?.coords as { lat?: number; lng?: number } | undefined
    const perkId = Number(params.perkId)

    const { data: { user } } = await supa.auth.getUser()
    if (!user) return json({ error: "Not authenticated" }, { status: 401 })

    // Load perk for UX/geofence checks (window/active also enforced in RPC)
    const { data: perk, error: perkErr } = await supa
      .from("plan_perks")
      .select("id, title, max_claims, start_at, end_at, active, geofence_lat, geofence_lng, geofence_radius_m")
      .eq("id", perkId)
      .maybeSingle()
    if (perkErr) return json({ error: perkErr.message }, { status: 500 })
    if (!perk) return json({ error: "Perk not found" }, { status: 404 })
    if (!perk.active) return json({ error: "Perk is inactive" }, { status: 400 })

    // Optional geofence (nice UX error before RPC)
    if (
      perk.geofence_lat != null && perk.geofence_lng != null && perk.geofence_radius_m != null &&
      coords?.lat != null && coords?.lng != null
    ) {
      const d = haversineMeters(coords.lat, coords.lng, perk.geofence_lat, perk.geofence_lng)
      if (d > perk.geofence_radius_m) {
        return json({ checkedIn: true, perk: { title: perk.title, tooFar: true, distance_m: Math.round(d), radius_m: perk.geofence_radius_m } })
      }
    }

    // Try atomic claim (no plan involved)
    const { data: claimed, error: rpcErr } = await supa.rpc("claim_perk_simple", {
      p_perk_id: perkId,
      p_user_id: user.id,
    })
    if (rpcErr) return json({ error: "Unable to claim. Try again." }, { status: 500 })

    // If nothing returned: sold out or already claimed
    if (!claimed || claimed.length === 0) {
      const { data: prog } = await supa.rpc("perk_progress", { p_perk_id: perkId }).single()
      const soldOut = prog ? (prog.claimed_count ?? 0) >= (perk.max_claims ?? 0) : undefined
      return json({
        checkedIn: true,
        perk: { title: perk.title, soldOut: soldOut === true ? true : undefined, alreadyClaimed: soldOut === false ? true : undefined, total: perk.max_claims }
      })
    }

    const row = claimed[0]
    const { data: prog } = await supa.rpc("perk_progress", { p_perk_id: perkId }).single()
    return json({
      checkedIn: true,
      perk: {
        title: perk.title,
        token: row.redeem_token,
        status: row.status,
        order: prog?.claimed_count ?? null,
        total: perk.max_claims ?? null,
      }
    })
  } catch (e: any) {
    return json({ error: e?.message || "Unexpected error" }, { status: 500 })
  }
}
