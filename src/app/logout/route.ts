// app/auth/signout/route.ts
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(_req: NextRequest) {
  const supabase = await createClient()   // 👈 await the async helper
  try {
    await supabase.auth.signOut()
  } catch {
    // ignore; we still redirect and cookies are cleared via the helper's cookies()
  }

  const redirectTo = new URL('/', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000')
  return NextResponse.redirect(redirectTo, 303) // 👈 303 prevents re-POST on refresh
}
