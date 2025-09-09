'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

/* --------------------------------- Types --------------------------------- */
type Activity = {
  emoji: string
  title: string
  time: string
  location: string
  attendees: number
  status: 'Open' | 'Almost full'
  hasPerk?: boolean
}

/* ------------------------------ UI Components ---------------------------- */
function ActivityCard({ a }: { a: Activity }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5 sm:hover:-translate-y-1 w-[85vw] min-w-[85vw] xs:w-[300px] xs:min-w-[300px] sm:min-w-[340px] md:min-w-[360px] snap-start">
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-xl sm:text-2xl">
          {a.emoji}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`text-xs font-medium px-2 py-1 sm:px-3 sm:py-1.5 rounded-full ${
              a.status === 'Open'
                ? 'bg-green-100 text-green-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {a.status}
          </span>
          {a.hasPerk && (
            <div className="flex items-center text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z" clipRule="evenodd" />
              </svg>
              Special perk
            </div>
          )}
        </div>
      </div>

      <h3 className="font-semibold text-gray-900 text-base sm:text-lg mb-2 sm:mb-3">{a.title}</h3>
      
      <div className="flex items-center text-sm text-gray-600 mb-1.5 sm:mb-2">
        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="truncate">{a.time}</span>
      </div>
      
      <div className="flex items-center text-sm text-gray-600 mb-3 sm:mb-4">
        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="truncate">{a.location}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex -space-x-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-indigo-200 to-purple-200 border-2 border-white shadow-sm"
              />
            ))}
          </div>
          <span className="text-xs sm:text-sm text-gray-600 ml-2 font-medium">{a.attendees} going</span>
        </div>

        <button className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-sm hover:shadow-md">
          Join Now
        </button>
      </div>
    </div>
  )
}

function ActivityCarousel({ items }: { items: Activity[] }) {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(true)

  const updateArrows = () => {
    const el = trackRef.current
    if (!el) return
    const { scrollLeft, clientWidth, scrollWidth } = el
    const slack = 8
    setCanLeft(scrollLeft > slack)
    setCanRight(scrollLeft + clientWidth < scrollWidth - slack)
  }

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    updateArrows()
    const onScroll = () => updateArrows()
    const onResize = () => updateArrows()
    el.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      el.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  // Make vertical wheel gestures scroll horizontally inside the carousel
  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollBy({ left: e.deltaY, behavior: 'smooth' })
        e.preventDefault()
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const step = () => {
    const el = trackRef.current
    if (!el) return 300
    // Responsive step based on screen size
    if (window.innerWidth < 640) return Math.floor(el.clientWidth * 0.85)
    if (window.innerWidth < 768) return Math.floor(el.clientWidth * 0.6)
    return Math.floor(el.clientWidth * 0.45)
  }

  const go = (dir: -1 | 1) => {
    const el = trackRef.current
    if (!el) return
    el.scrollBy({ left: dir * step(), behavior: 'smooth' })
  }

  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') go(-1)
    if (e.key === 'ArrowRight') go(1)
  }

  return (
    <div className="relative">
      {/* Hide scrollbar but maintain functionality */}
      <style jsx>{`
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* subtle fade edges - hide on mobile */}
      <div className="pointer-events-none absolute left-0 top-0 h-full w-4 sm:w-8 bg-gradient-to-r from-white to-transparent z-10 hidden xs:block" />
      <div className="pointer-events-none absolute right-0 top-0 h-full w-4 sm:w-8 bg-gradient-to-l from-white to-transparent z-10 hidden xs:block" />

      <div
        ref={trackRef}
        tabIndex={0}
        onKeyDown={onKey}
        className="flex gap-4 overflow-x-auto hide-scrollbar scroll-smooth snap-x snap-mandatory py-2 px-4 sm:px-1 focus:outline-none"
        aria-label="Activities carousel"
      >
        {items.map((a, i) => (
          <ActivityCard key={`${a.title}-${i}`} a={a} />
        ))}
        <div className="shrink-0 w-2" />
      </div>

      {/* Desktop arrows with careful styling */}
      <button
        type="button"
        onClick={() => go(-1)}
        disabled={!canLeft}
        aria-label="Previous activity"
        className={`absolute -left-2 sm:-left-4 top-1/2 -translate-y-1/2 hidden sm:flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white/95 backdrop-blur-sm shadow-md transition-all duration-300 hover:shadow-lg hover:scale-105
        ${canLeft ? 'opacity-100 cursor-pointer' : 'opacity-0 pointer-events-none'}`}
        style={{ 
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          transition: 'opacity 0.3s ease, transform 0.2s ease, box-shadow 0.2s ease'
        }}
      >
        <svg 
          viewBox="0 0 24 24" 
          className="h-5 w-5 text-gray-700" 
          fill="none" 
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      <button
        type="button"
        onClick={() => go(1)}
        disabled={!canRight}
        aria-label="Next activity"
        className={`absolute -right-2 sm:-right-4 top-1/2 -translate-y-1/2 hidden sm:flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white/95 backdrop-blur-sm shadow-md transition-all duration-300 hover:shadow-lg hover:scale-105
        ${canRight ? 'opacity-100 cursor-pointer' : 'opacity-0 pointer-events-none'}`}
        style={{ 
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          transition: 'opacity 0.3s ease, transform 0.2s ease, box-shadow 0.2s ease'
        }}
      >
        <svg 
          viewBox="0 0 24 24" 
          className="h-5 w-5 text-gray-700" 
          fill="none" 
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Mobile arrows (smaller and positioned differently) */}
      <button
        type="button"
        onClick={() => go(-1)}
        disabled={!canLeft}
        aria-label="Previous activity"
        className={`absolute left-2 top-1/2 -translate-y-1/2 sm:hidden flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white/95 backdrop-blur-sm shadow-md transition-all duration-300
        ${canLeft ? 'opacity-100 cursor-pointer' : 'opacity-0 pointer-events-none'}`}
        style={{ 
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          transition: 'opacity 0.3s ease'
        }}
      >
        <svg 
          viewBox="0 0 24 24" 
          className="h-4 w-4 text-gray-700" 
          fill="none" 
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      <button
        type="button"
        onClick={() => go(1)}
        disabled={!canRight}
        aria-label="Next activity"
        className={`absolute right-2 top-1/2 -translate-y-1/2 sm:hidden flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white/95 backdrop-blur-sm shadow-md transition-all duration-300
        ${canRight ? 'opacity-100 cursor-pointer' : 'opacity-0 pointer-events-none'}`}
        style={{ 
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          transition: 'opacity 0.3s ease'
        }}
      >
        <svg 
          viewBox="0 0 24 24" 
          className="h-4 w-4 text-gray-700" 
          fill="none" 
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Mobile indicators for better UX */}
      <div className="flex justify-center mt-4 sm:hidden">
        <div className="flex space-x-1.5">
          {items.slice(0, 4).map((_, i) => (
            <div 
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-gray-300"
              aria-hidden="true"
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ---------- Trust & Safety UI bits (drop-in) ---------- */
function VerifiedTickIcon() {
  return (
    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-sky-500 text-white shadow-sm ring-1 ring-white/70 align-middle">
      <svg viewBox="0 0 24 24" className="w-[10px] h-[10px]" aria-hidden="true">
        <path d="M9 16.2 4.8 12l1.4-1.4L9 13.4l8.8-8.8L19.2 6z" fill="currentColor" />
      </svg>
    </span>
  )
}

/** A slim reassurance bar under the hero CTAs */
function SafetyStrip() {
  return (
    <div className="mt-5 sm:mt-6">
      <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/90 px-3 py-1.5 text-xs sm:text-sm text-gray-700 shadow-sm">
        <VerifiedTickIcon />
        <span className="font-medium">Real people, verified identities</span>
        <span className="mx-2 text-gray-300">•</span>
        <span>Report & block controls</span>
        <span className="mx-2 text-gray-300">•</span>
        <span>Meet-in-public tips</span>
      </div>
    </div>
  )
}

/** A fuller section you can link to (#safety) */
function TrustSafetySection() {
  return (
    <section id="safety" className="py-12 sm:py-16 md:py-20 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-5">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 text-sky-700 px-3 py-1 text-xs sm:text-sm border border-sky-100">
            <VerifiedTickIcon /> <span className="font-medium">Trust & Safety</span>
          </div>
          <h2 className="mt-4 text-2xl sm:text-3xl md:4xl font-bold tracking-tight text-gray-900">
            Your safety is our priority
          </h2>
          <p className="mt-3 sm:mt-4 text-base sm:text-lg text-gray-600 max-w-3xl mx-auto">
            We've built multiple layers of protection to ensure everyone has a safe and positive experience
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-sky-100 text-sky-700 grid place-items-center mb-3">
              <VerifiedTickIcon />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1.5">ID-Verified Profiles</h3>
            <p className="text-sm text-gray-600">
              Look for the blue check on hosts and attendees. We use secure, industry-standard identity checks.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 grid place-items-center mb-3">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M12 2a10 10 0 100 20 10 10 0 000-20Zm1 15h-2v-2h2v2Zm0-4h-2V7h2v6Z"/></svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1.5">Report & Block</h3>
            <p className="text-sm text-gray-600">
              You're in control. Quickly report or block users and we'll handle the rest.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 grid place-items-center mb-3">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M12 2 2 7l10 5 10-5-10-5Zm0 7L2 4v13l10 5 10-5V4l-10 5Z"/></svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1.5">Smart Safety Tips</h3>
            <p className="text-sm text-gray-600">
              Meet in public places, share plans with a friend, and use in-app chat until you're comfortable.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- Business Partnerships Section ---------- */
function BusinessPartnershipsSection() {
  return (
    <section id="partners" className="py-12 sm:py-16 md:py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-5">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
            Exclusive Perks & Partnerships
          </h2>
          <p className="mt-3 sm:mt-4 text-base sm:text-lg text-gray-600 max-w-3xl mx-auto">
            Enjoy special benefits at local businesses when you join activities through Nowio
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-2xl border border-purple-100">
              <h3 className="font-semibold text-lg text-gray-900 mb-4">For Participants</h3>
              <ul className="space-y-3">
                {[
                  "10% off at partner coffee shops",
                  "Free appetizer with purchase at local restaurants",
                  "Discounted entry to fitness classes",
                  "Special tasting flights at breweries"
                ].map((perk, index) => (
                  <li key={index} className="flex items-start">
                    <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mt-0.5 mr-3 flex-shrink-0">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-gray-700">{perk}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div>
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-2xl border border-amber-100">
              <h3 className="font-semibold text-lg text-gray-900 mb-4">For Business Owners</h3>
              <p className="text-gray-700 mb-4">
                Partner with us to attract new customers and fill your venue during off-peak hours.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mr-2 flex-shrink-0">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-700">Drive foot traffic during slow periods</span>
                </li>
                <li className="flex items-center">
                  <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mr-2 flex-shrink-0">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-700">Reach highly-engaged local customers</span>
                </li>
                <li className="flex items-center">
                  <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mr-2 flex-shrink-0">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-700">Simple analytics to track campaign success</span>
                </li>
              </ul>
              <div className="mt-6">
                <Link href="/business" className="inline-flex items-center text-amber-700 hover:text-amber-800 font-medium text-sm">
                  Learn about business partnerships
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* --------------------------------- Page ---------------------------------- */
export default function Home() {
  const router = useRouter()

  // avoid header flicker: block render until auth checked
  const [checkingAuth, setCheckingAuth] = useState(true)
  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.replace('/discover')
        return
      }
      setCheckingAuth(false)
    })()
  }, [router])

  // mobile menu state + helpers
  const [mobileOpen, setMobileOpen] = useState(false)
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])
  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileOpen])

  // Smooth in-page anchor scrolling
  useEffect(() => {
    const header = () => document.querySelector('header') as HTMLElement | null
    const headerOffset = () => (header()?.getBoundingClientRect().height ?? 80) + 16
    const scrollToHash = (hash: string, smooth = true) => {
      const id = decodeURIComponent(hash.replace('#', ''))
      const el = document.getElementById(id)
      if (!el) return
      const top = el.getBoundingClientRect().top + window.scrollY - headerOffset()
      window.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' })
    }
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a[href^="#"]') as HTMLAnchorElement | null
      if (!a || !a.hash || a.hash === '#') return
      if (!document.getElementById(a.hash.slice(1))) return
      e.preventDefault()
      scrollToHash(a.hash, true)
      history.pushState(null, '', a.hash)
      setMobileOpen(false)
    }
    document.addEventListener('click', onClick)
    if (location.hash) requestAnimationFrame(() => scrollToHash(location.hash, false))
    return () => document.removeEventListener('click', onClick)
  }, [])

  if (checkingAuth) return null

  return (
    <main className="relative min-h-screen overflow-hidden bg-white">
      {/* Background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-white via-indigo-50/20 to-amber-50/20" />
      <div aria-hidden className="pointer-events-none absolute top-0 right-0 -translate-y-1/3 translate-x-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-indigo-100 rounded-full blur-3xl opacity-50 -z-10" />
      <div aria-hidden className="pointer-events-none absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-amber-100 rounded-full blur-3xl opacity-40 -z-10" />

      {/* ===================== Header ===================== */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-r from-indigo-600 to-amber-500 flex items-center justify-center text-white font-bold text-sm sm:text-base">N</div>
              <span className="text-lg sm:text-xl font-bold text-gray-900">Nowio</span>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              <a href="#activities" className="text-gray-700 hover:text-indigo-600 transition-colors font-medium">Activities</a>
              <a href="#how" className="text-gray-700 hover:text-indigo-600 transition-colors font-medium">How It Works</a>
              <a href="#safety" className="text-gray-700 hover:text-indigo-600 transition-colors font-medium">Safety</a>
              <a href="#partners" className="text-gray-700 hover:text-indigo-600 transition-colors font-medium">Perks</a>
              <a href="#niches" className="text-gray-700 hover:text-indigo-600 transition-colors font-medium">Categories</a>
            </nav>

            <div className="hidden md:flex items-center gap-3">
              <Link href="/login" className="px-4 py-2 text-gray-700 hover:text-indigo-600 font-medium transition-colors">Sign In</Link>
              <Link href="/signup" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">Get Started</Link>
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen(v => !v)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              className="md:hidden inline-flex items-center justify-center rounded-lg p-2 border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              {mobileOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div className={`${mobileOpen ? 'pointer-events-auto' : 'pointer-events-none'} md:hidden`}>
          <div onClick={() => setMobileOpen(false)} className={`fixed inset-0 bg-black/20 transition-opacity ${mobileOpen ? 'opacity-100' : 'opacity-0'}`} aria-hidden="true" />
          <div id="mobile-menu" className={`absolute inset-x-0 top-full origin-top bg-white shadow-lg border-t border-gray-100 transition transform ${mobileOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
            <nav className="px-4 py-3">
              <a href="#activities" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg text-gray-800 hover:bg-gray-50 font-medium">Activities</a>
              <a href="#how" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg text-gray-800 hover:bg-gray-50 font-medium">How It Works</a>
              <a href="#safety" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg text-gray-800 hover:bg-gray-50 font-medium">Safety</a>
              <a href="#partners" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg text-gray-800 hover:bg-gray-50 font-medium">Perks</a>
              <a href="#niches" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg text-gray-800 hover:bg-gray-50 font-medium">Categories</a>
              <div className="my-2 border-t border-gray-100" />
              <Link href="/login" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg text-gray-800 hover:bg-gray-50 font-medium">Sign In</Link>
              <Link href="/signup" onClick={() => setMobileOpen(false)} className="mt-1 block w-full text-center px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium">Get Started</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* =========================== Hero ============================ */}
      <section id="hero" className="relative mx-auto max-w-6xl px-4 sm:px-5 pt-12 sm:pt-16 md:pt-20 pb-8 sm:pb-10 text-center">
        <div className="max-w-3xl mx-auto">
          <p className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/90 px-3 py-1 text-xs sm:text-sm font-medium text-indigo-700 shadow-sm backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Denver Beta • RiNo • LoHi • Five Points
          </p>

          <h1 className="mt-6 sm:mt-8 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900">
            <span className="block">Do more of what you love.</span>
            <span className="block mt-2 sm:mt-3 text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-amber-500">
              With people who get it.
            </span>
          </h1>

              {/* "Do more of what you love. With people who get it." */}
          <p className="mt-4 sm:mt-6 text-lg sm:text-xl leading-7 sm:leading-8 text-gray-600">
            Find curated experiences in your neighborhood and enjoy exclusive perks when you try them with new friends.
          </p>

          <div className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <Link href="/signup" className="relative inline-flex items-center justify-center px-5 py-2.5 sm:px-6 sm:py-3.5 text-sm sm:text-base font-semibold text-white transition-all duration-300 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl hover:from-indigo-700 hover:to-indigo-800 hover:shadow-xl hover:-translate-y-0.5">
              Start Exploring
            </Link>
            <Link href="/login" className="relative inline-flex items-center justify-center px-5 py-2.5 sm:px-6 sm:py-3.5 text-sm sm:text-base font-semibold text-gray-900 transition-all duration-300 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:shadow-md">
              Browse Activities
            </Link>
          </div>

          {/* Trust & Safety micro-strip */}
          <SafetyStrip />
        </div>

        {/* Showcase tiles */}
        <div className="mt-12 sm:mt-16 max-w-5xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 p-4 sm:p-6 md:p-8 shadow-xl">
            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 sm:p-6 rounded-xl border border-indigo-100">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-lg sm:text-xl mb-3 sm:mb-4">🎯</div>
                <h3 className="font-semibold text-base sm:text-lg text-gray-900 mb-2">Host an Activity</h3>
                <p className="text-gray-700 text-xs sm:text-sm mb-3 sm:mb-4">Create your own plan and invite others to join</p>
                <button className="text-indigo-700 text-xs sm:text-sm font-medium flex items-center">Create a plan <span className="ml-1">→</span></button>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 sm:p-6 rounded-xl border border-amber-100">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-amber-600 flex items-center justify-center text-white text-lg sm:text-xl mb-3 sm:mb-4">👥</div>
                <h3 className="font-semibold text-base sm:text-lg text-gray-900 mb-2">Join Others</h3>
                <p className="text-gray-700 text-xs sm:text-sm mb-3 sm:mb-4">Find activities that match your interests</p>
                <button className="text-amber-700 text-xs sm:text-sm font-medium flex items-center">Explore activities <span className="ml-1">→</span></button>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 sm:p-6 rounded-xl border border-green-100">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-green-600 flex items-center justify-center text-white text-lg sm:text-xl mb-3 sm:mb-4">✨</div>
                <h3 className="font-semibold text-base sm:text-lg text-gray-900 mb-2">Share Experiences</h3>
                <p className="text-gray-700 text-xs sm:text-sm mb-3 sm:mb-4">Create memories with new people</p>
                <button className="text-green-700 text-xs sm:text-sm font-medium flex items-center">See experiences <span className="ml-1">→</span></button>
              </div>
            </div>

            <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-100">
              <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                {[
                  { emoji: '☕', label: 'Coffee' },
                  { emoji: '🏓', label: 'Pickleball' },
                  { emoji: '🍻', label: 'Breweries' },
                  { emoji: '🎨', label: 'Art Walks' },
                  { emoji: '🚶', label: 'Urban Hikes' },
                  { emoji: '🎲', label: 'Game Nights' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm">
                    <span>{item.emoji}</span>
                    <span className="font-medium text-gray-700">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== Activity Browser (Carousel) ===================== */}
      <section id="activities" className="py-12 sm:py-16 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-5">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
              What's happening near you
            </h2>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg text-gray-600 max-w-3xl mx-auto">
              Explore activities you can join right now in Denver neighborhoods
            </p>
          </div>

          {/* One-row interactive carousel */}
          <ActivityCarousel
            items={[
              { emoji: '☕', title: 'Coffee & Cowork',   time: 'Today • 10:00 AM',  location: 'Thump Coffee • RiNo',        attendees: 4, status: 'Open', hasPerk: true },
              { emoji: '🏓', title: 'Pickleball Social', time: 'Today • 5:30 PM',   location: 'Central Park Courts',        attendees: 6, status: 'Almost full' },
              { emoji: '🍻', title: 'Brewery Hangout',   time: 'Tomorrow • 7:00 PM', location: 'Ratio Beerworks',            attendees: 3, status: 'Open', hasPerk: true },
              { emoji: '🎨', title: 'Art Walk Meetup',   time: 'Fri • 6:00 PM',     location: 'Santa Fe Arts District',     attendees: 8, status: 'Open' },
              { emoji: '🚶', title: 'City Park Walk',    time: 'Sat • 9:00 AM',     location: 'City Park • Five Points',    attendees: 5, status: 'Open' },
              { emoji: '🎲', title: 'Board Game Night',  time: 'Sat • 6:30 PM',     location: 'The Wizards Chest',          attendees: 7, status: 'Almost full', hasPerk: true },
            ]}
          />

          <div className="mt-8 sm:mt-10 text-center">
            <Link href="/login" className="inline-flex items-center text-indigo-600 hover:text-indigo-700 font-medium text-sm sm:text-base">
              See all activities
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ===================== How It Works ===================== */}
      <section id="how" className="py-12 sm:py-16 md:py-20 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-5">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
              Plan → Chat → Meet & Experience
            </h2>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg text-gray-600 max-w-3xl mx-auto">
              Our simple process helps you find activities and connect with people who share your interests
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xl sm:text-2xl mb-4 sm:mb-6">1</div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Plan or Find</h3>
              <p className="text-gray-600 text-sm sm:text-base">Create your own activity or browse existing plans in your neighborhood. Set clear details about what, when, and where.</p>
            </div>
            <div className="text-center">
              <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-xl sm:text-2xl mb-4 sm:mb-6">2</div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Chat & Connect</h3>
              <p className="text-gray-600 text-sm sm:text-base">Once you join or host, chat with attendees to coordinate details, ask questions, and get to know each other.</p>
            </div>
            <div className="text-center">
              <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xl sm:text-2xl mb-4 sm:mb-6">3</div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Meet & Experience</h3>
              <p className="text-gray-600 text-sm sm:text-base">Show up and enjoy the activity together. Create memories and build connections through shared experiences.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== Trust & Safety (NEW) ===================== */}
      <TrustSafetySection />

      {/* ===================== Business Partnerships (NEW) ===================== */}
      <BusinessPartnershipsSection />

      {/* ===================== Popular Categories ===================== */}
      <section id="niches" className="py-12 sm:py-16 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-5">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-gray-900">Popular Categories</h2>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg text-gray-600 max-w-3xl mx-auto">Explore activities by category to find what interests you most</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {[
              { emoji: '☕', label: 'Coffee' },
              { emoji: '🏓', label: 'Pickleball' },
              { emoji: '🍻', label: 'Breweries' },
              { emoji: '🎨', label: 'Art & Culture' },
              { emoji: '🚶', label: 'Walking' },
              { emoji: '🎲', label: 'Games' },
              { emoji: '🐕', label: 'Dog Friends' },
              { emoji: '📚', label: 'Book Clubs' },
              { emoji: '🎵', label: 'Music' },
              { emoji: '🍳', label: 'Food & Cooking' },
              { emoji: '🚴', label: 'Cycling' },
              { emoji: '🎥', label: 'Film' },
            ].map((item, index) => (
              <div key={index} className="flex flex-col items-center p-3 sm:p-4 bg-gray-50 rounded-xl hover:bg-indigo-50 transition-colors cursor-pointer">
                <div className="text-xl sm:text-2xl mb-1.5 sm:mb-2">{item.emoji}</div>
                <span className="text-xs sm:text-sm font-medium text-gray-700 text-center">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 sm:mt-10 text-center">
            <Link href="/login" className="inline-flex items-center text-indigo-600 hover:text-indigo-700 font-medium text-sm sm:text-base">
              Explore all categories
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ===================== Hosting Section ===================== */}
      <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-5">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
                Can't find what you're looking for?
              </h2>
              <p className="mt-3 sm:mt-4 text-base sm:text-lg text-gray-600">
                Host your own activity and invite others to join. Whether it's a coffee meetup, hiking group, or game
                night - create the experience you want to have.
              </p>

              <div className="mt-6 sm:mt-8 space-y-3 sm:space-y-4">
                {[
                  'Set your own time and location',
                  'Define the activity details',
                  'Invite others to join you',
                ].map((t) => (
                  <div key={t} className="flex items-center">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs sm:text-sm mr-2 sm:mr-3">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm sm:text-base text-gray-700">{t}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 sm:mt-8">
                <Link href="/signup" className="inline-flex items-center px-5 py-2.5 sm:px-6 sm:py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors text-sm sm:text-base">
                  Create your activity
                </Link>
              </div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="bg-indigo-50 p-3 sm:p-4 rounded-lg mb-4 sm:mb-6">
                <h3 className="font-semibold text-indigo-900 text-sm sm:text-base mb-1.5">Activity Idea: Coffee & Cowork</h3>
                <p className="text-indigo-700 text-xs sm:text-sm">Bring your laptop and join others for focused work sessions with coffee breaks</p>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Activity Type</label>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {['☕ Coffee', '💻 Coworking', '📚 Study Group'].map((tag) => (
                      <span key={tag} className="px-2 py-0.5 sm:px-3 sm:py-1 bg-gray-100 text-gray-700 rounded-full text-xs sm:text-sm">{tag}</span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Description</label>
                  <p className="text-xs sm:text-sm text-gray-600">Casual coworking session at Thump Coffee. Bring your laptop, we'll take coffee breaks together.</p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">When</label>
                    <p className="text-xs sm:text-sm text-gray-600">Tomorrow, 10AM</p>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Where</label>
                    <p className="text-xs sm:text-sm text-gray-600">Thump Coffee, RiNo</p>
                  </div>
                </div>

                <button className="w-full bg-indigo-600 text-white py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-indigo-700 transition-colors">
                  Create This Activity
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== Final CTA ===================== */}
      <section className="py-12 sm:py-16 md:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-5 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
            Ready to find your next activity?
          </h2>
          <p className="mt-3 sm:mt-4 text-base sm:text-lg text-gray-600">
            Join the Denver community and discover what's happening right now.
          </p>
          <div className="mt-6 sm:mt-8 md:mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <Link href="/signup" className="relative inline-flex items-center justify-center px-5 py-2.5 sm:px-6 sm:py-3.5 text-sm sm:text-base font-semibold text-white transition-all duration-300 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl hover:from-indigo-700 hover:to-indigo-800 hover:shadow-xl hover:-translate-y-0.5">
              Get Started
            </Link>
            <Link href="/login" className="relative inline-flex items-center justify-center px-5 py-2.5 sm:px-6 sm:py-3.5 text-sm sm:text-base font-semibold text-gray-900 transition-all duration-300 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:shadow-md">
              Browse Activities
            </Link>
          </div>
        </div>
      </section>

      {/* ========================= Footer ======================== */}
      <footer className="relative z-10 border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 py-8 sm:py-10 md:py-12">
          <div className="flex flex-col items-center justify-between gap-4 sm:gap-6 md:flex-row">
            <div className="text-center md:text-left">
              <p className="text-sm sm:text-base font-semibold text-gray-900">Nowio</p>
              <p className="mt-1 text-xs text-gray-500 sm:mt-2">
                Find what to do and who to do it with • © {new Date().getFullYear()}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 text-xs sm:text-sm">
              <Link href="/contact" className="text-gray-500 hover:text-gray-700">Contact</Link>
              <Link href="/business" className="text-gray-500 hover:text-gray-700">For Businesses</Link>
              <Link href="/legal/terms" className="text-gray-500 hover:text-gray-700">Terms</Link>
              <Link href="/legal/privacy" className="text-gray-500 hover:text-gray-700">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}