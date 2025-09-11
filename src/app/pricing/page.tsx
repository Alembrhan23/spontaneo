// src/app/pricing/page.tsx
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type Interval = 'monthly' | 'annual'
type Plan = 'plus'

type SubRow = {
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan: string | null
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(false)
  const [sub, setSub] = useState<SubRow | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setAuthChecked(true); return }
      setUserId(user.id)
      const { data } = await supabase
        .from('user_subscriptions')
        .select('stripe_customer_id, stripe_subscription_id, plan')
        .eq('user_id', user.id)
        .maybeSingle()
      setSub(data ?? null)
      setAuthChecked(true)
    })()
  }, [])

  const pricePlus = annual
    ? { label: '$36.90/yr', sub: '≈ $2.33/mo billed annually' }
    : { label: '$2.99/mo', sub: 'billed monthly' }

  const hasBilling = !!(sub?.stripe_customer_id || sub?.stripe_subscription_id)
  const isPlus = sub?.plan === 'plus'

  async function startCheckout(plan: Plan, interval: Interval) {
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ plan, interval }),
      })
      if (res.status === 401) {
        window.location.href = '/login?next=/pricing'
        return
      }
      const data = await res.json()
      if (data?.url) window.location.href = data.url
      else alert(data?.error || 'Could not start checkout')
    } catch (e: any) {
      alert(e?.message || 'Network error')
    }
  }

  async function openPortal() {
    try {
      const res = await fetch('/api/portal', { method: 'POST' })
      if (res.status === 401) { window.location.href = '/login?next=/pricing'; return }
      const data = await res.json()
      if (data?.url) window.location.href = data.url
      else window.location.href = '/pricing?createCustomer=1'
    } catch (e: any) {
      alert(e?.message || 'Something went wrong.')
    }
  }

  return (
    <div className="bg-gradient-to-b from-indigo-50 via-white to-white min-h-screen">
      {/* Hero */}
      <section className="border-b border-indigo-100 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Simple pricing for everyone</h1>
              <p className="mt-3 max-w-2xl text-white/90">
                Join for free, upgrade for more fun.
              </p>
            </div>

            {/* Billing toggle */}
            <div className="rounded-xl bg-white/10 ring-1 ring-white/20 px-2 py-2 self-start sm:self-auto">
              <div className="flex items-center gap-3 text-sm">
                <button
                  className={`px-3 py-1.5 rounded-lg transition ${!annual ? 'bg-white text-indigo-700' : 'text-white/90 hover:text-white'}`}
                  onClick={() => setAnnual(false)}
                >
                  Monthly
                </button>
                <button
                  className={`px-3 py-1.5 rounded-lg transition ${annual ? 'bg-white text-indigo-700' : 'text-white/90 hover:text-white'}`}
                  onClick={() => setAnnual(true)}
                >
                  Annual <span className="ml-1 text-xs opacity-80">(save 16%)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
        <ConsumerSection
          pricePlus={pricePlus}
          hasBilling={hasBilling}
          isPlus={isPlus}
          onPlusClick={() => startCheckout('plus', annual ? 'annual' : 'monthly')}
          onManageClick={openPortal}
          authChecked={authChecked}
        />

        {/* Business CTA only */}
        <section className="mt-16 rounded-2xl border bg-white p-8 shadow-sm text-center">
          <h3 className="text-xl font-semibold text-gray-900">Are you a business?</h3>
          <p className="mt-2 text-gray-600">Get in touch to list your venue or offer perks to Nowio users.</p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="mailto:hello@nowio.app?subject=Nowio%20Business%20Inquiry"
              className="inline-flex items-center rounded-lg bg-indigo-600 px-5 py-2.5 text-white hover:bg-indigo-700 transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </section>

        {/* Back to dashboard if logged in */}
        {userId && (
          <div className="mt-10 text-center">
            <Link
              href="/discover"
              className="inline-flex items-center rounded-lg border border-gray-300 px-5 py-2.5 hover:bg-gray-50 transition-colors"
            >
              ← Back to Dashboard
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}

/* ---------------------------- B2C Section ---------------------------- */
function ConsumerSection({
  pricePlus,
  onPlusClick,
  onManageClick,
  hasBilling,
  isPlus,
  authChecked,
}: any) {
  const showManage = hasBilling && (isPlus || !authChecked)

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Free */}
      <PlanCard
        accent="from-gray-50 to-white"
        title="Explorer"
        price="Free"
        sub="Try Nowio for free"
        cta={{ label: 'Get Started', href: '/signup' }}
        features={[
          'Join up to 3 activities daily',
          'Basic event notifications',
          'Chat with members',
          'Explore your neighborhood',
        ]}
        perks={[]}
        foot="No credit card needed"
      />

      {/* Plus */}
      <PlanCard
        accent="from-indigo-50 to-white"
        title="Social Plus"
        price={pricePlus.label}
        sub={pricePlus.sub}
        highlight
        cta={
          showManage
            ? { label: 'Manage plan', onClick: onManageClick }
            : { label: 'Get Plus', onClick: onPlusClick }
        }
        features={[
          'Unlimited activities',
          'Priority notifications',
          'Birthday rewards at partner venues',
          'Special member badge',
        ]}
        perks={['Exclusive discounts at local businesses', 'VIP event access']}
        foot={showManage ? 'You’re already a member' : 'Cancel anytime'}
      />
    </div>
  )
}

