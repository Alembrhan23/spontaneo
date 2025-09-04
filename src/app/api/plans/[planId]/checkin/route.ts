// app/api/plans/[planId]/checkin/route.ts
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

function isUUID(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000
  const toRad = (x: number) => (x * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export async function POST(
  req: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const cookieStore = await cookies()

    const supa = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
      cookies: {
        get: (n) => cookieStore.get(n)?.value,
        set: (n, v, o: any) => cookieStore.set({ name: n, value: v, ...o }),
        remove: (n, o: any) => cookieStore.set({ name: n, value: "", ...o }),
      },
    })

    // ---- Parse & validate input
    const body = await req.json().catch(() => ({} as any))
    const perkIdRaw = body?.perkId
    const perkId = typeof perkIdRaw === "number" ? perkIdRaw : Number(perkIdRaw)
    const coords = body?.coords as { lat?: number; lng?: number } | undefined
    const planId = params.planId

    if (!planId || !isUUID(planId)) {
      return json({ error: "Invalid planId" }, { status: 400 })
    }

    const {
      data: { user },
      error: userErr,
    } = await supa.auth.getUser()
    if (userErr || !user) return json({ error: "Not authenticated" }, { status: 401 })

    // ---- Record check-in (ignore duplicates)
    // RLS policy required: insert where auth.uid() = user_id
    await supa
      .from("plan_checkins")
      .upsert(
        { plan_id: planId, user_id: user.id },
        { onConflict: "plan_id,user_id", ignoreDuplicates: true }
      )

    // If no perk involved, we're done
    if (!perkId || Number.isNaN(perkId)) {
      return json({ checkedIn: true, perk: null })
    }

    // ---- Load perk basics to optionally enforce geofence/time window on the edge
    // NOTE: Your claim_perk() also enforces start/end/active atomically in SQL.
    // This pre-check is only for nicer UX messages before RPC.
    const { data: perk, error: perkErr } = await supa
      .from("plan_perks")
      .select("id, title, max_claims, start_at, end_at, geofence_lat, geofence_lng, geofence_radius_m, active")
      .eq("id", perkId)
      .maybeSingle()

    if (perkErr) return json({ error: perkErr.message }, { status: 500 })
    if (!perk || !perk.active) {
      return json({ checkedIn: true, perk: { title: perk?.title, inactive: true } })
    }

    // Optional geofence gate (if perk has a fence and client provided coords)
    if (
      perk.geofence_lat != null &&
      perk.geofence_lng != null &&
      perk.geofence_radius_m != null &&
      coords?.lat != null &&
      coords?.lng != null
    ) {
      const d = haversineMeters(coords.lat, coords.lng, perk.geofence_lat, perk.geofence_lng)
      if (d > perk.geofence_radius_m) {
        return json({
          checkedIn: true,
          perk: { title: perk.title, tooFar: true, distance_m: Math.round(d), radius_m: perk.geofence_radius_m },
        })
      }
    }

    // ---- Try to claim (atomic in SQL via claim_perk)
    const { data: claimed, error: rpcErr } = await supa.rpc("claim_perk", {
      p_perk_id: perkId,
      p_plan_id: planId,
      p_user_id: user.id,
    })

    if (rpcErr) {
      // Common cause: function not granted or missing -> show helpful message
      return json({ error: "Unable to claim. Ask host or try again." }, { status: 500 })
    }

    // No row returned means SOLD OUT or already had one.
    if (!claimed || claimed.length === 0) {
      // Progress count (may require RLS allowances; see note below)
      let count: number | null = null
      try {
        const res = await supa
          .from("perk_claims")
          .select("id", { head: true, count: "exact" })
          .eq("perk_id", perkId)
        count = res.count ?? null
      } catch {
        // ignore if RLS blocks aggregate
      }

      const soldOut = count != null && perk?.max_claims != null ? count >= perk.max_claims : undefined
      return json({
        checkedIn: true,
        perk: {
          title: perk?.title,
          soldOut: soldOut === true ? true : undefined,
          alreadyClaimed: soldOut === false ? true : undefined,
          total: perk?.max_claims ?? null,
        },
      })
    }

    const row = claimed[0]
    // Current count for position (may be blocked by RLS; handled gracefully)
    let order: number | null = null
    try {
      const { count } = await supa
        .from("perk_claims")
        .select("id", { head: true, count: "exact" })
        .eq("perk_id", perkId)
      order = count ?? 1
    } catch {
      order = null
    }

    return json({
      checkedIn: true,
      perk: {
        title: perk?.title,
        token: row.redeem_token, // show as QR
        order,
        total: perk?.max_claims ?? null,
        status: row.status, // 'reserved'
      },
    })
  } catch (e: any) {
    return json({ error: e?.message || "Unexpected error" }, { status: 500 })
  }
}
