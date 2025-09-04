// app/api/perks/redeem-by-token/route.ts
import { NextRequest, NextResponse } from "next/server"
import { createClient as createAdmin } from "@supabase/supabase-js"
import { verifyStaffCookie, STAFF_COOKIE_NAME } from "@/lib/staffSession"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, init?: number | ResponseInit) {
  const res = NextResponse.json(data, init as any)
  // never cache
  res.headers.set("Cache-Control", "no-store")
  return res
}

export async function POST(req: NextRequest) {
  // 1) Parse & validate input
  let body: any = null
  try { body = await req.json() } catch { /* ignore */ }
  const token: string | undefined = body?.token
  const perkIdRaw: string | number | undefined = body?.perkId

  if (!token || typeof token !== "string" || token.length < 12) {
    return json({ error: "Missing or invalid token" }, { status: 400 })
  }
  if (perkIdRaw === undefined || (typeof perkIdRaw !== "string" && typeof perkIdRaw !== "number")) {
    return json({ error: "Missing perkId" }, { status: 400 })
  }
  const perkId = String(perkIdRaw)

  // 2) Staff session (set by the staff unlock QR)
  const staffCookie = req.cookies.get(STAFF_COOKIE_NAME)?.value
  if (!verifyStaffCookie(staffCookie, perkId)) {
    return json({ error: "Staff session expired. Scan the unlock QR again." }, { status: 401 })
  }

  // 3) Admin client (service role) for server-side redemption
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const admin = createAdmin(url, key, { auth: { persistSession: false } })

  // 4) Look up claim by token
  const { data: claim, error: findErr } = await admin
    .from("perk_claims")
    .select("id, perk_id, status")
    .eq("redeem_token", token)
    .maybeSingle()

  if (findErr) return json({ error: findErr.message }, { status: 500 })
  if (!claim) return json({ error: "Invalid or expired pass" }, { status: 404 })

  // Prevent scanning a valid token against the wrong perk
  if (String(claim.perk_id) !== perkId) {
    return json({ error: "This pass is for a different perk" }, { status: 409 })
  }

  // 5) Idempotency: if already redeemed, return current progress
  if (claim.status === "redeemed") {
    const { count } = await admin
      .from("perk_claims")
      .select("id", { head: true, count: "exact" })
      .eq("perk_id", perkId)
      .eq("status", "redeemed")
    return json({ ok: true, alreadyRedeemed: true, redeemed: count ?? 0 })
  }

  // 6) Atomic redeem: only flip from reserved -> redeemed
  const { data: updated, error: updErr } = await admin
    .from("perk_claims")
    .update({
      status: "redeemed",
      redeemed_at: new Date().toISOString(),
      redeemed_by: "staff",
    })
    .eq("id", claim.id)
    .eq("status", "reserved")      // <— prevents double-scan race
    .select("id")
    .maybeSingle()

  if (updErr) return json({ error: updErr.message }, { status: 500 })
  if (!updated) {
    // Another device probably redeemed it a millisecond earlier
    const { count } = await admin
      .from("perk_claims")
      .select("id", { head: true, count: "exact" })
      .eq("perk_id", perkId)
      .eq("status", "redeemed")
    return json({ ok: true, alreadyRedeemed: true, redeemed: count ?? 0 })
  }

  // 7) Return running total for the scanner UI
  const { count } = await admin
    .from("perk_claims")
    .select("id", { head: true, count: "exact" })
    .eq("perk_id", perkId)
    .eq("status", "redeemed")

  return json({ ok: true, redeemed: count ?? 1 })
}
