import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic' // always run on server

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const slug = (params.slug || '').toLowerCase()

  // 1) look up destination
  let dest = process.env.NEXT_PUBLIC_SITE_URL || 'https://nowio.app'
  try {
    const { data } = await supabase
      .from('qr_links')
      .select('destination')
      .eq('slug', slug)
      .maybeSingle()
    if (data?.destination) dest = data.destination
  } catch {}

  // 2) log the scan (best-effort, never block)
  try {
    await supabase.from('qr_scans').insert({
      slug,
      ua: req.headers.get('user-agent'),
      referer: req.headers.get('referer'),
      ip: (req.headers.get('x-forwarded-for') || '').split(',')[0]?.trim(),
      country: req.headers.get('x-vercel-ip-country') || null
    })
  } catch {}

  // 3) redirect to the real page
  return NextResponse.redirect(dest, 302)
}
