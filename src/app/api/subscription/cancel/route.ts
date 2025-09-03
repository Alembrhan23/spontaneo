// app/api/subscription/cancel/route.ts
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js"
import Stripe from "stripe"

export const runtime = "nodejs"
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" })
const ACTIVE = ["trialing", "active", "past_due", "unpaid"] as const

async function findActiveSubForCustomer(customerId: string) {
  const list = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 3,
    expand: ["data.items.data.price"],
  })
  return list.data.find(s => ACTIVE.includes(s.status as any)) || null
}

export async function POST(req: NextRequest) {
  try {
    const { immediate = false } = (await req.json().catch(() => ({}))) as { immediate?: boolean }

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
      .select("stripe_customer_id, stripe_subscription_id")
      .eq("user_id", user.id)
      .maybeSingle()

    if (!row?.stripe_customer_id)
      return NextResponse.json({ error: "No Stripe customer" }, { status: 400 })

    // Find subscription id
    let subId = row.stripe_subscription_id || null
    if (!subId) {
      const found = await findActiveSubForCustomer(row.stripe_customer_id)
      subId = found?.id || null
      if (subId) {
        await admin
          .from("user_subscriptions")
          .upsert({ user_id: user.id, stripe_subscription_id: subId }, { onConflict: "user_id" })
      }
    }
    if (!subId) return NextResponse.json({ error: "No active subscription" }, { status: 400 })

    // Cancel
    const updated = immediate
      ? await stripe.subscriptions.cancel(subId)
      : await stripe.subscriptions.update(subId, { cancel_at_period_end: true })

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
      current_period_end: updated.current_period_end
        ? new Date(updated.current_period_end * 1000).toISOString()
        : null,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Cancel failed" }, { status: 500 })
  }
}
