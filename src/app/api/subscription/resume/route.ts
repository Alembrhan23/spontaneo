// app/api/subscription/resume/route.ts
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js"
import Stripe from "stripe"

export const runtime = "nodejs"
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" })

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supa = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: n => cookieStore.get(n)?.value,
          set: (n, v, o: any) => cookieStore.set({ name: n, value: v, ...o }),
          remove: (n, o: any) => cookieStore.set({ name: n, value: "", ...o }),
        },
      }
    )
    const {
      data: { user },
      error,
    } = await supa.auth.getUser()
    if (error || !user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    const admin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data: row } = await admin
      .from("user_subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", user.id)
      .maybeSingle()

    if (!row?.stripe_subscription_id)
      return NextResponse.json({ error: "No subscription" }, { status: 400 })

    const updated = await stripe.subscriptions.update(row.stripe_subscription_id, {
      cancel_at_period_end: false,
    })

    await admin.from("user_subscriptions").upsert(
      {
        user_id: user.id,
        stripe_subscription_id: updated.id,
        status: updated.status,
        current_period_end: updated.current_period_end
          ? new Date(updated.current_period_end * 1000).toISOString()
          : null,
      },
      { onConflict: "user_id" }
    )

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      cancel_at_period_end: updated.cancel_at_period_end,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Resume failed" }, { status: 500 })
  }
}
