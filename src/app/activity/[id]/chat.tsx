'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase/client'


type Msg = { id: string; activity_id: string; sender_id: string; content: string; created_at: string }


export default function ChatPanel({ id, me }: { id: string; me: string|null }) {
const [msgs, setMsgs] = useState<Msg[]>([])
const [text, setText] = useState('')
const bottomRef = useRef<HTMLDivElement>(null)


useEffect(()=>{ (async()=>{
const { data } = await supabase
.from('messages')
.select('*')
.eq('activity_id', id)
.order('created_at', { ascending: true })
setMsgs(data as Msg[] || [])
})() }, [id])


useEffect(()=>{
const ch = supabase
.channel('messages-stream')
.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `activity_id=eq.${id}` }, payload => {
setMsgs(prev => [...prev, payload.new as any])
})
.subscribe()
return () => { supabase.removeChannel(ch) }
}, [id])


useEffect(()=>{ bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])


async function send(e: React.FormEvent) {
e.preventDefault()
if (!me) { window.location.href = '/login'; return }
if (!text.trim()) return
const { error } = await supabase.from('messages').insert({ activity_id: id, sender_id: me, content: text.trim() })
if (!error) setText('')
}


return (
<div className="card p-4">
<h2 className="font-semibold mb-3">Chat</h2>
<div className="max-h-72 overflow-auto border rounded-lg p-3 space-y-2">
{msgs.map(m => (
<div key={m.id} className={`text-sm ${m.sender_id===me?'text-right':''}`}>
<span className={`inline-block px-3 py-2 rounded-2xl ${m.sender_id===me?'bg-[var(--primary)] text-white':'bg-slate-100'}`}>{m.content}</span>
</div>
))}
<div ref={bottomRef} />
</div>
<form onSubmit={send} className="mt-3 flex items-center gap-2">
<input className="input" value={text} onChange={e=>setText(e.target.value)} placeholder={me? 'Type a message…' : 'Login to chat'} disabled={!me} />
<button className="btn btn-primary" disabled={!me}>Send</button>
</form>
</div>
)
}