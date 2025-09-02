// src/app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function env(a: string, b?: string) {
  return process.env[a] ?? (b ? process.env[b] : undefined)
}

export async function GET(req: Request) {
  const url = new URL(req.url)

  // Force final destination
  const res = NextResponse.redirect(new URL('/discover', url.origin))
  res.headers.set('Cache-Control', 'no-store')

  // ✅ Next 15: cookies() is async
  const store = await cookies()

  const SUPABASE_URL = env('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL')
  const SUPABASE_ANON_KEY = env('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY')
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
    await supabase.auth.exchangeCodeForSession(req.url) // writes Set-Cookie onto `res`
  } catch {}

  return res
}
