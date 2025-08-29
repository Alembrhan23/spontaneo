// src/app/my/page.tsx
import ActivityCard from '@/components/ActivityCard'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export const dynamic = 'force-dynamic' // ⬅️ prevent SSG

export default async function MyPlansPage() {
  const cookieStore = await cookies()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    // Don’t explode at build/runtime if envs are missing
    return (
      <div className="p-6 text-red-600">
        Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
      </div>
    )
  }

  const supabase = createServerClient<Database>(url, anon, {
    cookies: {
      get: (name) => cookieStore.get(name)?.value,
      set: (name, value, options) => cookieStore.set({ name, value, ...options }),
      remove: (name, options) =>
        cookieStore.set({ name, value: '', ...options, expires: new Date(0) }),
    },
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/my')

  const { data: mine } = await supabase
    .from('activities')
    .select('*')
    .eq('creator_id', user.id)
    .order('start_at', { ascending: false })

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
