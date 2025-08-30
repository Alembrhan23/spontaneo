// app/r/[slug]/route.ts
export const runtime = 'nodejs'          // ensure Node env
export const dynamic = 'force-dynamic'   // but note: this doesn't stop module eval

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// create the client ONLY when handling a request
function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null // don't throw at build time
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const slug = (params.slug || '').toLowerCase()
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://nowio.app'
  let dest = base

  try {
    const supabase = getAdmin()
    if (supabase) {
      // 1) look up destination
      const { data } = await supabase
        .from('qr_links')
        .select('destination')
        .eq('slug', slug)
        .maybeSingle()
      if (data?.destination) dest = data.destination

      // 2) best-effort scan log (never block)
      await supabase.from('qr_scans').insert({
        slug,
        ua: req.headers.get('user-agent'),
        referer: req.headers.get('referer'),
        ip: (req.headers.get('x-forwarded-for') || '').split(',')[0]?.trim(),
        country: req.headers.get('x-vercel-ip-country') || null,
      })
    }
  } catch {
    // swallow errors — still redirect
  }

  // 3) redirect
  return NextResponse.redirect(dest, 302)
}
