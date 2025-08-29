'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import LocationAutocomplete from '@/components/LocationAutocomplete'

export default function SignupClient() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') || '/discover'

  const [fullName, setFullName] = useState('')
  const [address, setAddress]   = useState('')                 // displayed value
  const [adrLat, setAdrLat]     = useState<number | null>(null) // optional
  const [adrLng, setAdrLng]     = useState<number | null>(null) // optional
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [err, setErr]           = useState<string | null>(null)
  const [info, setInfo]         = useState<string | null>(null)

  async function signup(e: React.FormEvent) {
    e.preventDefault()
    setErr(null); setInfo(null); setLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            address,
            address_lat: adrLat ?? undefined,
            address_lng: adrLng ?? undefined,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
        },
      })
      if (error) throw error

      // If email confirmation is OFF we already have a session:
      if (data.session?.user?.id) {
        const uid = data.session.user.id
        await supabase
          .from('profiles')
          .upsert({ id: uid, full_name: fullName, address }, { onConflict: 'id' })
        setLoading(false)
        router.replace(next); router.refresh()
        return
      }

      // If confirmation is ON:
      setLoading(false)
      setInfo('We sent a confirmation link to your email. Please verify to finish creating your account.')
      setEmail(''); setPassword('')
    } catch (e: any) {
      setLoading(false)
      setErr(e?.message ?? 'Failed to sign up')
    }
  }

  return (
    <div className="min-h-[calc(100vh-56px)] grid place-items-center bg-gradient-to-b from-indigo-50/60 via-white to-white px-4">
      <form
        onSubmit={signup}
        className="w-full max-w-xl rounded-2xl border bg-white shadow-sm p-8 md:p-10"
      >
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 text-indigo-700 font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-white">⚡</span>
            Spontaneo
          </div>
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-900 text-center">
          Create your account
        </h1>
        <p className="mt-2 mb-6 text-zinc-600 text-center">
          Join neighbors and make simple plans that actually happen.
        </p>

        {err && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {err}
          </div>
        )}
        {info && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {info}
          </div>
        )}

        <div className="space-y-4">
          <label className="block">
            <span className="text-xs text-zinc-600">Full name</span>
            <input
              className="mt-1.5 w-full rounded-xl border bg-white px-3 py-3 text-[15px] outline-none focus:border-indigo-500"
              placeholder="Alex Morgan"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="text-xs text-zinc-600">Address</span>
            <div className="mt-1.5">
              <LocationAutocomplete
                value={address}
                placeholder="Start typing your address…"
                onSelect={({ name, lat, lng }) => {
                  setAddress(name)
                  setAdrLat(lat)
                  setAdrLng(lng)
                }}
                minChars={3}
              />
              <div className="mt-1 text-xs text-zinc-500">
                We use your area to suggest nearby plans. Exact address is never shown.
              </div>
            </div>
          </label>

          <label className="block">
            <span className="text-xs text-zinc-600">Email</span>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              className="mt-1.5 w-full rounded-xl border bg-white px-3 py-3 text-[15px] outline-none focus:border-indigo-500"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="text-xs text-zinc-600">Password</span>
            <input
              type="password"
              autoComplete="new-password"
              minLength={6}
              className="mt-1.5 w-full rounded-xl border bg-white px-3 py-3 text-[15px] outline-none focus:border-indigo-500"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <button
            disabled={loading}
            className="mt-2 w-full rounded-xl bg-indigo-600 py-3 text-white font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Creating…' : 'Sign up'}
          </button>
        </div>

        <div className="mt-6 text-sm text-center">
          Already have an account?{' '}
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-indigo-700 hover:underline">
            Log in
          </Link>
        </div>
      </form>
    </div>
  )
}
