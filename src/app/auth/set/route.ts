// src/app/auth/set/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const access_token: string | undefined = body?.access_token
  const refresh_token: string | undefined = body?.refresh_token

  if (!access_token || !refresh_token) {
    return NextResponse.json({ error: 'Missing tokens' }, { status: 400 })
  }

  // 1) Build the response FIRST so we can attach Set-Cookie to it
  const res = NextResponse.json({ ok: true })
  res.headers.set('Cache-Control', 'no-store')

  // 2) Next 15: cookies() is async
  const store = await cookies()

  // 3) Create a Supabase server client that READS from the request cookie store,
  //    but WRITES cookies on THIS response.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => store.get(name)?.value,
        set: (name, value, options) =>
          res.cookies.set({
            name,
            value,
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            ...options,
          }),
        remove: (name, options) =>
          res.cookies.set({
            name,
            value: '',
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            ...options,
            expires: new Date(0),
          }),
      },
    }
  )

  // 4) This call will now emit Set-Cookie on `res`
  const { error } = await supabase.auth.setSession({ access_token, refresh_token })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return res
}
