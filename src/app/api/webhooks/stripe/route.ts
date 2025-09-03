// src/app/api/webhooks/stripe/route.ts
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs' // ensure Node (not Edge) for Stripe signature verification

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret)
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 })
  }

  const supabase = createClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = (session.client_reference_id || session.metadata?.userId) as string | undefined
        const subscriptionId = session.subscription as string | undefined
        const customerId = session.customer as string | undefined

        if (userId && subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['items.data.price'] })
          const item = subscription.items.data[0]
          const priceId = item?.price.id || null
          const plan = (subscription.metadata?.plan || session.metadata?.plan || '') as string
          const interval = (subscription.metadata?.interval || session.metadata?.interval || (item?.price.recurring?.interval ?? '')) as string

          await supabase
            .from('user_subscriptions')
            .upsert({
              user_id: userId,
              stripe_customer_id: customerId ?? null,
              stripe_subscription_id: subscriptionId,
              price_id: priceId ?? null,
              plan: plan || (priceId?.includes('PLUS') ? 'plus' : 'business_pro'),
              interval: interval || item?.price.recurring?.interval || null,
              status: subscription.status,
              cancel_at_period_end: subscription.cancel_at_period_end,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
        }
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.created':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const userId = (sub.metadata as any)?.userId as string | undefined

        // If you didn't set metadata earlier, fetch session/customer → map to user here, or store by stripe_customer_id
        const updates = {
          stripe_subscription_id: sub.id,
          price_id: sub.items.data[0]?.price.id ?? null,
          status: sub.status,
          cancel_at_period_end: sub.cancel_at_period_end,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        }

        if (userId) {
          await supabase.from('user_subscriptions').upsert({ user_id: userId, ...updates })
        } else {
          // fallback by customer_id if you also store it
          await supabase.from('user_subscriptions').update(updates).eq('stripe_subscription_id', sub.id)
        }
        break
      }

      // Keep your Identity event if you use Stripe Identity
      case 'identity.verification_session.verified': {
        const session = event.data.object as Stripe.Identity.VerificationSession
        const userId = session.metadata?.userId
        if (userId) {
          await supabase.from('profiles').update({ verified: true }).eq('id', userId)
        }
        break
      }

      // invoices are handy for alerts/metrics; optional
      case 'invoice.payment_failed':
      case 'invoice.payment_succeeded':
        break

      default:
        // ignore others for now
        break
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    // Make debugging easier
    console.error('Stripe webhook error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
