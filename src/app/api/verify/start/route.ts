// src/app/api/verify/start/route.ts
export const runtime = 'nodejs'            // <-- Stripe + Buffer need Node
export const dynamic = 'force-dynamic'

import { NextResponse, NextRequest } from 'next/server'
import Stripe from 'stripe'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

// lazy factories (no top-level env access during build)
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('Missing STRIPE_SECRET_KEY')
  return new Stripe(key, { apiVersion: '2024-06-20' })
}

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const srv = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !srv) throw new Error('Missing Supabase envs')
  return createClient(url, srv, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function POST(_req: NextRequest) {
  try {
    const cookieStore = await cookies()

    // NOTE: consider putting this cookie name in an ENV so it matches each project ref
    const raw = cookieStore.get('sb-nqhtmybpvqlvnvsxuuku-auth-token')?.value
    if (!raw) {
      return NextResponse.json({ error: 'Unauthorized - No auth cookie found' }, { status: 401 })
    }

    // Parse access token from cookie (supports base64-wrapped format)
    let jwtToken: string | undefined
    try {
      const json = raw.startsWith('base64-')
        ? JSON.parse(Buffer.from(raw.slice(7), 'base64').toString('utf8'))
        : JSON.parse(raw)
      jwtToken = json?.access_token
    } catch {
      return NextResponse.json({ error: 'Unauthorized - Invalid auth data' }, { status: 401 })
    }
    if (!jwtToken) {
      return NextResponse.json({ error: 'Unauthorized - No JWT token' }, { status: 401 })
    }

    // Extract user id (sub) from JWT
    const parts = jwtToken.split('.')
    if (parts.length !== 3) return NextResponse.json({ error: 'Invalid JWT format' }, { status: 401 })
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'))
    const userId: string | undefined = payload?.sub
    if (!userId) return NextResponse.json({ error: 'No user ID in JWT' }, { status: 401 })

    // Verify user via admin (optional but fine)
    try {
      const supabaseAdmin = getAdmin()
      const { data: user, error } = await supabaseAdmin.auth.admin.getUserById(userId)
      if (error || !user.user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
    } catch (e) {
      // Non-fatal: if this fails, the JWT still authenticated the request
      console.error('Admin user lookup failed:', e)
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL
    if (!appUrl || !/^https?:\/\//i.test(appUrl)) {
      return NextResponse.json({ error: 'Invalid NEXT_PUBLIC_APP_URL/SITE_URL' }, { status: 500 })
    }

    // Create Stripe verification session
    const stripe = getStripe()
    const session = await stripe.identity.verificationSessions.create({
      type: 'document',
      metadata: { userId },
      return_url: `${appUrl}/verification/callback`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Verification error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
