import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const type = (url.searchParams.get('type') || '').toLowerCase()
  const next = url.searchParams.get('next') || '/discover'
  const supabase = createRouteHandlerClient({ cookies })

  if (code) {
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) throw error
    } catch { /* ignore */ }
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
