'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth'
import {
  ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, LogIn, UserPlus
} from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const params = useSearchParams()
  const { user, loading } = useAuth()

  const next = params.get('next') || '/discover'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // If already logged in, bounce to Discover
  useEffect(() => {
    if (!loading && user) {
      router.replace('/discover')
      router.refresh()
    }
  }, [loading, user, router])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) { setErr(error.message); return }
    router.replace(next)
    router.refresh()
  }

  return (
    <div className="min-h-[calc(100vh-56px)] grid place-items-center bg-gradient-to-b from-indigo-50/60 via-white to-white">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6 px-4">
        {/* Brand / value prop (left) */}
        <div className="hidden md:block rounded-2xl border bg-white p-7 shadow-sm relative overflow-hidden">
          <div aria-hidden
               className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-indigo-300/30 blur-3xl" />
          <div className="flex items-center gap-2 text-sm text-indigo-700 font-semibold">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-600 text-white">⚡</span>
            Spontaneo
          </div>
          <h1 className="mt-6 text-3xl font-extrabold text-zinc-900 leading-tight">
            Welcome back.
          </h1>
          <p className="mt-2 text-zinc-600">
            Join or host micro-plans in minutes. Verified people, clear plans, fewer flakes.
          </p>

          <ul className="mt-6 space-y-3 text-sm text-zinc-700">
            <li className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 mt-0.5 text-emerald-600" />
              <span>Optional ID verification for trust.</span>
            </li>
            <li className="flex items-start gap-2">
              <Lock className="w-4 h-4 mt-0.5 text-indigo-600" />
              <span>Private chat unlocks after you join a plan.</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="w-4 h-4 mt-0.5 text-violet-600" />
              <span>RiNo • LoHi • Five Points (Denver beta)</span>
            </li>
          </ul>
        </div>

        {/* Sign-in card (right) */}
        <div className="rounded-2xl border bg-white p-6 md:p-7 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-xl font-bold">Log in</div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="hidden sm:inline">No account?</span>
              <Link
                href={`/signup?next=${encodeURIComponent(next)}`}
                className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-indigo-700 hover:bg-indigo-50"
              >
                <UserPlus className="w-3.5 h-3.5" /> Sign up
              </Link>
            </div>
          </div>

          {/* Error */}
          {err && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {err}
            </div>
          )}

          {/* Email/password */}
          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <label className="block">
              <span className="text-xs text-zinc-600">Email</span>
              <div className="mt-1.5 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  className="w-full rounded-xl border bg-white pl-10 pr-3 py-2.5 text-[15px] outline-none ring-0 focus:border-indigo-500"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </label>

            <label className="block">
              <span className="text-xs text-zinc-600">Password</span>
              <div className="mt-1.5 relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="w-full rounded-xl border bg-white pl-10 pr-10 py-2.5 text-[15px] outline-none ring-0 focus:border-indigo-500"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-zinc-100"
                >
                  {showPw ? <EyeOff className="w-4 h-4 text-zinc-500" /> : <Eye className="w-4 h-4 text-zinc-500" />}
                </button>
              </div>
            </label>

            <div className="flex items-center justify-between">
              <div />
              <Link href="/reset" className="text-sm text-indigo-700 hover:underline">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 text-white py-3 font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              {busy ? 'Logging in…' : 'Log in'}
            </button>
          </form>

          {/* Divider */}
          <div className="my-5 flex items-center gap-4">
            <div className="h-px flex-1 bg-zinc-200" />
            <span className="text-[11px] uppercase tracking-wider text-zinc-500">or</span>
            <div className="h-px flex-1 bg-zinc-200" />
          </div>

          {/* Social (optional; will error gracefully if not configured) */}
          <button
            type="button"
            onClick={async () => {
              setErr(null)
              setBusy(true)
              const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
              })
              setBusy(false)
              if (error) setErr(error.message)
            }}
            className="w-full rounded-xl border bg-white py-3 font-medium hover:bg-zinc-50"
          >
            Continue with Google
          </button>

          <p className="mt-6 text-xs text-zinc-500 text-center">
            By continuing, you agree to our{' '}
            <Link href="/terms" className="underline hover:text-zinc-700">Terms</Link> and{' '}
            <Link href="/privacy" className="underline hover:text-zinc-700">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  )
}
