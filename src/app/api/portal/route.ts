// app/api/portal/route.ts
import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

export const runtime = "nodejs"

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY")
  return new Stripe(key, { apiVersion: "2024-06-20" })
}

function getOrigin(req: NextRequest) {
  const env = process.env.SITE_URL
  if (env) try { return new URL(env).origin } catch { /* noop */ }
  return req.nextUrl.origin
}

export async function POST(req: NextRequest) {
  try {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
    const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!SUPABASE_URL || !SUPABASE_ANON) {
      return NextResponse.json(
        { error: "Server misconfig: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY" },
        { status: 500 }
      )
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
      cookies: {
        get: (n: string) => cookieStore.get(n)?.value,
        set: (n: string, v: string, o: any) => cookieStore.set({ name: n, value: v, ...o }),
        remove: (n: string, o: any) => cookieStore.set({ name: n, value: "", ...o }),
      },
    })

    const { data: { user }, error: uErr } = await supabase.auth.getUser()
    if (uErr || !user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    // Read with RLS (make sure you have a policy: USING (auth.uid() = user_id))
    const { data: sub, error } = await supabase
      .from("user_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle()

    let customerId = sub?.stripe_customer_id || null

    // Fallback: find by email on Stripe (no DB write here)
    if (!customerId && user.email) {
      const stripe = getStripe()
      const list = await stripe.customers.list({ email: user.email, limit: 1 })
      customerId = list.data[0]?.id || null
    }

    if (!customerId) {
      return NextResponse.json({ error: "No customer on file. Complete checkout first." }, { status: 400 })
    }

    const stripe = getStripe()
    const origin = getOrigin(req)
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/profile`,
    })

    return NextResponse.json({ url: portal.url })
  } catch (e: any) {
    const msg = String(e?.message || "Portal error")
    // Helpful message if portal isn’t configured for this mode
    if (msg.includes("No configuration provided") || msg.includes("default configuration")) {
      return NextResponse.json(
        { error: "Stripe Billing Portal isn’t configured for this mode. In Stripe Dashboard → Settings → Billing → Customer portal, save a configuration in the same mode as your API key." },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
