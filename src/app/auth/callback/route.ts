// import { NextResponse } from 'next/server'
// import { cookies } from 'next/headers'
// import { createServerClient } from '@supabase/ssr'

// export const runtime = 'nodejs'
// export const dynamic = 'force-dynamic'
// export const revalidate = 0

// function env(a: string, b?: string) {
//   return process.env[a] ?? (b ? process.env[b] : undefined)
// }

// export async function GET(req: Request) {
//   const url = new URL(req.url)
//   const finalUrl = new URL('/discover', url.origin)

//   // Build the response FIRST; we will attach Set-Cookie onto this response
//   const res = NextResponse.redirect(finalUrl)
//   res.headers.set('Cache-Control', 'no-store')

//   // ✅ Next 15: cookies() is async
//   const store = await cookies()

//   const SUPABASE_URL = env('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL')
//   const SUPABASE_ANON_KEY = env('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY')
//   if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return res

//   const cookieBase = {
//     path: '/',
//     httpOnly: true as const,
//     secure: true as const,
//     sameSite: 'lax' as const,
//     // Explicit domain to be extra safe on apex (nowio.app)
//     domain: finalUrl.hostname,
//   }

//   const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
//     cookies: {
//       get: (name) => store.get(name)?.value,
//       // attach onto the SAME redirect response
//       set: (name, value, options) => res.cookies.set({ name, value, ...cookieBase, ...options }),
//       remove: (name, options) =>
//         res.cookies.set({ name, value: '', ...cookieBase, ...options, expires: new Date(0) }),
//     },
//   })

//   try {
//     // Exchanges ?code=... and writes sb cookies onto `res`
//     await supabase.auth.exchangeCodeForSession(req.url)
//   } catch {
//     // ignore; we still redirect
//   }

//   return res
// }
