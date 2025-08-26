'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import LocationAutocomplete from '@/components/LocationAutocomplete'

export default function CreatePlan() {
  const router = useRouter()
  const q = useSearchParams()
  const [form, setForm] = useState({
    title: '', description: '', category: 'Outdoors', neighborhood: 'RiNo',
    location: '', start_at: new Date(Date.now() + 60*60*1000).toISOString().slice(0,16), // HTML datetime-local needs no seconds+Z
    max_spots: 6, 
    location_name: '',
  location_lat: null as number | null,
  location_lng: null as number | null,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (q.get('surprise') === '1') {
      const ideas = [
        { title:'Sunset Walk at Confluence Park', category:'Outdoors', neighborhood:'LoHi', location:'Confluence Park' },
        { title:'Taco Crawl', category:'Food & Drink', neighborhood:'RiNo', location:'Larimer St' },
        { title:'Pick-up Basketball', category:'Sports', neighborhood:'Five Points', location:'Mestizo-Curtis Park' },
      ]
      const r = ideas[Math.floor(Math.random()*ideas.length)]
      setForm(f => ({ ...f, ...r }))
    }
  }, [q])

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return alert('Please log in.')

    // ensure profile exists
    await supabase.from('profiles').upsert({ id: user.id }, { onConflict: 'id' })

    const { error } = await supabase.from('activities').insert({
      creator_id: user.id,
      title: form.title,
      description: form.description,
      category: form.category,
      neighborhood: form.neighborhood,
      location_name: form.location_name,
  location_lat: form.location_lat,
  location_lng: form.location_lng,
      start_at: new Date(form.start_at),   // convert from local input
      max_spots: Number(form.max_spots)
    })
    setSaving(false)
    if (error) return alert(error.message)
    router.push('/discover')
  }

  return (
    <form onSubmit={submit} className="max-w-xl mx-auto bg-white shadow rounded-2xl p-6 space-y-4">
      <h1 className="text-xl font-bold">Create Plan</h1>

      <input className="w-full border rounded p-2" placeholder="Title"
        value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required />

      <textarea className="w-full border rounded p-2" rows={3} placeholder="Description"
        value={form.description} onChange={e=>setForm({...form,description:e.target.value})} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm text-gray-600">Category</span>
          <select className="w-full border rounded p-2"
            value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
            <option>Outdoors</option><option>Food & Drink</option><option>Sports</option><option>Other</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm text-gray-600">Neighborhood</span>
          <select className="w-full border rounded p-2"
            value={form.neighborhood} onChange={e=>setForm({...form,neighborhood:e.target.value})}>
            <option>RiNo</option><option>LoHi</option><option>Five Points</option>
          </select>
        </label>
      </div>

     <label className="block">
  <span className="text-sm text-gray-600">Location</span>
  <LocationAutocomplete
    value={form.location_name}
    onSelect={({ name, lat, lng }) =>
      setForm(f => ({ ...f, location_name: name, location_lat: lat, location_lng: lng }))
    }
  />
</label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm text-gray-600">Start time</span>
          <input type="datetime-local" className="w-full border rounded p-2"
            value={form.start_at} onChange={e=>setForm({...form,start_at:e.target.value})} required />
        </label>
        <label className="block">
          <span className="text-sm text-gray-600">Max spots</span>
          <input type="number" min={1} className="w-full border rounded p-2"
            value={form.max_spots} onChange={e=>setForm({...form,max_spots:e.target.value})} />
        </label>
      </div>

      <button disabled={saving}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl">
        {saving ? 'Creating…' : 'Create Plan'}
      </button>
    </form>
  )
}
