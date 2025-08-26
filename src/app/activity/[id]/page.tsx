import { getServerUser } from '@/lib/server-user'
import ChatPanel from './chat'
import ActivityCard from '@/components/ActivityCard'


export default async function ActivityDetail({ params }: { params: { id: string } }) {
const { supabase, user } = await getServerUser()
const { data: a } = await supabase.from('activities').select('*').eq('id', params.id).maybeSingle()
if (!a) return <div>Not found</div>
return (
<div className="space-y-4">
<ActivityCard a={a as any} me={user?.id ?? null} />
<ChatPanel id={params.id} me={user?.id ?? null} />
</div>
)
}