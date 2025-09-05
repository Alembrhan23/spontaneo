// app/login/page.tsx
import LoginClient from './LoginClient'

export const dynamic = 'force-dynamic'

// Keep users on-site and default to /discover
function safePath(n?: string | null) {
  const fallback = '/discover'
  if (!n) return fallback
  try {
    if (/^https?:\/\//i.test(n)) {
      const u = new URL(n)
      return (u.pathname + u.search + u.hash) || fallback
    }
    return n.startsWith('/') ? n : `/${n}`
  } catch {
    return fallback
  }
}

export default async function Page({
  searchParams,
}: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const raw = Array.isArray(sp?.next) ? sp.next[0] : sp?.next
  const next = typeof raw === 'string' ? safePath(decodeURIComponent(raw)) : '/discover'
  return <LoginClient next={next} />
}
