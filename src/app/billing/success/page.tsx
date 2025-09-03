// app/billing/success/page.tsx
import Link from "next/link"
import Stripe from "stripe"
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js"

export const metadata = { title: "Billing success • Nowio" }

type SearchParams = { session_id?: string }

export default async function BillingSuccessPage({
  // Next.js 15: await searchParams
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { session_id } = await searchParams

  // Best-effort backfill (non-blocking)
  if (session_id) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2024-06-20",
      })

      // Expand so we get a real Stripe.Subscription object (no Response<> confusion)
      const session = await stripe.checkout.sessions.retrieve(session_id, {
        expand: ["subscription", "subscription.items.data.price", "customer"],
      })

      const userId =
        (session.metadata?.userId as string | undefined) ||
        (session.client_reference_id as string | undefined) ||
        null

      const customerId =
        (typeof session.customer === "string"
          ? session.customer
          : session.customer?.id) || null

      const sub: Stripe.Subscription | null =
        typeof session.subscription === "string"
          ? null
          : (session.subscription as Stripe.Subscription)

      const item = sub?.items.data[0]
      const priceId = item?.price?.id ?? null
      const interval = item?.price?.recurring?.interval ?? null
      const status = sub?.status ?? null
      const currentPeriodEnd =
        sub?.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null

      let plan: string | null =
        (session.metadata?.plan as string | undefined) ??
        (sub?.metadata?.plan as string | undefined) ??
        null

      if (!plan) {
        const lookup = item?.price?.lookup_key ?? ""
        if (lookup.includes("bpro")) plan = "business_pro"
        else if (lookup.includes("plus")) plan = "plus"
      }

      if (userId && customerId) {
        const admin = createSupabaseAdmin(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false } }
        )

        await admin
          .from("user_subscriptions")
          .upsert(
            {
              user_id: userId,
              stripe_customer_id: customerId,
              stripe_subscription_id: sub?.id ?? null,
              price_id: priceId,
              plan,
              interval,
              status,
              current_period_end: currentPeriodEnd,
            },
            { onConflict: "user_id" }
          )
      }
    } catch {
      // ignore; show UI anyway
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center">
      <div className="mx-auto max-w-xl w-full bg-white border rounded-2xl p-6 sm:p-8 shadow-sm text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <svg width="24" height="24" viewBox="0 0 24 24" className="fill-current">
            <path d="M9 16.2 4.8 12l1.4-1.4L9 13.4l8.8-8.8L19.2 6z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900">You’re all set!</h1>
        <p className="mt-2 text-gray-600">Thanks for upgrading. Your subscription is active.</p>
        {session_id && (
          <p className="mt-1 text-xs text-gray-500 break-all">Ref: {session_id}</p>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          {/* Opens Stripe Billing Portal via /api/portal */}
          <a
            href="#"
            data-manage-billing
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-white hover:bg-indigo-700 transition-colors"
          >
            Manage billing
          </a>

          <Link
            href="/profile"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-2.5 hover:bg-gray-50 transition-colors"
          >
            Go to profile
          </Link>
          <Link
            href="/discover"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-2.5 hover:bg-gray-50 transition-colors"
          >
            Start exploring
          </Link>
        </div>

        <p className="mt-4 text-xs text-gray-500">
          You can update payment details or cancel anytime from the billing portal.
        </p>
      </div>

      {/* Tiny inline handler to POST to /api/portal without a client component */}
      <script
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener('click', async (e) => {
              const el = (e.target)?.closest?.('[data-manage-billing]');
              if (!el) return;
              e.preventDefault();
              const res = await fetch('/api/portal', { method: 'POST' });
              const json = await res.json();
              if (json?.url) window.location.href = json.url;
              else alert(json?.error || 'Unable to open billing portal.');
            });
          `,
        }}
      />
    </div>
  )
}
