import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const slug = sp.get('slug')          // preferred
  const rawUrl = sp.get('url')         // optional
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://nowio.app'
  const url = slug ? `${base}/r/${slug}` : (rawUrl || base)

  const svg = await QRCode.toString(url, {
    type: 'svg',
    errorCorrectionLevel: 'Q',  // resilient for print
    margin: 2,                  // quiet zone
    scale: 8
  })

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  })
}
