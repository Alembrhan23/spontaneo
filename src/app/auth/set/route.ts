// app/auth/set/route.ts
import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function siteOrigin() {
  const u = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (!u) return null
  try { return new URL(u).origin } catch { return null }
}

export async function POST(req: NextRequest) {
  // Optional same-origin guard
  const allowed = siteOrigin()
  const origin = req.headers.get('origin')
  if (allowed && origin && origin !== allowed) {
    return NextResponse.json({ error: 'Bad origin' }, { status: 400 })
  }

  const { access_token, refresh_token } = await req.json().catch(() => ({} as any))
  if (!access_token || !refresh_token) {
    return NextResponse.json({ error: 'Missing tokens' }, { status: 400 })
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    return NextResponse.json({ error: 'Server misconfig: Supabase envs' }, { status: 500 })
  }

  // Build the response first so Set-Cookie is attached
  const res = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })

  const store = await cookies()
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      get: (name) => store.get(name)?.value,
      set: (name, value, options) =>
        res.cookies.set({
          name,
          value,
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production', // allow on localhost
          ...options,
        }),
      remove: (name, options) =>
        res.cookies.set({
          name,
          value: '',
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          expires: new Date(0),
          ...options,
        }),
    },
  })

  const { error } = await supabase.auth.setSession({ access_token, refresh_token })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return res
}
