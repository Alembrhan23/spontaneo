export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse, NextRequest } from 'next/server'
import Stripe from 'stripe'
import { cookies } from 'next/headers'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('Missing STRIPE_SECRET_KEY')
  return new Stripe(key, { apiVersion: '2024-06-20' })
}
function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const srv = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !srv) throw new Error('Missing Supabase envs')
  return createSupabaseAdmin(url, srv, { auth: { persistSession: false, autoRefreshToken: false } })
}
function getAppUrl(req: NextRequest) {
  const fromEnv = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || '').trim()
  const base = fromEnv && /^https?:\/\//i.test(fromEnv) ? fromEnv : req.nextUrl.origin
  return base.replace(/\/$/, '')
}

export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 })
}

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getAdmin()

    // Prefer Authorization header; fallback to Supabase cookie
    let jwtToken: string | undefined
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
    if (authHeader?.toLowerCase().startsWith('bearer ')) jwtToken = authHeader.slice(7).trim()
    if (!jwtToken) {
      const store = await cookies()
      const any = store.getAll().find(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'))
      const raw = any?.value
      if (raw) {
        try {
          const json = raw.startsWith('base64-')
            ? JSON.parse(Buffer.from(raw.slice(7), 'base64').toString('utf8'))
            : JSON.parse(raw)
          jwtToken = json?.access_token
        } catch {}
      }
    }
    if (!jwtToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let userId: string | undefined
    try {
      const { data } = await supabaseAdmin.auth.getUser(jwtToken)
      userId = data.user?.id
    } catch {}
    if (!userId) {
      try {
        const parts = jwtToken.split('.')
        userId = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'))?.sub
      } catch {}
    }
    if (!userId) return NextResponse.json({ error: 'Unauthorized - cannot resolve user' }, { status: 401 })

    const appUrl = getAppUrl(req)

    const stripe = getStripe()
    const session = await stripe.identity.verificationSessions.create({
      type: 'document',
      metadata: { userId },
      return_url: `${appUrl}/verification/callback`,
      options: { document: { require_live_capture: true, require_matching_selfie: true } },
    })

    // store session id + set status to processing
    await supabaseAdmin
      .from('profiles')
      .update({
        stripe_verification_session_id: session.id,
        verification_status: 'processing',
      })
      .eq('id', userId)

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Verification error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
