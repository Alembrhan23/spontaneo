// src/app/pricing/page.tsx
'use client'

import Link from 'next/link'
import { useState } from 'react'

// TODO: paste your Stripe Payment Links when ready
const STRIPE_PLUS_LINK = '#'
const STRIPE_VENUE_LINK = '#'

type Tab = 'consumer' | 'business'

export default function PricingPage() {
  const [tab, setTab] = useState<Tab>('consumer')
  const [annual, setAnnual] = useState(false)

  const pricePlus = annual
    ? { label: '$39.90/yr', sub: '≈ $3.33/mo billed annually' }
    : { label: '$3.99/mo', sub: 'billed monthly' }

  const priceVenue = annual
    ? { label: '$149/mo', sub: 'or $1,499/year (save 16%)' }
    : { label: '$149/mo', sub: 'billed monthly' }

  return (
    <div className="bg-gradient-to-b from-indigo-50 via-white to-white min-h-screen">
      {/* Hero */}
      <section className="border-b border-indigo-100 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Simple pricing for everyone</h1>
              <p className="mt-3 max-w-2xl text-white/90">
                Join for free, upgrade for more fun. For people who want to meet up and venues who want to welcome them.
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

          {/* Tabs */}
          <div className="mt-6 inline-flex rounded-xl bg-white/10 ring-1 ring-white/20 p-1">
            <button
              onClick={() => setTab('consumer')}
              className={`px-4 py-2 text-sm rounded-lg transition ${
                tab === 'consumer' ? 'bg-white text-indigo-700' : 'text-white/90 hover:text-white'
              }`}
            >
              For People
            </button>
            <button
              onClick={() => setTab('business')}
              className={`px-4 py-2 text-sm rounded-lg transition ${
                tab === 'business' ? 'bg-white text-indigo-700' : 'text-white/90 hover:text-white'
              }`}
            >
              For Venues & Businesses
            </button>
          </div>
        </div>
      </section>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        {tab === 'consumer' ? (
          <ConsumerSection pricePlus={pricePlus} />
        ) : (
          <BusinessSection priceVenue={priceVenue} annual={annual} />
        )}

        {/* Shared CTA */}
        <section className="mt-12 sm:mt-16 rounded-2xl border bg-white p-8 shadow-sm text-center">
          <h3 className="text-xl font-semibold text-gray-900">Still have questions?</h3>
          <p className="mt-2 text-gray-600">We're happy to help you choose the right plan.</p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="mailto:hello@nowio.app?subject=Nowio%20Pricing"
              className="inline-flex items-center rounded-lg bg-indigo-600 px-5 py-2.5 text-white hover:bg-indigo-700 transition-colors"
            >
              Contact Us
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center rounded-lg border border-gray-300 px-5 py-2.5 hover:bg-gray-50 transition-colors"
            >
              Start Free Today
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}

/* ---------------------------- B2C Section ---------------------------- */

function ConsumerSection({ pricePlus }: { pricePlus: { label: string; sub: string } }) {
  return (
    <>
      {/* Plans */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Free */}
        <PlanCard
          accent="from-gray-50 to-white"
          title="Explorer"
          price="Free"
          sub="Perfect for trying out Nowio"
          cta={{ href: '/signup', label: 'Get Started' }}
          features={[
            'Join up to 3 activities daily',
            'Basic event notifications',
            'Chat with activity members',
            'Explore your neighborhood',
            'Create your profile',
            'Message other members'
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
          cta={{ href: STRIPE_PLUS_LINK, label: 'Get Plus' }}
          features={[
            'Join unlimited activities',
            'Get first access to popular events',
            'Special birthday rewards at partner venues',
            'Priority notifications for last-minute plans',
            'Exclusive member badge',
            'Create unlimited activities'
          ]}
          perks={[
            'Sponsored free drinks at partner venues',
            'Birthday month special treats',
            'VIP access to special events',
            'Member-only discounts at local businesses'
          ]}
          foot="Cancel anytime, no questions asked"
        />
      </div>

      {/* Comparison */}
      <section className="mt-12 sm:mt-16">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">Plan Comparison</h2>
        <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-600">
                <th className="px-6 py-4">What you get</th>
                <th className="px-6 py-4 text-center">Explorer</th>
                <th className="px-6 py-4 text-center">Social Plus</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[
                ['Activities you can join per day', '3', 'Unlimited'],
                ['Create activities', '✓', 'Unlimited'],
                ['Chat with members', '✓', '✓'],
                ['First access to popular events', '—', '✓'],
                ['Birthday specials at venues', '—', '✓'],
                ['Sponsored perks', '—', '✓'],
                ['Member discounts', '—', '✓'],
                ['Priority notifications', '—', '✓'],
                ['Special member badge', '—', '✓'],
                ['Business partnership benefits', '—', '✓'],
              ].map((row) => (
                <tr key={row[0]} className="text-gray-800 even:bg-gray-50/50">
                  <td className="px-6 py-4 font-medium">{row[0]}</td>
                  <td className="px-6 py-4 text-center">{row[1]}</td>
                  <td className="px-6 py-4 text-center">{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-gray-500 text-center">All plans help you connect with local businesses and people</p>
      </section>
    </>
  )
}

/* ---------------------------- B2B Section ---------------------------- */

function BusinessSection({ priceVenue, annual }: { priceVenue: { label: string; sub: string }; annual: boolean }) {
  return (
    <>
      {/* Dashboard Preview */}
      <div className="mb-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-200">
        <div className="flex flex-col lg:flex-row items-center gap-8">
          <div className="lg:w-1/2">
            <h2 className="text-2xl font-bold text-gray-900">Advanced Business Dashboards</h2>
            <p className="mt-4 text-gray-700">
              Understand your customers, track event performance, and grow your business with our powerful analytics tools.
            </p>
            <ul className="mt-6 space-y-3">
              <li className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 flex-shrink-0">✓</div>
                <span>Real-time attendance tracking</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 flex-shrink-0">✓</div>
                <span>Customer demographics & preferences</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 flex-shrink-0">✓</div>
                <span>Revenue impact reporting</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 flex-shrink-0">✓</div>
                <span>Peak hours & day analysis</span>
              </li>
            </ul>
          </div>
          <div className="lg:w-1/2">
            <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200">
              <div className="bg-gray-100 rounded-lg p-3 h-48 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <div className="w-16 h-16 mx-auto mb-2 bg-blue-200 rounded-lg flex items-center justify-center">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                    </svg>
                  </div>
                  <p className="text-sm font-medium">Interactive Business Dashboard</p>
                  <p className="text-xs mt-1">Real-time analytics & insights</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Plans */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Starter */}
        <PlanCard
          accent="from-gray-50 to-white"
          title="Business Starter"
          price="Free trial"
          sub="30 days to experience the platform"
          cta={{ href: '/contact', label: 'Start Trial' }}
          features={[
            '5 featured listings per week',
            'Basic business profile',
            'Attendance tracking for events',
            'Message attendees directly',
            'Email support',
            'Promote one venue location',
            'Basic performance metrics'
          ]}
          perks={[]}
          foot="Perfect for testing the platform"
        />

        {/* Business Pro */}
        <PlanCard
          accent="from-blue-50 to-white"
          title="Business Pro"
          price={annual ? '$1,499/year' : '$149/month'}
          sub={annual ? 'Save 16% with annual billing' : 'Monthly billing with no commitment'}
          highlight
          cta={{ href: STRIPE_VENUE_LINK, label: 'Get Business Pro' }}
          features={[
            'Unlimited featured listings',
            'Priority placement in app',
            'Advanced analytics dashboard',
            'Customer demographics & insights',
            '5 team member accounts',
            'Priority business support',
            'Promote multiple venues',
            'Revenue impact reports',
            'Peak hours analysis'
          ]}
          perks={[
            'Featured in neighborhood guides',
            'Special event promotions',
            'Customer behavior insights',
            'Competitive analysis reports',
            'API access for data export'
          ]}
          foot="Complete business intelligence suite"
        />
      </div>

      {/* Enterprise Option */}
      <div className="mt-12 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-2xl p-8 text-center">
        <h3 className="text-2xl font-bold text-purple-900">Enterprise Solutions</h3>
        <p className="mt-3 text-purple-700 max-w-2xl mx-auto">
          For businesses with multiple locations, custom integration needs, or advanced analytics requirements.
        </p>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="bg-white p-4 rounded-lg border border-purple-100">
            <div className="w-10 h-10 mx-auto mb-3 bg-purple-100 rounded-lg flex items-center justify-center text-purple-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-4 0H9m4 0V9a2 2 0 00-2-2H5a2 2 0 00-2 2v10m4 0h4m-4 0V9"></path>
              </svg>
            </div>
            <h4 className="font-semibold text-gray-900">Multi-Location Management</h4>
            <p className="text-sm text-gray-600 mt-2">Manage all your venues from a single dashboard</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-purple-100">
            <div className="w-10 h-10 mx-auto mb-3 bg-purple-100 rounded-lg flex items-center justify-center text-purple-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
            </div>
            <h4 className="font-semibold text-gray-900">Custom Analytics</h4>
            <p className="text-sm text-gray-600 mt-2">Tailored reports and business intelligence</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-purple-100">
            <div className="w-10 h-10 mx-auto mb-3 bg-purple-100 rounded-lg flex items-center justify-center text-purple-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
              </svg>
            </div>
            <h4 className="font-semibold text-gray-900">API Integration</h4>
            <p className="text-sm text-gray-600 mt-2">Connect with your existing systems</p>
          </div>
        </div>
        <Link
          href="mailto:enterprise@nowio.app?subject=Enterprise%20Inquiry"
          className="mt-8 inline-flex items-center rounded-lg bg-purple-600 px-6 py-3 text-white hover:bg-purple-700 transition-colors font-medium"
        >
          Contact Enterprise Team
        </Link>
      </div>

      {/* Comparison */}
      <section className="mt-12 sm:mt-16">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">Business Plan Comparison</h2>
        <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-600">
                <th className="px-6 py-4">Dashboard Features</th>
                <th className="px-6 py-4 text-center">Business Starter</th>
                <th className="px-6 py-4 text-center">Business Pro</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[
                ['Featured listings per week', '5', 'Unlimited'],
                ['Advanced analytics dashboard', 'Basic', 'Full access'],
                ['Customer demographics', '—', '✓'],
                ['Revenue impact reports', '—', '✓'],
                ['Peak hours analysis', '—', '✓'],
                ['Team members', '1', '5'],
                ['Support', 'Email', 'Priority'],
                ['Data export capabilities', '—', '✓'],
                ['API access', '—', '✓'],
                ['Custom reporting', '—', '✓'],
                ['Multi-venue management', '—', '✓'],
                ['Competitive analysis', '—', '✓'],
              ].map((row) => (
                <tr key={row[0]} className="text-gray-800 even:bg-gray-50/50">
                  <td className="px-6 py-4 font-medium">{row[0]}</td>
                  <td className="px-6 py-4 text-center">{row[1]}</td>
                  <td className="px-6 py-4 text-center">{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-gray-500 text-center">All plans include dashboard access with varying levels of features</p>
      </section>
    </>
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
  foot
}: {
  accent: string
  title: string
  price: string
  sub?: string
  features: string[]
  perks: string[]
  cta: { href: string; label: string }
  highlight?: boolean
  foot?: string
}) {
  return (
    <div
      className={`rounded-2xl border shadow-sm bg-gradient-to-b ${accent} p-8 flex flex-col h-full ${
        highlight ? 'ring-2 ring-blue-600 relative' : ''
      }`}
    >
      {highlight && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="rounded-full bg-blue-600 px-3 py-1 text-sm font-medium text-white shadow-md">Most Popular</span>
        </div>
      )}
      
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
      </div>
      
      <div className="mt-2 mb-6">
        <div className="text-3xl font-bold text-gray-900">{price}</div>
        {sub && <div className="text-sm text-gray-600 mt-1">{sub}</div>}
      </div>

      <div className="mb-6 flex-1">
        <h4 className="font-medium text-gray-900 mb-3">Includes:</h4>
        <ul className="space-y-2 text-gray-700">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 flex-shrink-0">✓</span>
              <span className="text-sm">{f}</span>
            </li>
          ))}
        </ul>

        {perks.length > 0 && (
          <>
            <h4 className="font-medium text-gray-900 mt-6 mb-3">Advanced features:</h4>
            <ul className="space-y-2 text-gray-700">
              {perks.map((p) => (
                <li key={p} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 flex-shrink-0">📊</span>
                  <span className="text-sm">{p}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="mt-auto">
        <Link
          href={cta.href}
          className={`inline-flex w-full items-center justify-center rounded-lg px-4 py-3 text-base font-medium transition-colors ${
            highlight 
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md' 
              : 'border border-gray-300 text-gray-900 hover:bg-gray-50'
          }`}
        >
          {cta.label}
        </Link>
        {foot && <p className="mt-3 text-xs text-gray-500 text-center">{foot}</p>}
      </div>
    </div>
  )
}