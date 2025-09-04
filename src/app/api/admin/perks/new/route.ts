// app/api/admin/perks/new/route.ts
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { createClient as createAdmin } from "@supabase/supabase-js"
import crypto from "crypto"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Body = {
  // Perks are independent: plan_id is optional (can be null)
  plan_id?: string | null
  venue_name?: string | null
  neighborhood?: string | null
  title?: string
  kind?: "checkin" | "code"
  max_claims?: number
  start_at?: string | null
  end_at?: string | null
  sponsor_tag?: string | null
  fine_print?: string | null
  geofence_lat?: number | null
  geofence_lng?: number | null
  geofence_radius_m?: number | null
  active?: boolean
}

function noStoreJson(data: any, init?: number | ResponseInit) {
  const res = NextResponse.json(data, init as any)
  res.headers.set("Cache-Control", "no-store")
  return res
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body

    // --- Basic validation (minimal but safe)
    const title = (body.title || "").trim()
    if (!title) return noStoreJson({ error: "title is required" }, { status: 400 })

    const kind = body.kind === "code" ? "code" : "checkin"
    const max_claims = Number.isFinite(body.max_claims!) && (body.max_claims as number) > 0
      ? Math.floor(body.max_claims as number)
      : 25

    const payload = {
      plan_id: body.plan_id ?? null, // stays optional/nullable
      venue_name: body.venue_name ?? null,
      neighborhood: body.neighborhood ?? null,
      title,
      kind,
      max_claims,
      start_at: body.start_at || null,
      end_at: body.end_at || null,
      sponsor_tag: body.sponsor_tag ?? null,
      fine_print: body.fine_print ?? null,
      geofence_lat: body.geofence_lat ?? null,
      geofence_lng: body.geofence_lng ?? null,
      geofence_radius_m: body.geofence_radius_m ?? null,
      active: typeof body.active === "boolean" ? body.active : true,
    }

    // --- 1) Verify admin using SSR client bound to request cookies
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

    const { data: userRes, error: userErr } = await supa.auth.getUser()
    if (userErr || !userRes?.user) return noStoreJson({ error: "Not authenticated" }, { status: 401 })

    const { data: profile, error: profErr } = await supa
      .from("profiles")
      .select("is_admin")
      .eq("id", userRes.user.id)
      .maybeSingle()

    if (profErr) return noStoreJson({ error: profErr.message }, { status: 500 })
    if (!profile?.is_admin) return noStoreJson({ error: "Forbidden" }, { status: 403 })

    // --- 2) Insert using Service Role (bypass RLS safely after admin check)
    const SR_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
    const SR_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!SR_URL || !SR_KEY) {
      return noStoreJson({ error: "Server is missing SUPABASE env vars" }, { status: 500 })
    }

    const admin = createAdmin(SR_URL, SR_KEY, { auth: { persistSession: false } })

    const staff_unlock_token = crypto.randomBytes(18).toString("base64url")

    const { data, error } = await admin
      .from("plan_perks")
      .insert({
        ...payload,
        staff_unlock_token,
      })
      .select("id, staff_unlock_token")
      .single()

    if (error) return noStoreJson({ error: error.message }, { status: 500 })

    return noStoreJson({ ok: true, id: data.id, staff_unlock_token: data.staff_unlock_token })
  } catch (e: any) {
    return noStoreJson({ error: e?.message || "Unexpected error" }, { status: 500 })
  }
}
