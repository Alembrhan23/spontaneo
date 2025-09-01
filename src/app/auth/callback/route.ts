import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const next = url.searchParams.get('next') || '/discover'
  const type = (url.searchParams.get('type') || '').toLowerCase()

  // Decide where we want to end up FIRST and create the response up front.
  const target =
    type === 'recovery' ? '/reset' :
    type === 'signup'   ? `/login?verified=1&next=${encodeURIComponent(next)}` :
    next

  const res = NextResponse.redirect(new URL(target, url.origin))
  res.headers.set('Cache-Control', 'no-store')

  // Use the cookies() store for reading,
  // but WRITE cookies on the Response we are returning (res.cookies.set).
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: (name, value, options) => res.cookies.set({ name, value, ...options }),
        remove: (name, options) =>
          res.cookies.set({ name, value: '', ...options, expires: new Date(0) }),
      },
    }
  )

  try {
    // This will set the auth cookies on *res* via the adapter above
    await supabase.auth.exchangeCodeForSession(req.url)
  } catch {
    // ignore — we still redirect to target
  }

  if (type === 'signup') {
    try { await supabase.auth.signOut() } catch {}
  }

  return res
}
