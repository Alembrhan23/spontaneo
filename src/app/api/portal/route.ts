// app/api/portal/route.ts
import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js"

export const runtime = "nodejs"
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" })

function getOrigin(req: NextRequest) {
  const env = process.env.SITE_URL
  if (env) {
    try {
      return new URL(env).origin
    } catch {
      /* ignore */
    }
  }
  return req.nextUrl.origin
}

export async function POST(req: NextRequest) {
  try {
    // Next 15: await cookies()
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => cookieStore.get(name)?.value,
          set: (name: string, value: string, options: any) =>
            cookieStore.set({ name, value, ...options }),
          remove: (name: string, options: any) =>
            cookieStore.set({ name, value: "", ...options }),
        },
      }
    )

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    const admin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // Try DB first
    let customerId: string | null = null
    const { data: sub } = await admin
      .from("user_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle()
    customerId = sub?.stripe_customer_id || null

    // Fallback by email (backfill DB), useful if the first mapping happened only on Stripe
    if (!customerId && user.email) {
      const list = await stripe.customers.list({ email: user.email, limit: 1 })
      if (list.data[0]?.id) {
        customerId = list.data[0].id
        await admin
          .from("user_subscriptions")
          .upsert({ user_id: user.id, stripe_customer_id: customerId }, { onConflict: "user_id" })
      }
    }

    if (!customerId) {
      return NextResponse.json({ error: "No customer" }, { status: 400 })
    }

    const origin = getOrigin(req)
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/profile`,
    })

    // Return JSON so both client and server handlers can use it
    return NextResponse.json({ url: portal.url })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 })
  }
}
