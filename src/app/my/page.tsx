import ActivityCard from '@/components/ActivityCard'
import { getServerUser } from '@/lib/server-user'
import { redirect } from 'next/navigation'


export default async function MyPlansPage() {
const { supabase, user } = await getServerUser()
if (!user) redirect('/login')


// Activities I created
const { data: mine } = await supabase
.from('activities')
.select('*')
.eq('creator_id', user.id)


// Activities I joined
const { data: joined } = await supabase
.from('activity_attendees')
.select('activities(*)')
.eq('user_id', user.id)


const joinedFlat = (joined ?? []).map((j:any)=>j.activities)
const all = [...(mine ?? []), ...joinedFlat]


return (
<div className="space-y-3">
<h1 className="text-xl font-bold mb-2">My Plans</h1>
{all.length === 0 ? (
<p className="text-slate-600">No plans yet. Join something on Discover or create your own.</p>
) : (
all.map((a:any)=> <ActivityCard key={a.id} a={a} me={user.id} />)
)}
</div>
)
}