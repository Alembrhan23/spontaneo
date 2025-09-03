// src/app/api/stripe/webhook/route.ts
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient as createSB } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

// ADMIN client (service role) bypasses RLS. NEVER expose this key to the browser.
const supabase = createSB(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,          // ← add this env in your server (e.g., Vercel Prod)
  { auth: { persistSession: false, autoRefreshToken: false } }
)

type Plan = 'plus' | 'business_pro' | 'unknown'
type Interval = 'monthly' | 'annual' | 'week' | 'unknown'

function inferPlan(price: Stripe.Price | null | undefined): { plan: Plan; interval: Interval } {
  const lookup = (price?.lookup_key || '').toLowerCase()
  const id = price?.id

  if (lookup.includes('plus') && lookup.includes('monthly')) return { plan: 'plus', interval: 'monthly' }
  if (lookup.includes('plus') && lookup.includes('annual'))  return { plan: 'plus', interval: 'annual' }
  if ((lookup.includes('bpro') || lookup.includes('business_pro')) && lookup.includes('monthly'))
    return { plan: 'business_pro', interval: 'monthly' }
  if ((lookup.includes('bpro') || lookup.includes('business_pro')) && lookup.includes('annual'))
    return { plan: 'business_pro', interval: 'annual' }

  // also allow ENV fallbacks if you set PRICE_* env vars
  if (process.env.PRICE_PLUS_MONTHLY === id)  return { plan: 'plus', interval: 'monthly' }
  if (process.env.PRICE_PLUS_ANNUAL === id)   return { plan: 'plus', interval: 'annual' }
  if (process.env.PRICE_BPRO_MONTHLY === id)  return { plan: 'business_pro', interval: 'monthly' }
  if (process.env.PRICE_BPRO_ANNUAL === id)   return { plan: 'business_pro', interval: 'annual' }

  return { plan: 'unknown', interval: (price?.recurring?.interval as Interval) || 'unknown' }
}

async function upsertSubscription(sub: Stripe.Subscription, userId?: string) {
  const price = (sub.items.data[0]?.price as Stripe.Price) || null
  const { plan, interval } = inferPlan(price)
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
  const status = sub.status
  const periodEnd = new Date(sub.current_period_end * 1000).toISOString()

  await supabase.from('user_subscriptions').upsert(
    {
      user_id: userId ?? null,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      plan,
      interval,
      status,
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'stripe_subscription_id' }
  )
}

export async function POST(req: Request) {
  const raw = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(raw, sig, endpointSecret)
  } catch (err: any) {
    return NextResponse.json({ error: `Bad signature: ${err.message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode === 'subscription' && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(
            typeof session.subscription === 'string' ? session.subscription : session.subscription.id
          )
          const userId =
            (session.metadata?.userId as string | undefined) ||
            (session.client_reference_id as string | undefined)
          await upsertSubscription(sub, userId)

          // also persist customer↔user mapping for portal
          if (userId && session.customer) {
            await supabase.from('user_subscriptions').upsert(
              { user_id: userId, stripe_customer_id: session.customer as string },
              { onConflict: 'user_id' }
            )
          }
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        await upsertSubscription(sub, sub.metadata?.userId as string | undefined)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
        await supabase
          .from('user_subscriptions')
          .update({ status: 'canceled', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', sub.id)
          .eq('stripe_customer_id', customerId)
        break
      }

      // ✅ Fix the column name here: set is_verified (not verified)
      case 'identity.verification_session.verified': {
        const vs = event.data.object as Stripe.Identity.VerificationSession
        const userId = vs.metadata?.userId
        if (userId) {
          await supabase.from('profiles').update({ is_verified: true }).eq('id', userId)
        }
        break
      }

      default:
        // ignore others
        break
    }

    return NextResponse.json({ received: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Webhook handler error' }, { status: 500 })
  }
}
