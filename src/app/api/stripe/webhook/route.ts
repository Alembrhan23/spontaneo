// src/app/api/stripe/webhook/route.ts
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })
const supabase = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,   // server-only key
  { auth: { persistSession: false } }
)

// Small helper
async function upsertSub(
  user_id: string,
  data: {
    stripe_customer_id?: string | null
    stripe_subscription_id?: string | null
    price_id?: string | null
    plan?: string | null
    interval?: string | null
    status?: string | null
    current_period_end?: string | null
  }
) {
  await supabase
    .from('user_subscriptions')
    .upsert({ user_id, ...data }, { onConflict: 'user_id' })
}

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature') || ''
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'Missing STRIPE_WEBHOOK_SECRET' }, { status: 500 })

  const body = await req.text()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch (err: any) {
    return NextResponse.json({ error: `Bad signature: ${err.message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      // ✅ When checkout finishes, capture the mapping (user ↔ customer/subscription)
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session
        if (s.mode !== 'subscription') break
        const userId = (s.metadata?.userId || s.client_reference_id) as string | undefined
        const customerId = (typeof s.customer === 'string' ? s.customer : s.customer?.id) || null
        const subId = (typeof s.subscription === 'string' ? s.subscription : s.subscription?.id) || null

        // Fetch subscription for details
        let priceId: string | null = null
        let interval: string | null = null
        let status: string | null = null
        let currentPeriodEnd: string | null = null
        let plan: string | null = (s.metadata?.plan as string) || null

        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId)
          const item = sub.items.data[0]
          priceId = item?.price?.id || null
          interval = (item?.price?.recurring?.interval as string) || null
          status = sub.status || null
          currentPeriodEnd = sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null

          if (!plan) {
            const lookup = item?.price?.lookup_key || ''
            if (lookup?.includes('bpro')) plan = 'business_pro'
            else if (lookup?.includes('plus')) plan = 'plus'
          }
          if (!plan && sub.metadata?.plan) plan = sub.metadata.plan
        }

        if (userId && customerId) {
          await upsertSub(userId, {
            stripe_customer_id: customerId,
            stripe_subscription_id: subId,
            price_id: priceId,
            plan,
            interval,
            status,
            current_period_end: currentPeriodEnd,
          })
        }
        break
      }

      // ✅ Keep row up to date when Stripe changes the subscription (upgrades, cancels, portal changes)
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = (typeof sub.customer === 'string' ? sub.customer : sub.customer?.id) || null
        const item = sub.items.data[0]
        const priceId = item?.price?.id || null
        const interval = (item?.price?.recurring?.interval as string) || null
        const status = sub.status || null
        const currentPeriodEnd = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null

        let plan: string | null = (sub.metadata?.plan as string) || null
        if (!plan) {
          const lookup = item?.price?.lookup_key || ''
          if (lookup?.includes('bpro')) plan = 'business_pro'
          else if (lookup?.includes('plus')) plan = 'plus'
        }

        // Find the user: prefer metadata.userId; else find existing row by customer id
        let userId = (sub.metadata?.userId as string) || null
        if (!userId && customerId) {
          const { data: existing } = await supabase
            .from('user_subscriptions')
            .select('user_id')
            .eq('stripe_customer_id', customerId)
            .maybeSingle()
          userId = existing?.user_id ?? null
        }

        if (userId) {
          await upsertSub(userId, {
            stripe_customer_id: customerId,
            stripe_subscription_id: sub.id,
            price_id: priceId,
            plan,
            interval,
            status,
            current_period_end: currentPeriodEnd,
          })
        }
        break
      }

      // (Optional) keep your identity verification here too, using service role:
      case 'identity.verification_session.verified': {
        const session = event.data.object as Stripe.Identity.VerificationSession
        const userId = session.metadata?.userId
        if (userId) {
          await supabase.from('profiles').update({ is_verified: true }).eq('id', userId)
        }
        break
      }

      default:
        // ignore other events
        break
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Webhook handler error' }, { status: 500 })
  }
}
