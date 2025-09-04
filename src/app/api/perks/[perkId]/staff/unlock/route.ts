// app/api/perks/[perkId]/staff/unlock/route.ts
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import crypto from "crypto"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const COOKIE_NAME = "nowio_staff_session"

function makeSession(perkId: string, minutes = 120) {
  const secret = process.env.STAFF_SESSION_SECRET!
  const exp = Math.floor(Date.now() / 1000) + minutes * 60
  const raw = `${perkId}.${exp}`
  const sig = crypto.createHmac("sha256", secret).update(raw).digest("base64url")
  return `${raw}.${sig}`
}

export async function GET(
  req: NextRequest,
  { params }: { params: { perkId: string } }
) {
  // Modern SSR: create a server client bound to request cookies
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: any) =>
          cookieStore.set({ name, value, ...options }),
        remove: (name: string, options: any) =>
          cookieStore.set({ name, value: "", ...options }),
      },
    }
  )

  const t = req.nextUrl.searchParams.get("t") ?? ""

  // Public read of the perk row (RLS policy: allow select on plan_perks)
  const { data: perk, error } = await supabase
    .from("plan_perks")
    .select("id, staff_unlock_token")
    .eq("id", params.perkId)
    .maybeSingle()

  if (error || !perk || !t || t !== perk.staff_unlock_token) {
    return new NextResponse("Invalid unlock", { status: 401 })
  }

  // Set a signed, short-lived staff session cookie, then send them to the scanner
  const token = makeSession(String(perk.id))
  const res = NextResponse.redirect(
    new URL(`/staff/${perk.id}/scan`, req.url)
  )
  res.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 120, // 2 hours
  })
  return res
}
