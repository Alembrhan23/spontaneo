// src/app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY! // service role (server only!)
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function upsertSub(userId: string, fields: Partial<{
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  price_id: string | null
  plan: string | null
}>) {
  // Upsert by user_id (PK in your screenshot)
  const { error } = await supabase
    .from('user_subscriptions')
    .upsert({ user_id: userId, ...fields }, { onConflict: 'user_id' })
  if (error) throw error
}

// Find our user_id from a Stripe customer id, by reading the existing row
async function userIdFromCustomer(customerId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  if (error) return null
  return data?.user_id ?? null
}

export async function POST(req: NextRequest) {
  const raw = await req.text()
  const sig = req.headers.get('stripe-signature')

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(raw, sig!, WEBHOOK_SECRET)
  } catch (err: any) {
    return NextResponse.json({ error: `Invalid signature: ${err.message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      // After checkout completes we know: session.subscription, session.customer and client_reference_id (your user_id)
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = (session.client_reference_id || session.metadata?.userId) as string | undefined
        const customerId = typeof session.customer === 'string' ? session.customer : (session.customer as any)?.id
        const subscriptionId = typeof session.subscription === 'string'
          ? session.subscription
          : (session.subscription as any)?.id

        // Try to get the price_id from the line item for your schema
        let priceId: string | null = null
        try {
          const full = await stripe.checkout.sessions.retrieve(session.id, {
            expand: ['line_items.data.price']
          })
          priceId = (full.line_items?.data?.[0]?.price?.id as string) || null
        } catch {}

        const plan = (session.metadata?.plan as string) || null

        if (userId && customerId) {
          await upsertSub(userId, {
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId || null,
            price_id: priceId,
            plan
          })
        }
        break
      }

      // Keep row in sync if subscription is changed later
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : (sub.customer as any)?.id
        const userId =
          (sub.metadata?.userId as string | undefined) || (customerId ? await userIdFromCustomer(customerId) : null)

        const priceId = (sub.items?.data?.[0]?.price?.id as string) || null
        const plan = (sub.metadata?.plan as string) || null

        if (userId && customerId) {
          await upsertSub(userId, {
            stripe_customer_id: customerId,
            stripe_subscription_id: sub.id,
            price_id: priceId,
            plan
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : (sub.customer as any)?.id
        const userId =
          (sub.metadata?.userId as string | undefined) || (customerId ? await userIdFromCustomer(customerId) : null)

        if (userId) {
          await upsertSub(userId, {
            stripe_subscription_id: null
          })
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
