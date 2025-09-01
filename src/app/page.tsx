// src/app/page.tsx
'use client'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  // Smooth scroll implementation
  useEffect(() => {
    const header = () => document.querySelector('header') as HTMLElement | null
    const headerOffset = () => (header()?.getBoundingClientRect().height ?? 80) + 16 // header + breathing room

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
    }

    document.addEventListener('click', onClick)

    // Correct initial position when landing at /#section
    if (location.hash) requestAnimationFrame(() => scrollToHash(location.hash, false))

    return () => document.removeEventListener('click', onClick)
  }, [])

  return (
    <main className="relative min-h-screen overflow-hidden bg-white">
      {/* Background elements */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-white via-indigo-50/20 to-amber-50/20" />
      <div className="absolute top-0 right-0 -translate-y-1/3 translate-x-1/4 w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-50" aria-hidden></div>
      <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/4 w-96 h-96 bg-amber-100 rounded-full blur-3xl opacity-40" aria-hidden></div>

      {/* ===================== Improved Header ===================== */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-5 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-indigo-600 to-amber-500 flex items-center justify-center text-white font-bold">
                N
              </div>
              <span className="text-xl font-bold text-gray-900">Nowio</span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-6">
              <a href="#activities" className="text-gray-700 hover:text-indigo-600 transition-colors font-medium">
                Activities
              </a>
              <a href="#how" className="text-gray-700 hover:text-indigo-600 transition-colors font-medium">
                How It Works
              </a>
              <a href="#niches" className="text-gray-700 hover:text-indigo-600 transition-colors font-medium">
                Popular Categories
              </a>
            </nav>
            
            <div className="flex items-center gap-3">
              <Link 
                href="/login" 
                className="px-4 py-2 text-gray-700 hover:text-indigo-600 font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link 
                href="/signup" 
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* =========================== Hero Section ============================ */}
      <section id="hero" className="relative mx-auto max-w-6xl px-5 pt-16 sm:pt-20 pb-10 text-center">
        <div className="max-w-3xl mx-auto">
          <p className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/90 px-4 py-1.5 text-sm font-medium text-indigo-700 shadow-sm backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Denver Beta • RiNo • LoHi • Five Points
          </p>

          <h1 className="mt-8 text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-gray-900">
            <span className="block">Find activities.</span>
            <span className="block mt-3 text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-amber-500">
              Meet your people.
            </span>
          </h1>

          <p className="mt-6 text-xl leading-8 text-gray-600">
            Discover what's happening right now in your neighborhood and connect with others who share your interests.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link 
              href="/signup" 
              className="relative inline-flex items-center justify-center px-6 py-3.5 text-base font-semibold text-white transition-all duration-300 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl hover:from-indigo-700 hover:to-indigo-800 hover:shadow-xl hover:-translate-y-0.5 sm:px-8 sm:py-4 sm:text-lg"
            >
              Start Exploring
            </Link>
            <Link 
              href="/login"
              className="relative inline-flex items-center justify-center px-6 py-3.5 text-base font-semibold text-gray-900 transition-all duration-300 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:shadow-md sm:px-8 sm:py-4 sm:text-lg"
            >
              Browse Activities
            </Link>
          </div>
        </div>

        {/* Activity Showcase - Responsive grid */}
        <div className="mt-16 max-w-5xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 p-6 shadow-xl md:p-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* Host Card */}
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-xl border border-indigo-100">
                <div className="w-12 h-12 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xl mb-4">
                  🎯
                </div>
                <h3 className="font-semibold text-lg text-gray-900 mb-2">Host an Activity</h3>
                <p className="text-gray-700 text-sm mb-4">Create your own plan and invite others to join</p>
                <button className="text-indigo-700 text-sm font-medium flex items-center">
                  Create a plan <span className="ml-1">→</span>
                </button>
              </div>
              
              {/* Join Card */}
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-6 rounded-xl border border-amber-100">
                <div className="w-12 h-12 rounded-lg bg-amber-600 flex items-center justify-center text-white text-xl mb-4">
                  👥
                </div>
                <h3 className="font-semibold text-lg text-gray-900 mb-2">Join Others</h3>
                <p className="text-gray-700 text-sm mb-4">Find activities that match your interests</p>
                <button className="text-amber-700 text-sm font-medium flex items-center">
                  Explore activities <span className="ml-1">→</span>
                </button>
              </div>
              
              {/* Experience Card */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-100">
                <div className="w-12 h-12 rounded-lg bg-green-600 flex items-center justify-center text-white text-xl mb-4">
                  ✨
                </div>
                <h3 className="font-semibold text-lg text-gray-900 mb-2">Share Experiences</h3>
                <p className="text-gray-700 text-sm mb-4">Create memories with new people</p>
                <button className="text-green-700 text-sm font-medium flex items-center">
                  See experiences <span className="ml-1">→</span>
                </button>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="flex flex-wrap justify-center gap-4">
                {[
                  { emoji: '☕', label: 'Coffee' },
                  { emoji: '🏓', label: 'Pickleball' },
                  { emoji: '🍻', label: 'Breweries' },
                  { emoji: '🎨', label: 'Art Walks' },
                  { emoji: '🚶', label: 'Urban Hikes' },
                  { emoji: '🎲', label: 'Game Nights' }
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm">
                    <span>{item.emoji}</span>
                    <span className="font-medium text-gray-700">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== Activity Browser ===================== */}
      <section id="activities" className="py-16 bg-white sm:py-20">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">What's happening near you</h2>
            <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto sm:text-xl">
              Explore activities you can join right now in Denver neighborhoods
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                emoji: '☕',
                title: 'Coffee & Cowork',
                time: 'Today • 10:00 AM',
                location: 'Thump Coffee • RiNo',
                attendees: 4,
                status: 'Open'
              },
              {
                emoji: '🏓',
                title: 'Pickleball Social',
                time: 'Today • 5:30 PM',
                location: 'Central Park Courts',
                attendees: 6,
                status: 'Almost full'
              },
              {
                emoji: '🍻',
                title: 'Brewery Hangout',
                time: 'Tomorrow • 7:00 PM',
                location: 'Ratio Beerworks',
                attendees: 3,
                status: 'Open'
              },
              {
                emoji: '🎨',
                title: 'First Friday Art Walk',
                time: 'Fri • 6:00 PM',
                location: 'Santa Fe Arts District',
                attendees: 8,
                status: 'Open'
              },
              {
                emoji: '🚶',
                title: 'City Park Walk',
                time: 'Sat • 9:00 AM',
                location: 'City Park • Five Points',
                attendees: 5,
                status: 'Open'
              },
              {
                emoji: '🎲',
                title: 'Board Game Night',
                time: 'Sat • 6:30 PM',
                location: 'The Wizards Chest',
                attendees: 7,
                status: 'Almost full'
              }
            ].map((activity, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-xl">
                    {activity.emoji}
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    activity.status === 'Open' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {activity.status}
                  </span>
                </div>
                
                <h3 className="font-semibold text-gray-900 mb-2">{activity.title}</h3>
                <p className="text-sm text-gray-600 mb-1">{activity.time}</p>
                <p className="text-sm text-gray-600 mb-4">{activity.location}</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white"></div>
                      ))}
                    </div>
                    <span className="text-xs text-gray-500 ml-2">
                      +{activity.attendees} going
                    </span>
                  </div>
                  
                  <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
                    Join
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-10 text-center">
            <Link 
              href="/login" 
              className="inline-flex items-center text-indigo-600 hover:text-indigo-700 font-medium"
            >
              See all activities
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ===================== How It Works ===================== */}
      <section id="how" className="py-16 bg-gradient-to-b from-white to-gray-50 sm:py-20">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Plan → Chat → Meet & Experience</h2>
            <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto sm:text-xl">
              Our simple process helps you find activities and connect with people who share your interests
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-2xl mb-6">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Plan or Find</h3>
              <p className="text-gray-600">
                Create your own activity or browse existing plans in your neighborhood. Set clear details about what, when, and where.
              </p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-2xl mb-6">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Chat & Connect</h3>
              <p className="text-gray-600">
                Once you join or host, chat with attendees to coordinate details, ask questions, and get to know each other.
              </p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-2xl mb-6">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Meet & Experience</h3>
              <p className="text-gray-600">
                Show up and enjoy the activity together. Create memories and build connections through shared experiences.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== Popular Categories ===================== */}
      <section id="niches" className="py-16 bg-white sm:py-20">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Popular Categories</h2>
            <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto sm:text-xl">
              Explore activities by category to find what interests you most
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
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
              <div key={index} className="flex flex-col items-center p-4 bg-gray-50 rounded-xl hover:bg-indigo-50 transition-colors cursor-pointer">
                <div className="text-2xl mb-2">{item.emoji}</div>
                <span className="text-sm font-medium text-gray-700 text-center">{item.label}</span>
              </div>
            ))}
          </div>
          
          <div className="mt-10 text-center">
            <Link 
              href="/login" 
              className="inline-flex items-center text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Explore all categories
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ===================== Hosting Section ===================== */}
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white sm:py-20">
        <div className="max-w-6xl mx-auto px-5">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Can't find what you're looking for?</h2>
              <p className="mt-4 text-lg text-gray-600 sm:text-xl">
                Host your own activity and invite others to join. Whether it's a coffee meetup, hiking group, or game night - create the experience you want to have.
              </p>
              
              <div className="mt-8 space-y-4">
                <div className="flex items-center">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mr-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700">Set your own time and location</span>
                </div>
                
                <div className="flex items-center">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mr-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700">Define the activity details</span>
                </div>
                
                <div className="flex items-center">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mr-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700">Invite others to join you</span>
                </div>
              </div>
              
              <div className="mt-8">
                <Link 
                  href="/signup" 
                  className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Create your activity
                </Link>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="bg-indigo-50 p-4 rounded-lg mb-6">
                <h3 className="font-semibold text-indigo-900 mb-2">Activity Idea: Coffee & Cowork</h3>
                <p className="text-sm text-indigo-700">Bring your laptop and join others for focused work sessions with coffee breaks</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Activity Type</label>
                  <div className="flex flex-wrap gap-2">
                    {['☕ Coffee', '💻 Coworking', '📚 Study Group'].map(tag => (
                      <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <p className="text-sm text-gray-600">Casual coworking session at Thump Coffee. Bring your laptop, we'll take coffee breaks together.</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">When</label>
                    <p className="text-sm text-gray-600">Tomorrow, 10AM</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Where</label>
                    <p className="text-sm text-gray-600">Thump Coffee, RiNo</p>
                  </div>
                </div>
                
                <button className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                  Create This Activity
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== Final CTA ===================== */}
      <section className="py-16 bg-white sm:py-20">
        <div className="max-w-4xl mx-auto px-5 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Ready to find your next activity?
          </h2>
          <p className="mt-4 text-lg text-gray-600 sm:text-xl">
            Join the Denver community and discover what's happening right now.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:mt-10">
            <Link 
              href="/signup" 
              className="relative inline-flex items-center justify-center px-6 py-3.5 text-base font-semibold text-white transition-all duration-300 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl hover:from-indigo-700 hover:to-indigo-800 hover:shadow-xl hover:-translate-y-0.5 sm:px-8 sm:py-4 sm:text-lg"
            >
              Get Started
            </Link>
            <Link 
              href="/login"
              className="relative inline-flex items-center justify-center px-6 py-3.5 text-base font-semibold text-gray-900 transition-all duration-300 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:shadow-md sm:px-8 sm:py-4 sm:text-lg"
            >
              Browse Activities
            </Link>
          </div>
        </div>
      </section>

      {/* ========================= Footer ======================== */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-5 py-10 sm:py-12">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="text-center md:text-left">
              <p className="text-base font-semibold text-gray-900 sm:text-lg">Nowio</p>
              <p className="mt-1 text-xs text-gray-500 sm:mt-2 sm:text-sm">
                Find what to do and who to do it with • © {new Date().getFullYear()}
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-4 text-xs sm:text-sm sm:gap-6">
              <a href="mailto:hello@nowio.app" className="text-gray-500 hover:text-gray-700">Contact</a>
              <Link href="/terms" className="text-gray-500 hover:text-gray-700">Terms</Link>
              <Link href="/privacy" className="text-gray-500 hover:text-gray-700">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}