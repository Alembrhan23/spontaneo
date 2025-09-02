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

  // Force final destination
  const FINAL = new URL('/discover', url.origin)

  // Create the redirect response up front; we'll attach cookies to *this* response.
  const res = NextResponse.redirect(FINAL)
  res.headers.set('Cache-Control', 'no-store')

  // Read from incoming cookies, WRITE to the response we’re returning.
  const store = cookies()
  const SUPABASE_URL = env('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL')
  const SUPABASE_ANON_KEY = env('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY')

  // If envs are missing, still redirect (but there won’t be a session).
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return res

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get: (name) => store.get(name)?.value,
      set: (name, value, options) => res.cookies.set({ name, value, ...options }),
      remove: (name, options) =>
        res.cookies.set({ name, value: '', ...options, expires: new Date(0) }),
    },
  })

  try {
    // Exchange ?code=... and set sb-access-token/sb-refresh-token on the redirect response.
    await supabase.auth.exchangeCodeForSession(req.url)
  } catch {
    // ignore errors; we still send user to /discover
  }

  return res
}
