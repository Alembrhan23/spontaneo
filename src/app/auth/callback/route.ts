// src/app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function envOrThrow(nameA: string, nameB?: string) {
  const v = process.env[nameA] ?? (nameB ? process.env[nameB] : undefined)
  if (!v) throw new Error(`Missing env: ${nameA}${nameB ? ` or ${nameB}` : ''}`)
  return v
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const next = url.searchParams.get('next') || '/discover'
  const type = (url.searchParams.get('type') || '').toLowerCase()

  // Decide final target first
  const target =
    type === 'recovery' ? '/reset' :
    type === 'signup'   ? `/login?verified=1&next=${encodeURIComponent(next)}` :
    next

  // Create the redirect response up front — we will attach cookies to *this* response.
  const res = NextResponse.redirect(new URL(target, url.origin))
  res.headers.set('Cache-Control', 'no-store')

  // Read cookies from the incoming request, but WRITE on the response we return.
  const store = cookies()

  // Accept either NEXT_PUBLIC_* or server-only SUPABASE_* names
  const SUPABASE_URL = envOrThrow('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL')
  const SUPABASE_ANON_KEY = envOrThrow('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY')

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get: (name) => store.get(name)?.value,
      set: (name, value, options) => res.cookies.set({ name, value, ...options }),
      remove: (name, options) =>
        res.cookies.set({ name, value: '', ...options, expires: new Date(0) }),
    },
  })

  try {
    // Exchanges ?code=... and sets auth cookies on `res`
    await supabase.auth.exchangeCodeForSession(req.url)
  } catch {
    // ignore — we still send the user onward
  }

  // Optional: if verifying after signup, end the session and send them to /login
  if (type === 'signup') {
    try { await supabase.auth.signOut() } catch {}
  }

  return res
}
