// src/app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const next = url.searchParams.get('next') || '/discover'
  const type = (url.searchParams.get('type') || '').toLowerCase()

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: (name, value, options) => cookieStore.set({ name, value, ...options }),
        remove: (name, options) =>
          cookieStore.set({ name, value: '', ...options, expires: new Date(0) }),
      },
    }
  )

  // Exchange the auth code in the URL for a session (sets cookies)
  try {
    await supabase.auth.exchangeCodeForSession(request.url)
  } catch {
    // swallow; we'll still continue with redirects below
  }

  if (type === 'signup') {
    await supabase.auth.signOut()
    const loginUrl = new URL('/login', url.origin)
    loginUrl.searchParams.set('verified', '1')
    loginUrl.searchParams.set('next', next)
    return NextResponse.redirect(loginUrl)
  }

  if (type === 'recovery') {
    return NextResponse.redirect(new URL('/reset', url.origin))
  }

  return NextResponse.redirect(new URL(next, url.origin))
}
