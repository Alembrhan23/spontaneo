'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type Business = {
  id: string
  name: string
  neighborhood: string
  // optional columns we try in order for details/tickets URL
  event_url?: string | null
  url?: string | null
  website_url?: string | null
  // image to use on event cards by default
  image_url?: string | null
}

const MVP_NEIGHBORHOODS = ['Five Points', 'RiNo', 'LoHi'] as const

function toLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function NewEventPage() {
  const search = useSearchParams()
  const copyId = search.get('copyId')
  const bizPrefill = search.get('biz') || search.get('business') || search.get('venue') // legacy key support

  const [businesses, setBusinesses] = useState<Business[]>([])
  const [neighborhood, setNeighborhood] = useState<string>('') // filter
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)

  const [form, setForm] = useState({
    business_id: '',
    title: '',
    start_local: '',
    end_local: '',
    price_text: '',
    is_free: false,
    tags: '',
    notes: ''
  })

  // Selected business (for preview + pulling url/image)
  const selectedBiz = useMemo(
    () => businesses.find(b => b.id === form.business_id) || null,
    [businesses, form.business_id]
  )

  useEffect(() => {
    (async () => {
      setMsg(null)

      // Pull *all* columns so we can read event_url/url/website_url without guessing the exact schema
      const [{ data: bizList, error: bErr }, copy] = await Promise.all([
        supabase
          .from('businesses')
          .select('*') // safer than listing columns that might not exist in your instance
          .in('neighborhood', MVP_NEIGHBORHOODS as unknown as string[])
          .order('neighborhood', { ascending: true })
          .order('name', { ascending: true }),
        copyId
          ? supabase.from('manual_events').select('*').eq('id', copyId).single()
          : Promise.resolve({ data: null as any, error: null }),
      ])

      if (bErr) setMsg(`Could not load businesses: ${bErr.message}`)
      setBusinesses((bizList || []) as Business[])

      if (bizPrefill && bizList?.length) {
        const found = bizList.find(b => b.id === bizPrefill)
        if (found) setForm(f => ({ ...f, business_id: found.id }))
      }

      // Prefill from copyId (we intentionally ignore url/image_url here; they now come from the business)
      if (copy?.data) {
        const e = copy.data
        const start = new Date(e.start_at)
        const end = e.end_at ? new Date(e.end_at) : null
        setForm({
          business_id: e.business_id ?? '',
          title: e.title ?? '',
          start_local: toLocal(start),
          end_local: end ? toLocal(end) : '',
          price_text: e.price_text || '',
          is_free: !!e.is_free,
          tags: Array.isArray(e.tags) ? e.tags.join(', ') : (e.tags || ''),
          notes: e.notes || ''
        })
      }

      setLoading(false)
    })()
  }, [copyId, bizPrefill])

  const filtered = useMemo(
    () => (neighborhood ? businesses.filter(b => b.neighborhood === neighborhood) : businesses),
    [businesses, neighborhood]
  )

  function setQuickTime(minsFromNow: number, durationMin = 120) {
    const start = new Date(Date.now() + minsFromNow * 60 * 1000)
    const end = new Date(start.getTime() + durationMin * 60 * 1000)
    setForm(f => ({ ...f, start_local: toLocal(start), end_local: toLocal(end) }))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setMsg(null)

    const start = new Date(form.start_local)
    const end = form.end_local ? new Date(form.end_local) : null

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setMsg('Please log in.'); return }

    if (!form.business_id) { setMsg('Please select a business.'); return }

    // Pull URL and Image from the selected business
    const biz = businesses.find(b => b.id === form.business_id) || null
    const urlFromBiz =
      (biz?.event_url && String(biz.event_url).trim()) ||
      (biz?.url && String(biz.url).trim()) ||
      (biz?.website_url && String(biz.website_url).trim()) ||
      null
    const imageFromBiz = biz?.image_url || null

    const { error } = await supabase.from('manual_events').insert({
      business_id: form.business_id,
      title: form.title.trim(),
      start_at: start.toISOString(),
      end_at: end ? end.toISOString() : null,
      url: urlFromBiz,                 // ← pulled from business
      image_url: imageFromBiz,         // ← pulled from business (your DB trigger can also backstop this)
      price_text: form.price_text || null,
      is_free: form.is_free,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : null,
      notes: form.notes || null,
      created_by: user.id
    })

    if (error) setMsg(`Error: ${error.message}`)
    else {
      setMsg('Saved!')
      setForm({
        business_id: '',
        title: '',
        start_local: '',
        end_local: '',
        price_text: '',
        is_free: false,
        tags: '',
        notes: ''
      })
    }
  }

  if (loading) return <div className="p-6">Loading…</div>

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Add Event</h1>

      {/* Neighborhood quick filter */}
      <div className="flex gap-2">
        {['', ...MVP_NEIGHBORHOODS].map(n => (
          <button
            key={n || 'all'}
            onClick={() => setNeighborhood(n)}
            className={`border rounded px-3 py-1 ${neighborhood===n ? 'bg-black text-white' : ''}`}
          >
            {n || 'All'}
          </button>
        ))}
      </div>

      {/* Quick time presets */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm opacity-70 self-center">Quick time:</span>
        <button className="border rounded px-3 py-1" onClick={()=>setQuickTime(30)}>+30m</button>
        <button className="border rounded px-3 py-1" onClick={()=>setQuickTime(60)}>+1h</button>
        <button className="border rounded px-3 py-1" onClick={()=>setQuickTime(120)}>+2h</button>
        <button className="border rounded px-3 py-1" onClick={()=>setQuickTime(240)}>+4h</button>
      </div>

      <form className="space-y-3" onSubmit={save}>
        <label className="block">
          <span>Business</span>
          <select
            className="w-full border p-2 rounded"
            required
            value={form.business_id}
            onChange={e=>setForm(f=>({...f, business_id:e.target.value}))}
          >
            <option value="">{filtered.length ? 'Select a business…' : 'No businesses found (RiNo/LoHi/Five Points)'}</option>
            {filtered.map(b=>(
              <option key={b.id} value={b.id}>
                {b.neighborhood} — {b.name}
              </option>
            ))}
          </select>
        </label>

        {/* Show what will be used from Business (URL + Image preview) */}
        {selectedBiz && (
          <div className="rounded-lg border bg-gray-50 p-3 text-sm">
            <div className="font-medium mb-1">Using from business</div>
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-lg overflow-hidden border bg-white">
                {selectedBiz.image_url
                  ? <img src={selectedBiz.image_url} alt="" className="h-full w-full object-cover" />
                  : <div className="grid h-full w-full place-items-center text-gray-400 text-xs">No image</div>}
              </div>
              <div className="min-w-0">
                <div className="truncate">
                  <span className="opacity-70 mr-1">Image:</span>
                  {selectedBiz.image_url ? <span className="text-gray-700">{selectedBiz.image_url}</span> : <span className="text-gray-500">None</span>}
                </div>
                <div className="truncate">
                  <span className="opacity-70 mr-1">Details URL:</span>
                  {selectedBiz.event_url || selectedBiz.url || selectedBiz.website_url
                    ? <span className="text-indigo-700">{selectedBiz.event_url || selectedBiz.url || selectedBiz.website_url}</span>
                    : <span className="text-gray-500">None</span>}
                </div>
              </div>
            </div>
          </div>
        )}

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

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span>Price text</span>
            <input className="w-full border p-2 rounded" value={form.price_text}
              onChange={e=>setForm(f=>({...f, price_text:e.target.value}))}/>
          </label>
          <label className="block flex items-center gap-2">
            <span>Free?</span>
            <input type="checkbox"
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

        <div className="flex gap-2">
          <button className="rounded bg-black text-white px-4 py-2">Save</button>
          <button
            type="button"
            className="rounded border px-3"
            onClick={() => setForm({ business_id:'', title:'', start_local:'', end_local:'', price_text:'', is_free:false, tags:'', notes:'' })}
          >
            Reset
          </button>
        </div>
      </form>

      {msg && <p className={`text-sm mt-2 ${msg.startsWith('Error') ? 'text-red-600' : ''}`}>{msg}</p>}
    </div>
  )
}
