// app/activity/[id]/edit/page.tsx
'use client'
import { supabase } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import LocationAutocomplete from '@/components/LocationAutocomplete'

type FormState = {
  title: string
  description: string
  category: 'Outdoors' | 'Food & Drink' | 'Sports' | 'Other'
  neighborhood: 'RiNo' | 'LoHi' | 'Five Points'
  location: string
  start_at: string      // HTML datetime-local value
  max_spots: number
}

const CATEGORY_OPTIONS = ['Outdoors', 'Food & Drink', 'Sports', 'Other'] as const
const NEIGHBORHOODS = ['RiNo', 'LoHi', 'Five Points'] as const

export default function EditActivity() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id

  const [form, setForm] = useState<FormState>({
    title: '',
    description: '',
    category: 'Other',        // <-- default so it's never null
    neighborhood: 'RiNo',
    location_name: '',
  location_lat: null as number | null,
  location_lng: null as number | null,
    start_at: new Date().toISOString().slice(0, 16),
    max_spots: 8,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) { alert('Activity not found'); router.push('/discover'); return }

      if (data.creator_id !== user.id) {
        alert('Only the creator can edit this activity.')
        router.push('/discover')
        return
      }

      // Normalize all fields so none are null/undefined
      setForm({
        title: data.title ?? '',
        description: data.description ?? '',
        category: (data.category as FormState['category']) ?? 'Other',
        neighborhood: (data.neighborhood as FormState['neighborhood']) ?? 'RiNo',
        location: data.location ?? '',
        start_at: new Date(data.start_at ?? new Date()).toISOString().slice(0, 16),
        max_spots: data.max_spots ?? 8,
      })
      setLoading(false)
    })()
  }, [id])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase
      .from('activities')
      .update({
        title: form.title,
        description: form.description,
        category: form.category,
        neighborhood: form.neighborhood,
        location_name: form.location_name,
  location_lat: form.location_lat,
  location_lng: form.location_lng,
        start_at: new Date(form.start_at),
        max_spots: Number(form.max_spots),
      })
      .eq('id', id)
    setSaving(false)
    if (error) return alert(error.message)
    router.push('/discover')
  }

  if (loading) return <div>Loading…</div>

  return (
    <form onSubmit={save} className="max-w-xl mx-auto bg-white shadow rounded-2xl p-6 space-y-4">
      <h1 className="text-xl font-bold">Edit Activity</h1>

      <input
        className="w-full border rounded p-2"
        value={form.title}
        onChange={e => setForm({ ...form, title: e.target.value })}
      />

      <textarea
        className="w-full border rounded p-2"
        rows={3}
        value={form.description}
        onChange={e => setForm({ ...form, description: e.target.value })}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm text-gray-600">Category</span>
          <select
            className="w-full border rounded p-2"
            value={form.category}  // never null now
            onChange={e => setForm({ ...form, category: e.target.value as FormState['category'] })}
          >
            {CATEGORY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="text-sm text-gray-600">Neighborhood</span>
          <select
            className="w-full border rounded p-2"
            value={form.neighborhood}  // never null now
            onChange={e => setForm({ ...form, neighborhood: e.target.value as FormState['neighborhood'] })}
          >
            {NEIGHBORHOODS.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>

      <LocationAutocomplete
  value={form.location_name ?? form.location ?? ''} // fallback to old field
  onSelect={({ name, lat, lng }) =>
    setForm(f => ({ ...f, location_name: name, location_lat: lat, location_lng: lng, location: name }))
  }
/>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm text-gray-600">Start time</span>
          <input
            type="datetime-local"
            className="w-full border rounded p-2"
            value={form.start_at}
            onChange={e => setForm({ ...form, start_at: e.target.value })}
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

      <button disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl">
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  )
}
