// app/api/checkout/route.ts
import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js"

export const runtime = "nodejs"
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" })

type Plan = "plus" | "business_pro"
type Interval = "monthly" | "annual"

const ACTIVE_STATUSES = ["trialing", "active", "past_due", "unpaid"] as const

// Prefer ENV price IDs; fall back to lookup_key search
const PRICE_MAP: Partial<Record<Plan, Partial<Record<Interval, string>>>> = {
  plus: { monthly: process.env.PRICE_PLUS_MONTHLY, annual: process.env.PRICE_PLUS_ANNUAL },
  business_pro: { monthly: process.env.PRICE_BPRO_MONTHLY, annual: process.env.PRICE_BPRO_ANNUAL },
}

const LOOKUP_KEYS: Record<Plan, Record<Interval, string[]>> = {
  plus: {
    monthly: ["plus_monthly", "nowio_plus_monthly"],
    annual: ["plus_annual", "nowio_plus_annual"],
  },
  business_pro: {
    monthly: ["bpro_monthly", "nowio_bpro_monthly", "business_pro_monthly"],
    annual: ["bpro_annual", "nowio_bpro_annual", "business_pro_annual"],
  },
}

function getOrigin(req: NextRequest) {
  const env = process.env.SITE_URL
  if (env) {
    try {
      return new URL(env).origin
    } catch {}
  }
  return req.nextUrl.origin
}

async function validatePriceId(id: string) {
  try {
    const p = await stripe.prices.retrieve(id)
    return !!p?.id
  } catch {
    return false
  }
}

async function resolvePriceId(plan: Plan, interval: Interval): Promise<{ id: string | null; via: "env" | "lookup" | null }> {
  const envId = PRICE_MAP[plan]?.[interval]
  if (envId && envId.trim()) {
    if (await validatePriceId(envId)) return { id: envId, via: "env" }
  }
  for (const key of LOOKUP_KEYS[plan][interval]) {
    const list = await stripe.prices.list({ lookup_keys: [key], active: true, limit: 1 })
    if (list.data[0]?.id) return { id: list.data[0].id, via: "lookup" }
  }
  return { id: null, via: null }
}

export async function POST(req: NextRequest) {
  try {
    const { plan, interval } = (await req.json()) as { plan?: Plan; interval?: Interval }
    if (!plan || !interval) {
      return NextResponse.json({ error: "Invalid plan or interval (missing payload)" }, { status: 400 })
    }

    // Next 15: await cookies()
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => cookieStore.get(name)?.value,
          set: (name: string, value: string, options: any) => cookieStore.set({ name, value, ...options }),
          remove: (name: string, options: any) => cookieStore.set({ name, value: "", ...options }),
        },
      }
    )

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser()
    if (userErr || !user) return NextResponse.json({ error: userErr?.message || "Not authenticated" }, { status: 401 })

    const admin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // Check if user already has an active sub → send to portal
    const { data: existing } = await admin
      .from("user_subscriptions")
      .select("stripe_customer_id, status")
      .eq("user_id", user.id)
      .in("status", ACTIVE_STATUSES as unknown as string[])
      .maybeSingle()

    if (existing?.stripe_customer_id) {
      const portal = await stripe.billingPortal.sessions.create({
        customer: existing.stripe_customer_id,
        return_url: `${getOrigin(req)}/profile`,
      })
      return NextResponse.json({ portal: portal.url })
    }

    // Reuse or create a Stripe customer and persist it
    let customerId: string | null = null
    const { data: row } = await admin
      .from("user_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle()

    customerId = row?.stripe_customer_id || null

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
      await admin
        .from("user_subscriptions")
        .upsert({ user_id: user.id, stripe_customer_id: customerId }, { onConflict: "user_id" })
    }

    // Price
    const { id: priceId, via } = await resolvePriceId(plan, interval)
    if (!priceId) {
      const mode = (process.env.STRIPE_SECRET_KEY || "").startsWith("sk_live_") ? "live" : "test"
      return NextResponse.json(
        {
          error:
            `Price not found for ${plan}/${interval} in ${mode} mode. ` +
            `Either set PRICE_* envs to a valid price_${mode} ID or add lookup keys on your Prices.`,
        },
        { status: 400 }
      )
    }

    const origin = getOrigin(req)

    // Create Checkout Session (explicitly set customer to keep mapping stable)
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId!,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
      allow_promotion_codes: true,
      client_reference_id: user.id,
      metadata: { userId: user.id, plan, interval, resolved_via: via || "unknown" },
      subscription_data: { metadata: { userId: user.id, plan, interval } },
    })

    return NextResponse.json({ url: session.url })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 })
  }
}
