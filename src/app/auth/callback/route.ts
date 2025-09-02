// src/app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function env(nameA: string, nameB?: string) {
  return process.env[nameA] ?? (nameB ? process.env[nameB] : undefined)
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const next = url.searchParams.get('next') || '/discover'
  const type = (url.searchParams.get('type') || '').toLowerCase()

  // Decide target first
  const target =
    type === 'recovery' ? '/reset' :
    type === 'signup'   ? `/login?verified=1&next=${encodeURIComponent(next)}` :
    next

  // IMPORTANT: attach cookies to THIS response
  const res = NextResponse.redirect(new URL(target, url.origin))
  res.headers.set('Cache-Control', 'no-store')

  const store = cookies()
  const SUPABASE_URL = env('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL')
  const SUPABASE_ANON_KEY = env('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY')
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    // still redirect, but without session if envs missing
    return res
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get: (name) => store.get(name)?.value,
      set: (name, value, options) => res.cookies.set({ name, value, ...options }),
      remove: (name, options) =>
        res.cookies.set({ name, value: '', ...options, expires: new Date(0) }),
    },
  })

  try {
    // sets sb-access-token / sb-refresh-token on `res`
    await supabase.auth.exchangeCodeForSession(req.url)
  } catch {
    // ignore; still redirect
  }

  if (type === 'signup') {
    try { await supabase.auth.signOut() } catch {}
  }

  return res
}
