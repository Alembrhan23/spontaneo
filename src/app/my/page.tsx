// src/app/my/page.tsx
import ActivityCard from '@/components/ActivityCard'
import { getServerUser } from '@/lib/server-user'
import { redirect } from 'next/navigation'

// Guarantee no static prerender for this auth-dependent page
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0
export const runtime = 'nodejs'

export default async function MyPlansPage() {
  const { supabase, user } = await getServerUser()
  if (!user) redirect('/login?next=/my')

  // Activities I created
  const { data: mine } = await supabase
    .from('activities')
    .select('*')
    .eq('creator_id', user.id)
    .order('start_at', { ascending: false })

  // Activities I joined
  const { data: joined } = await supabase
    .from('activity_attendees')
    .select('activities(*)')
    .eq('user_id', user.id)

  const joinedFlat = (joined ?? []).map((j: any) => j.activities).filter(Boolean)
  const all = [...(mine ?? []), ...joinedFlat]

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold mb-2">My Plans</h1>
      {all.length === 0 ? (
        <p className="text-slate-600">
          No plans yet. Join something on Discover or create your own.
        </p>
      ) : (
        all.map((a: any) => <ActivityCard key={a.id} a={a} me={user.id} />)
      )}
    </div>
  )
}