/* ---------------------------- Shared Card ---------------------------- */
function PlanCard({
  accent,
  title,
  price,
  sub,
  features,
  perks,
  cta,
  highlight = false,
  foot,
}: any) {
  const CtaEl = cta.onClick ? (
    <button
      onClick={cta.onClick}
      className={`inline-flex w-full items-center justify-center rounded-lg px-4 py-3 text-base font-medium transition-colors ${
        highlight
          ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
          : 'border border-gray-300 text-gray-900 hover:bg-gray-50'
      }`}
    >
      {cta.label}
    </button>
  ) : (
    <Link
      href={cta.href || '#'}
      className={`inline-flex w-full items-center justify-center rounded-lg px-4 py-3 text-base font-medium transition-colors ${
        highlight
          ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
          : 'border border-gray-300 text-gray-900 hover:bg-gray-50'
      }`}
    >
      {cta.label}
    </Link>
  )

  return (
    <div
      className={`rounded-2xl border shadow-sm bg-gradient-to-b ${accent} p-8 flex flex-col h-full ${
        highlight ? 'ring-2 ring-blue-600 relative' : ''
      }`}
    >
      {highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-blue-600 px-3 py-1 text-sm font-medium text-white shadow-md">
            Most Popular
          </span>
        </div>
      )}

      <h3 className="text-xl font-semibold text-gray-900">{title}</h3>

      <div className="mt-2 mb-6">
        <div className="text-3xl font-bold text-gray-900">{price}</div>
        {sub && <div className="text-sm text-gray-600 mt-1">{sub}</div>}
      </div>

      <div className="mb-6 flex-1">
        <ul className="space-y-2 text-gray-700">
          {features.map((f: string) => (
            <li key={f} className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 flex-shrink-0">✓</span>
              <span className="text-sm">{f}</span>
            </li>
          ))}
        </ul>

        {perks.length > 0 && (
          <>
            <h4 className="font-medium text-gray-900 mt-6 mb-3">Extras:</h4>
            <ul className="space-y-2 text-gray-700">
              {perks.map((p: string) => (
                <li key={p} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 flex-shrink-0">⭐</span>
                  <span className="text-sm">{p}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="mt-auto">
        {CtaEl}
        {foot && <p className="mt-3 text-xs text-gray-500 text-center">{foot}</p>}
      </div>
    </div>
  )
}
