import LoginClient from './LoginClient'

export const dynamic = 'force-dynamic'

/** Keep users on-site and default to /discover */
function safePath(n?: string | null) {
  const fallback = '/discover'
  if (!n) return fallback
  try {
    // Absolute URLs → strip to path/query/hash (prevents open redirects)
    if (/^https?:\/\//i.test(n)) {
      const u = new URL(n)
      return (u.pathname + u.search + u.hash) || fallback
    }
    // Ensure leading slash
    return n.startsWith('/') ? n : `/${n}`
  } catch {
    return fallback
  }
}

export default async function Page({
  // ✅ Next 15: `searchParams` is async (a Promise)
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const raw = Array.isArray(sp?.next) ? sp.next[0] : sp?.next
  const decoded = typeof raw === 'string' ? decodeURIComponent(raw) : null
  const next = safePath(decoded)

  return <LoginClient next={next} />
}
