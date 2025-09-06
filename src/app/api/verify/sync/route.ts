export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import Stripe from 'stripe'
import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

/** Stripe (Node runtime only) */
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('Missing STRIPE_SECRET_KEY')
  return new Stripe(key, { apiVersion: '2024-06-20' })
}

/** Supabase Admin – used for DB reads/writes that the user should NOT be able to do */
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const srv = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !srv) throw new Error('Missing Supabase admin envs')
  return createSupabaseAdmin(url, srv, { auth: { persistSession: false, autoRefreshToken: false } })
}

/** Supabase SSR client – reads the logged-in user from cookies (modern App Router pattern) */
function getSupabaseSSR() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY')

  const store = cookies()
  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return store.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        // Route Handlers may set cookies; keep API compatible with SSR helper
        store.set({ name, value, ...options })
      },
      remove(name: string, options: any) {
        store.delete({ name, ...options })
      },
    },
  })
}

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()

    // 1) Try to identify the user via modern SSR cookie-based session
    const supabaseSSR = getSupabaseSSR()
    let { data: { user } } = await supabaseSSR.auth.getUser()
    let userId = user?.id as string | undefined

    // 2) Fallback: Authorization: Bearer <access_token>
    if (!userId) {
      const auth = (req.headers.get('authorization') || '').trim()
      if (auth.toLowerCase().startsWith('bearer ')) {
        const token = auth.slice(7).trim()
        try {
          const { data } = await supabaseAdmin.auth.getUser(token)
          userId = data.user?.id
        } catch { /* ignore */ }
        if (!userId) {
          try {
            const parts = token.split('.')
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'))
            userId = payload?.sub
          } catch { /* ignore */ }
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 3) Get the profile’s last verification session id (admin client, no RLS issues)
    const { data: prof } = await supabaseAdmin
      .from('profiles')
      .select('stripe_verification_session_id, is_verified, verification_status')
      .eq('id', userId)
      .maybeSingle()

    const current = {
      is_verified: !!prof?.is_verified,
      verification_status: (prof?.verification_status as string) || null,
    }

    const sessionId = prof?.stripe_verification_session_id as string | undefined
    if (!sessionId) {
      // Nothing to sync; return current state
      return NextResponse.json(current)
    }

    // 4) Ask Stripe for the latest status, then upsert to Supabase (admin)
    const stripe = getStripe()
    const vs = await stripe.identity.verificationSessions.retrieve(sessionId)

    if (vs.status === 'verified') {
      await supabaseAdmin
        .from('profiles')
        .update({
          is_verified: true,
          verification_status: 'verified',
          verified_at: new Date().toISOString(),
        })
        .eq('id', userId)

      return NextResponse.json({ is_verified: true, verification_status: 'verified' })
    }

    if (vs.status === 'requires_input') {
      await supabaseAdmin.from('profiles').update({ verification_status: 'requires_input' }).eq('id', userId)
      return NextResponse.json({ is_verified: current.is_verified, verification_status: 'requires_input' })
    }

    if (vs.status === 'canceled') {
      await supabaseAdmin.from('profiles').update({ verification_status: 'canceled' }).eq('id', userId)
      return NextResponse.json({ is_verified: current.is_verified, verification_status: 'canceled' })
    }

    // processing / other
    await supabaseAdmin.from('profiles').update({ verification_status: 'processing' }).eq('id', userId)
    return NextResponse.json({ is_verified: current.is_verified, verification_status: 'processing' })
  } catch (err) {
    console.error('Sync verification error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
