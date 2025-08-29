// middleware.ts (project root)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Routes that need an authenticated user
const PROTECTED_PREFIXES = [
  '/discover',
  '/happening',
  '/plans',
  '/neighborhood',
  '/create',
  '/activities',
  '/activity',
  '/verify',
  '/profile',
  '/admin', // we also role-check below
]

export async function middleware(req: NextRequest) {
  // Always create a response we can mutate; Supabase will update cookies on it
  const res = NextResponse.next()

  // ✅ Use createServerClient in middleware with a cookies adapter for req/res
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          // persist any refreshed session cookies on the response
          res.cookies.set({ name, value, ...options })
        },
        remove(name: string, _options: any) {
          res.cookies.delete(name)
        },
      },
    }
  )

  const { pathname } = req.nextUrl

  // Public routes (bypass)
  const isPublic =
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/assets') ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/manifest.webmanifest'

  if (isPublic) return res

  // Refresh session (and set any updated cookies on `res`)
  const { data: { user } } = await supabase.auth.getUser()

  // Require auth for protected paths
  const needsAuth = PROTECTED_PREFIXES.some(p => pathname.startsWith(p))
  if (needsAuth && !user) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Optional: hard-gate /admin by role (you already gate again in /admin layout)
  if (pathname.startsWith('/admin') && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.redirect(new URL('/not-authorized', req.url))
    }
  }

  // Keep logged-in users out of auth pages
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const url = req.nextUrl.clone()
    url.pathname = '/discover'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return res
}

// Apply to everything except static assets
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest).*)',
  ],
}
