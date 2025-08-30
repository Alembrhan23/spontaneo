import { NextResponse } from 'next/server'
import { server } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { access_token, refresh_token } = await req.json() as {
      access_token?: string
      refresh_token?: string
    }

    if (!access_token || !refresh_token) {
      return NextResponse.json({ error: 'Missing tokens' }, { status: 400 })
    }

    const supabase = await server()
    const { error } = await supabase.auth.setSession({ access_token, refresh_token })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // Cookies are set via next/headers inside `server()`; just return OK.
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Bad request' }, { status: 400 })
  }
}
