// src/app/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { server } from '@/lib/supabase/server' // async server client

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0
export const runtime = 'nodejs'

export const metadata = {
  title: 'Nowio — Real people. Real plans. Right now.',
  description:
    'Tap to create or join casual micro-plans in Denver’s RiNo, LoHi, and Five Points. Coffee, walks, pickleball, brewery hangs and more. Join → chat → meet.',
}

export default async function Home() {
  // Logged-in users go straight to Discover
  const supabase = await server()
  const { data: { session } } = await supabase.auth.getSession()
  if (session) redirect('/discover')

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-white">
      {/* Soft background motion */}
      <div aria-hidden className="pointer-events-none absolute -top-40 -left-28 h-96 w-96 rounded-full bg-indigo-300/30 blur-3xl animate-[pulse_7s_ease-in-out_infinite]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 -right-28 h-96 w-96 rounded-full bg-sky-300/30 blur-3xl animate-[pulse_9s_ease-in-out_infinite]" />

      {/* ============================ Header ============================ */}
      <header className="sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-white/60 bg-white/90 border-b">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">⚡</span>
            Nowio
          </Link>
          <nav className="flex items-center gap-3">
            <a href="#how" className="nav-link">How it works</a>
            <a href="#niches" className="nav-link">Niches</a>
            <Link href="/login" className="ghost-btn">Log in</Link>
            <Link href="/signup" className="fancy-btn">Sign up</Link>
          </nav>
        </div>
      </header>

      {/* ============================ Hero ============================ */}
      <section className="mx-auto max-w-7xl px-6 pt-12 pb-10 md:pt-16">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-white/80 px-3 py-1 text-[11px] font-medium text-indigo-700 shadow-sm backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
            Denver beta • RiNo • LoHi • Five Points
          </div>

          <h1 className="mt-5 text-5xl sm:text-6xl font-extrabold tracking-tight text-gray-900">
            Real people. <span className="text-indigo-600">Real plans.</span>{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-sky-500 bg-clip-text text-transparent">Right now.</span>
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-gray-600 text-base sm:text-lg">
            Tap to join or start simple micro-plans nearby — coffee, walks, pickleball, brewery hangs and more.
            Join → chat → meet. No feeds. No FOMO. Just plans.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup" className="fancy-btn">Get started free</Link>
            <Link href="/login" className="ghost-btn">Browse plans</Link>
          </div>

          <div className="mt-7 flex flex-wrap justify-center gap-2 text-sm">
            {['☕ Coffee', '🏓 Pickleball', '🍻 Breweries', '🐕 Dog walks', '🎲 Trivia', '🖼️ Gallery hops'].map((c) => (
              <span key={c} className="chip">{c}</span>
            ))}
          </div>

          {/* App preview card */}
          <div className="mt-10 mx-auto w-full max-w-md">
            <div className="group relative rounded-3xl border border-gray-200 bg-white/90 p-4 shadow-md backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 rounded-3xl bg-gradient-to-r from-indigo-200/0 via-indigo-200/40 to-sky-200/0 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100" />
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-indigo-100 font-semibold text-indigo-700">AM</div>
                <div className="text-left leading-tight">
                  <div className="font-semibold">Casual Brewery Hang</div>
                  <div className="text-xs text-gray-400">Tonight • RiNo</div>
                </div>
                <span className="ml-auto rounded-full bg-pink-100 px-2 py-1 text-xs text-pink-600">🔥 Happening</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm text-gray-700">
                <div>🕠 6:30 PM</div>
                <div className="truncate">📍 Ratio Beerworks</div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" className="btn-primary">I’m In!</button>
                <button type="button" className="btn-secondary">💬 Chat</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================ How it works ============================ */}
      <section id="how" className="mx-auto max-w-7xl px-6 pb-14">
        <h2 className="text-center text-xl sm:text-2xl font-bold text-gray-900">How it works</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          <Step n={1} title="Pick a neighborhood" desc="Stay hyperlocal. Walk over in minutes." />
          <Step n={2} title="Create or join" desc="One-tap templates. Small groups. Clear times." />
          <Step n={3} title="Chat & meet" desc="Join unlocks chat. Align quickly and go." />
        </ol>
      </section>

      {/* ============================ Niches ============================ */}
      <section id="niches" className="mx-auto max-w-7xl px-6 pb-16">
        <h2 className="text-center text-xl sm:text-2xl font-bold text-gray-900">What people spin up</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ['☕ Coffee & co-work sprints', '60–90 minute focus bursts with neighbors.'],
            ['🍻 Brewery casuals', 'After-work hangs — first-timer friendly.'],
            ['🏓 Pickleball meetups', 'Beginners welcome. Rotate in.'],
            ['🐕 Dog walks', 'Welton St, Commons Park & more.'],
            ['🎲 Trivia warm-ups', 'Form a team in minutes.'],
            ['🖼️ Gallery hops', 'Street art + small galleries.'],
          ].map(([title, desc]) => (
            <div key={title} className="card">
              <div className="text-2xl">{title.split(' ')[0]}</div>
              <div>
                <div className="font-semibold">{title}</div>
                <div className="text-sm text-gray-600">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============================ Footer ============================ */}
      <footer className="border-t bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <div className="text-sm text-gray-500">
            Built with ❤️ in Denver • © {new Date().getFullYear()} Nowio
          </div>
          <div className="flex items-center gap-4 text-sm">
            <a href="mailto:hello@nowio.app" className="link">Contact</a>
            <Link href="/terms" className="link">Terms</Link>
            <Link href="/privacy" className="link">Privacy</Link>
          </div>
        </div>
      </footer>

      {/* ======= tiny style helpers (Tailwind utility compositions) ======= */}
      <style>{`
        .fancy-btn {
          position: relative; display:inline-flex; align-items:center; justify-content:center;
          gap:.5rem; border-radius:1rem; padding:.75rem 1.25rem; font-weight:600;
          color:white; background-image:linear-gradient(90deg,#4f46e5,#0ea5e9);
          box-shadow:0 8px 16px rgba(79,70,229,.18);
          transition:transform .15s ease, filter .2s ease, box-shadow .2s ease;
        }
        .fancy-btn:hover { filter:saturate(1.3); box-shadow:0 12px 22px rgba(79,70,229,.24); transform:translateY(-1px) }
        .fancy-btn:active { transform:translateY(0) }
        .ghost-btn {
          display:inline-flex; align-items:center; justify-content:center; gap:.5rem;
          border-radius:1rem; padding:.75rem 1.25rem; font-weight:600; color:#4338ca;
          background:#fff; border:1px solid rgba(67,56,202,.25); box-shadow:0 2px 8px rgba(0,0,0,.04);
          transition:transform .15s ease, box-shadow .2s ease, background .2s ease, border-color .2s ease;
        }
        .ghost-btn:hover { transform:translateY(-1px); background:#eef2ff; border-color:rgba(67,56,202,.35); box-shadow:0 8px 16px rgba(0,0,0,.08) }
        .nav-link { padding:.4rem .6rem; border-radius:.75rem; color:#374151; transition:background .2s ease }
        .nav-link:hover { background:#f3f4f6 }
        .chip {
          border-radius:9999px; border:1px solid #e5e7eb; background:#fff; padding:.25rem .75rem;
          box-shadow:0 1px 2px rgba(0,0,0,.04); transition:transform .15s ease, box-shadow .2s ease;
        }
        .chip:hover { transform:translateY(-2px); box-shadow:0 6px 14px rgba(0,0,0,.08) }
        .btn-primary {
          position:relative; overflow:hidden; border-radius:0.75rem; background:linear-gradient(90deg,#4f46e5,#0ea5e9);
          color:white; font-weight:600; padding:.5rem 0; box-shadow:0 6px 14px rgba(79,70,229,.22);
          transition:transform .15s ease, box-shadow .2s ease, filter .2s ease;
        }
        .btn-primary:hover { transform:translateY(-1px); filter:saturate(1.25); box-shadow:0 10px 18px rgba(79,70,229,.28) }
        .btn-secondary {
          border-radius:0.75rem; border:1px solid rgba(67,56,202,.25); background:#fff; color:#4338ca;
          font-weight:600; padding:.5rem 0; box-shadow:0 2px 8px rgba(0,0,0,.04);
          transition:transform .15s ease, box-shadow .2s ease, background .2s ease, border-color .2s ease;
        }
        .btn-secondary:hover { transform:translateY(-1px); background:#eef2ff; border-color:rgba(67,56,202,.35); box-shadow:0 8px 16px rgba(0,0,0,.08) }
        .card {
          display:flex; gap:.75rem; align-items:flex-start; border-radius:1rem; background:#fff; padding:1.25rem;
          border:1px solid #e5e7eb; box-shadow:0 4px 12px rgba(0,0,0,.06); transition:transform .15s ease, box-shadow .2s ease;
        }
        .card:hover { transform:translateY(-2px); box-shadow:0 10px 20px rgba(0,0,0,.08) }
      `}</style>
    </main>
  )
}

/* ---------- tiny presentational helper (no client hooks) ---------- */
function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <li className="rounded-2xl border bg-white p-5 shadow">
      <div className="flex items-center gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-indigo-600 text-white font-semibold">{n}</span>
        <div className="font-semibold">{title}</div>
      </div>
      <p className="mt-2 text-sm text-gray-600">{desc}</p>
    </li>
  )
}
