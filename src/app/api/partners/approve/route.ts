import { NextResponse } from 'next/server'
import { server } from '@/lib/supabase/server'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const supaAdmin = createSupabaseAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type Body = { id?: string }

export async function POST(req: Request) {
  const supabase = await server()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = (await req.json()) as Body
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { data: sub, error: fetchErr } = await supaAdmin.from('partner_submissions').select('*').eq('id', id).single()
  if (fetchErr || !sub) return NextResponse.json({ error: fetchErr?.message || 'Not found' }, { status: 404 })

  const { data: biz, error: insErr } = await supaAdmin
    .from('businesses')
    .insert({
      name: sub.name,
      neighborhood: sub.neighborhood,
      category: sub.category,
      contact_name: sub.contact_name,
      contact_email: sub.contact_email,
      contact_phone: sub.contact_phone,
      incentive_offer: 'Free 30-day pilot + co-promo',
      status: 'onboarded',
    })
    .select('*')
    .single()
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

  const { error: upErr } = await supaAdmin
    .from('partner_submissions')
    .update({ status: 'approved', business_id: biz.id })
    .eq('id', id)
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, business: biz })
}
