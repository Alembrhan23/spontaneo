'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import LocationAutocomplete from '@/components/LocationAutocomplete'
import { CATEGORIES, NEIGHBORHOODS, Category, Neighborhood } from '@/lib/constants'

type FormState = {
  title: string
  description: string
  category: Category
  neighborhood: Neighborhood
  start_at: string            // HTML datetime-local (yyyy-mm-ddThh:mm)
  max_spots: number
  location_name: string
  location_lat: number | null
  location_lng: number | null
}

export default function CreatePlan() {
  const router = useRouter()
  const q = useSearchParams()

  const [form, setForm] = useState<FormState>({
    title: '',
    description: '',
    category: 'Outdoors',
    neighborhood: 'RiNo',
    start_at: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
    max_spots: 6,
    location_name: '',
    location_lat: null,
    location_lng: null,
  })
  const [saving, setSaving] = useState(false)

  // Optional URL prefill — surprise & category/neighborhood query params
  useEffect(() => {
    const surprise = q.get('surprise') === '1'
    const catParam = q.get('category') as Category | null
    const hoodParam = q.get('neighborhood') as Neighborhood | null

    if (surprise) {
      const ideas: Array<Partial<FormState>> = [
        { title: 'Sunset Walk at Confluence Park', category: 'Outdoors',          neighborhood: 'LoHi',        location_name: 'Confluence Park' },
        { title: 'Taco Crawl',                      category: 'Food & Drink',     neighborhood: 'RiNo',        location_name: 'Larimer St' },
        { title: 'Pick-up Basketball',              category: 'Sports',           neighborhood: 'Five Points', location_name: 'Mestizo-Curtis Park' },
        { title: 'Live Jazz Hang',                  category: 'Music & Nightlife',neighborhood: 'RiNo',        location_name: 'Nocturne' },
        { title: 'Trivia Warm-up',                  category: 'Games & Trivia',   neighborhood: 'Five Points', location_name: 'Welton St' },
      ]
      const r = ideas[Math.floor(Math.random() * ideas.length)]
      setForm(f => ({ ...f, ...r }))
    }

    if (catParam && CATEGORIES.includes(catParam)) {
      setForm(f => ({ ...f, category: catParam }))
    }
    if (hoodParam && NEIGHBORHOODS.includes(hoodParam)) {
      setForm(f => ({ ...f, neighborhood: hoodParam }))
    }
  }, [q])

  // Guard: if form.category ever drifts from our list, reset to 'Other'
  useEffect(() => {
    if (!CATEGORIES.includes(form.category)) {
      setForm(f => ({ ...f, category: 'Other' }))
    }
  }, [form.category])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return alert('Please log in.') }

    // ensure profile row exists
    await supabase.from('profiles').upsert({ id: user.id }, { onConflict: 'id' })

    const { error } = await supabase.from('activities').insert({
      creator_id: user.id,
      title: form.title.trim(),
      description: form.description || null,
      category: form.category,
      neighborhood: form.neighborhood,
      // location fields
      location_name: form.location_name || null,
      location_lat: form.location_lat,
      location_lng: form.location_lng,
      // time (convert local input to Date; Postgres will accept ISO)
      start_at: new Date(form.start_at).toISOString(),
      max_spots: Number(form.max_spots) || null,
    })

    setSaving(false)
    if (error) return alert(error.message)
    router.push('/discover')
  }

  return (
    <form onSubmit={submit} className="max-w-xl mx-auto bg-white shadow rounded-2xl p-6 space-y-4">
      <h1 className="text-xl font-bold">Create Plan</h1>

      <input
        className="w-full border rounded p-2"
        placeholder="Title"
        value={form.title}
        onChange={e => setForm({ ...form, title: e.target.value })}
        required
      />

      <textarea
        className="w-full border rounded p-2"
        rows={3}
        placeholder="Description"
        value={form.description}
        onChange={e => setForm({ ...form, description: e.target.value })}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm text-gray-600">Category</span>
          <select
            className="w-full border rounded p-2"
            value={form.category}
            onChange={e => setForm({ ...form, category: e.target.value as Category })}
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm text-gray-600">Neighborhood</span>
          <select
            className="w-full border rounded p-2"
            value={form.neighborhood}
            onChange={e => setForm({ ...form, neighborhood: e.target.value as Neighborhood })}
          >
            {NEIGHBORHOODS.map(h => (
              <option key={h} value={h}>{h}</option>
            ))}
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
          <input
            type="datetime-local"
            className="w-full border rounded p-2"
            value={form.start_at}
            onChange={e => setForm({ ...form, start_at: e.target.value })}
            required
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-600">Max spots</span>
          <input
            type="number"
            min={1}
            className="w-full border rounded p-2"
            value={form.max_spots}
            onChange={e => setForm({ ...form, max_spots: Number(e.target.value) })}
          />
        </label>
      </div>

      <button
        disabled={saving}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl"
      >
        {saving ? 'Creating…' : 'Create Plan'}
      </button>
    </form>
  )
}
