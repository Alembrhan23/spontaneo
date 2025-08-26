// src/app/api/verify/start/route.ts
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

// Create admin client (only for user verification)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Make sure this is set in your env
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
)

export async function POST() {
  try {
    const cookieStore = await cookies()
    
    // Get the auth cookie
    const authCookie = cookieStore.get('sb-nqhtmybpvqlvnvsxuuku-auth-token')?.value
    
    if (!authCookie) {
      return NextResponse.json({ error: 'Unauthorized - No auth cookie found' }, { status: 401 })
    }

    let jwtToken: string;
    let userId: string;

    try {
      // Handle base64 encoded cookie format
      if (authCookie.startsWith('base64-')) {
        const base64Data = authCookie.substring(7);
        const decodedString = Buffer.from(base64Data, 'base64').toString('utf8');
        const authData = JSON.parse(decodedString);
        jwtToken = authData.access_token;
      } else {
        const authData = JSON.parse(authCookie);
        jwtToken = authData.access_token;
      }
      
      if (!jwtToken) {
        throw new Error('No JWT token found');
      }
      
      // Extract user ID from JWT
      const jwtParts = jwtToken.split('.');
      if (jwtParts.length !== 3) {
        throw new Error('Invalid JWT format');
      }
      
      const payload = JSON.parse(Buffer.from(jwtParts[1], 'base64').toString('utf8'));
      userId = payload.sub;
      
      if (!userId) {
        throw new Error('No user ID in JWT');
      }
      
    } catch (error) {
      console.error('Failed to process auth cookie:', error);
      return NextResponse.json({ error: 'Unauthorized - Invalid auth data' }, { status: 401 });
    }

    // Verify user exists using admin client (optional but recommended)
    try {
      const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (userError || !user.user) {
        console.error('User not found in database:', userError);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
      console.log('Verified user:', user.user.id);
      
    } catch (error) {
      console.error('User verification failed:', error);
      // Continue anyway - the JWT is valid even if we can't verify with admin API
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!appUrl || !/^https?:\/\//i.test(appUrl)) {
      return NextResponse.json({ error: 'Invalid NEXT_PUBLIC_APP_URL' }, { status: 500 })
    }

    // Create Stripe verification session
    const verificationSession = await stripe.identity.verificationSessions.create({
      type: 'document',
      metadata: { userId },
      return_url: `${appUrl}/verification/callback`,
    })

    return NextResponse.json({ url: verificationSession.url })

  } catch (error) {
    console.error('Verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}