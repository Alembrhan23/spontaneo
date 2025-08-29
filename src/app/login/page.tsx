import LoginClient from './LoginClient'

// Avoid SSG surprises (optional but helpful for auth pages)
export const dynamic = 'force-dynamic'

export default function Page({ searchParams }: { searchParams?: { next?: string } }) {
  const next = searchParams?.next && typeof searchParams.next === 'string'
    ? searchParams.next
    : '/discover'
  return <LoginClient next={next} />
}
