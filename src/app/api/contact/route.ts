import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // ok w/ RLS policy above
)

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const name = String(form.get('name') || '').trim()
    const email = String(form.get('email') || '').trim()
    const message = String(form.get('message') || '').trim()

    // Honeypot (optional)
    const company = String(form.get('company') || '').trim()
    if (company) {
      // Bot likely; pretend success
      return NextResponse.redirect(new URL('/contact?sent=1', req.url))
    }

    if (!name || !email || !message) {
      return NextResponse.redirect(new URL('/contact?sent=0', req.url))
    }

    const { error } = await supabase.from('contact_messages').insert({ name, email, message })
    if (error) throw error

    return NextResponse.redirect(new URL('/contact?sent=1', req.url))
  } catch {
    return NextResponse.redirect(new URL('/contact?sent=0', req.url))
  }
}
