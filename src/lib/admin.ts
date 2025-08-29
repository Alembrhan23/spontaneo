// /lib/admin.ts
function normalizeEmail(raw?: string | null): string {
  if (!raw) return ''
  let email = raw.trim().toLowerCase()
  const [local, domain] = email.split('@')
  if (!domain) return email
  const plusIdx = local.indexOf('+')
  const noPlusLocal = plusIdx >= 0 ? local.slice(0, plusIdx) : local
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    const noDots = noPlusLocal.replace(/\./g, '')
    return `${noDots}@gmail.com`
  }
  return `${noPlusLocal}@${domain}`
}

function splitAdminList(src: string): string[] {
  return src.split(/[,;]+/).map(s => normalizeEmail(s)).filter(Boolean)
}

// ✅ Your email hardcoded + env allowlist
const RAW = process.env.NEXT_PUBLIC_ADMIN_EMAILS || ''
const STATIC = ['alembrhan23@gmail.com']  // <= you
export const ADMIN_EMAILS = Array.from(new Set([...STATIC, ...splitAdminList(RAW)]))

export function isAdminEmail(email?: string | null) {
  return ADMIN_EMAILS.includes(normalizeEmail(email))
}

// Optional debug helpers
export const _adminDebug = { RAW, ADMIN_EMAILS, normalizeEmail }
