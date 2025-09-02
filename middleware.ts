import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PROTECTED = ['/discover','/happening','/plans','/neighborhood','/create','/activities','/activity','/verify','/profile','/admin']

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/auth/callback')) return NextResponse.next()

  const res = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (n) => req.cookies.get(n)?.value,
        set: (n, v, opt) => res.cookies.set({ name: n, value: v, ...opt }),
        remove: (n, opt) => res.cookies.set({ name: n, value: '', ...opt, expires: new Date(0) }),
      },
    }
  )

  const { pathname, search } = req.nextUrl
  const publicRoute =
    pathname === '/' || pathname === '/login' || pathname === '/signup' || pathname === '/reset' ||
    pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.startsWith('/images') ||
    pathname.startsWith('/assets') || pathname === '/robots.txt' || pathname === '/sitemap.xml' || pathname === '/manifest.webmanifest'

  if (publicRoute) return res

  const { data: { user } } = await supabase.auth.getUser()

  if (PROTECTED.some(p => pathname.startsWith(p)) && !user) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname + search)
    return NextResponse.redirect(url)
  }

  if (pathname.startsWith('/admin') && user) {
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
    if (!profile?.is_admin) return NextResponse.redirect(new URL('/not-authorized', req.url))
  }

  if (user && (pathname === '/login' || pathname === '/signup')) {
    const url = req.nextUrl.clone()
    url.pathname = '/discover'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|auth/callback).*)',
  ],
}
