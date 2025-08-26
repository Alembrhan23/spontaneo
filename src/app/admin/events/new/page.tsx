'use client'
import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

type Venue = { id: string; name: string; neighborhood: string }

export default function NewEventPage() {
  const supabase = createClientComponentClient()
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)

  const [form, setForm] = useState({
    venue_id: '',
    title: '',
    start_local: '',
    end_local: '',
    url: '',
    image_url: '',
    price_text: '',
    is_free: false,
    tags: '',
    notes: ''
  })

  useEffect(() => {
    supabase.from('venues').select('id,name,neighborhood').order('neighborhood', { ascending: true }).then(({ data }) => {
      setVenues(data || []); setLoading(false)
    })
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault(); setMsg(null)
    const start = new Date(form.start_local) // local -> assume browser TZ = Denver
    const end = form.end_local ? new Date(form.end_local) : null

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setMsg('Please log in.'); return }

    const { error } = await supabase.from('manual_events').insert({
      venue_id: form.venue_id,
      title: form.title.trim(),
      start_at: start.toISOString(),
      end_at: end ? end.toISOString() : null,
      url: form.url || null,
      image_url: form.image_url || null,
      price_text: form.price_text || null,
      is_free: form.is_free,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()) : null,
      notes: form.notes || null,
      created_by: user.id
    })

    setMsg(error ? `Error: ${error.message}` : 'Saved!'); if (!error) {
      setForm({ ...form, title:'', start_local:'', end_local:'', url:'', image_url:'', price_text:'', is_free:false, tags:'', notes:'' })
    }
  }

  if (loading) return <div className="p-6">Loading…</div>

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Add Event (manual)</h1>
      <form className="space-y-3" onSubmit={save}>
        <label className="block">
          <span>Venue</span>
          <select className="w-full border p-2 rounded" required
            value={form.venue_id} onChange={e=>setForm(f=>({...f, venue_id:e.target.value}))}>
            <option value="">Select a venue…</option>
            {venues.map(v=>(
              <option key={v.id} value={v.id}>{v.neighborhood} — {v.name}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span>Title</span>
          <input className="w-full border p-2 rounded" required
            value={form.title} onChange={e=>setForm(f=>({...f, title:e.target.value}))}/>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span>Start (local)</span>
            <input type="datetime-local" className="w-full border p-2 rounded" required
              value={form.start_local} onChange={e=>setForm(f=>({...f, start_local:e.target.value}))}/>
          </label>
          <label className="block">
            <span>End (local)</span>
            <input type="datetime-local" className="w-full border p-2 rounded"
              value={form.end_local} onChange={e=>setForm(f=>({...f, end_local:e.target.value}))}/>
          </label>
        </div>

        <label className="block">
          <span>URL</span>
          <input className="w-full border p-2 rounded" value={form.url}
            onChange={e=>setForm(f=>({...f, url:e.target.value}))}/>
        </label>

        <label className="block">
          <span>Image URL</span>
          <input className="w-full border p-2 rounded" value={form.image_url}
            onChange={e=>setForm(f=>({...f, image_url:e.target.value}))}/>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span>Price text</span>
            <input className="w-full border p-2 rounded" value={form.price_text}
              onChange={e=>setForm(f=>({...f, price_text:e.target.value}))}/>
          </label>
          <label className="block">
            <span>Free?</span>
            <input type="checkbox" className="ml-2"
              checked={form.is_free}
              onChange={e=>setForm(f=>({...f, is_free:e.target.checked}))}/>
          </label>
        </div>

        <label className="block">
          <span>Tags (comma separated)</span>
          <input className="w-full border p-2 rounded" value={form.tags}
            onChange={e=>setForm(f=>({...f, tags:e.target.value}))}/>
        </label>

        <label className="block">
          <span>Notes</span>
          <textarea className="w-full border p-2 rounded" value={form.notes}
            onChange={e=>setForm(f=>({...f, notes:e.target.value}))}/>
        </label>

        <button className="rounded bg-black text-white px-4 py-2">Save</button>
      </form>
      {msg && <p className="text-sm">{msg}</p>}
    </div>
  )
}
