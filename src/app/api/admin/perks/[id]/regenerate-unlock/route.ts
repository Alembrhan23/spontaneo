// Regenerate staff_unlock_token (admin only)
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { createClient as createAdmin } from "@supabase/supabase-js"
import crypto from "crypto"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function token() {
  return crypto.randomBytes(18).toString("base64url")
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const cookieStore = await cookies()
  const supa = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (n) => cookieStore.get(n)?.value,
        set: (n, v, o: any) => cookieStore.set({ name: n, value: v, ...o }),
        remove: (n, o: any) => cookieStore.set({ name: n, value: "", ...o }),
      },
    }
  )

  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  const { data: profile } = await supa.from("profiles").select("is_admin").eq("id", user.id).maybeSingle()
  if (!profile?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const newToken = token()
  const { data, error } = await admin
    .from("plan_perks")
    .update({ staff_unlock_token: newToken })
    .eq("id", params.id)
    .select("id, staff_unlock_token")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, staff_unlock_token: data.staff_unlock_token })
}
