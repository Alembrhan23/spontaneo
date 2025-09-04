import crypto from "crypto"
const COOKIE = "nowio_staff_session"

export function verifyStaffCookie(raw: string | undefined, perkId: string) {
  if (!raw) return false
  try {
    const [pid, expStr, sig] = raw.split(".")
    if (pid !== String(perkId)) return false
    const exp = Number(expStr)
    if (!exp || Math.floor(Date.now() / 1000) > exp) return false
    const expect = crypto.createHmac("sha256", process.env.STAFF_SESSION_SECRET!).update(`${pid}.${exp}`).digest("base64url")
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))
  } catch { return false }
}
export const STAFF_COOKIE_NAME = COOKIE
