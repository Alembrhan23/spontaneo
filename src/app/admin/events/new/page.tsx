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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Add New Event</h1>
        <p className="text-gray-500 mt-2">Create a new event for the Denver event calendar</p>
      </div>

      {/* Neighborhood quick filter */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h2 className="text-sm font-medium text-gray-500 mb-3">Filter by Neighborhood</h2>
        <div className="flex flex-wrap gap-2">
          {['', ...MVP_NEIGHBORHOODS].map(n => (
            <button
              key={n || 'all'}
              onClick={() => setNeighborhood(n)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                neighborhood === n 
                  ? 'bg-gradient-to-r from-purple-600 to-blue-500 text-white shadow' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {n || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Quick time presets */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h2 className="text-sm font-medium text-gray-500 mb-3">Quick Time Presets</h2>
        <div className="flex flex-wrap gap-2">
          <button 
            className="rounded-full bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-all"
            onClick={()=>setQuickTime(30)}
          >
            +30m
          </button>
          <button 
            className="rounded-full bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-all"
            onClick={()=>setQuickTime(60)}
          >
            +1h
          </button>
          <button 
            className="rounded-full bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-all"
            onClick={()=>setQuickTime(120)}
          >
            +2h
          </button>
          <button 
            className="rounded-full bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-all"
            onClick={()=>setQuickTime(240)}
          >
            +4h
          </button>
        </div>
      </div>

      <form className="space-y-5 bg-white rounded-xl p-6 shadow-sm border border-gray-100" onSubmit={save}>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business</label>
            <select
              className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
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
          </div>

          {/* Show what will be used from Business (URL + Image preview) */}
          {selectedBiz && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <h3 className="font-medium text-gray-700 mb-2 flex items-center gap-1">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Using from business
              </h3>
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-lg overflow-hidden border border-gray-200 bg-white flex-shrink-0">
                  {selectedBiz.image_url
                    ? <img src={selectedBiz.image_url} alt="" className="h-full w-full object-cover" />
                    : <div className="grid h-full w-full place-items-center text-gray-400 text-xs">No image</div>}
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="truncate text-sm">
                    <span className="text-gray-500 mr-1">Image:</span>
                    {selectedBiz.image_url 
                      ? <span className="text-gray-700 truncate">{selectedBiz.image_url}</span> 
                      : <span className="text-gray-400">None</span>}
                  </div>
                  <div className="truncate text-sm">
                    <span className="text-gray-500 mr-1">Details URL:</span>
                    {selectedBiz.event_url || selectedBiz.url || selectedBiz.website_url
                      ? <span className="text-indigo-600 truncate">{selectedBiz.event_url || selectedBiz.url || selectedBiz.website_url}</span>
                      : <span className="text-gray-400">None</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
            <input 
              className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" 
              required
              value={form.title} 
              onChange={e=>setForm(f=>({...f, title:e.target.value}))}
              placeholder="Enter event title"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start (local)</label>
              <input 
                type="datetime-local" 
                className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" 
                required
                value={form.start_local} 
                onChange={e=>setForm(f=>({...f, start_local:e.target.value}))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End (local)</label>
              <input 
                type="datetime-local" 
                className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                value={form.end_local} 
                onChange={e=>setForm(f=>({...f, end_local:e.target.value}))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price Information</label>
              <input 
                className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" 
                value={form.price_text}
                onChange={e=>setForm(f=>({...f, price_text:e.target.value}))}
                placeholder="e.g., $10 cover, Free with RSVP"
              />
            </div>
            <div className="flex items-center justify-start md:justify-end pt-5">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input 
                  type="checkbox"
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  checked={form.is_free}
                  onChange={e=>setForm(f=>({...f, is_free:e.target.checked}))}
                />
                Free Event
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
            <input 
              className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" 
              value={form.tags}
              onChange={e=>setForm(f=>({...f, tags:e.target.value}))}
              placeholder="e.g., live music, comedy, art show"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea 
              className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all min-h-[100px]" 
              value={form.notes}
              onChange={e=>setForm(f=>({...f, notes:e.target.value}))}
              placeholder="Additional details about this event..."
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button className="rounded-xl bg-gradient-to-r from-purple-600 to-blue-500 text-white px-6 py-3 font-medium hover:shadow-md transition-all flex-1">
            Save Event
          </button>
          <button
            type="button"
            className="rounded-xl border border-gray-200 px-4 py-3 text-gray-700 font-medium hover:bg-gray-50 transition-all"
            onClick={() => setForm({ business_id:'', title:'', start_local:'', end_local:'', price_text:'', is_free:false, tags:'', notes:'' })}
          >
            Reset
          </button>
        </div>
      </form>

      {msg && (
        <div className={`rounded-xl p-4 ${msg.startsWith('Error') ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {msg.startsWith('Error') ? (
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${msg.startsWith('Error') ? 'text-red-800' : 'text-green-800'}`}>
                {msg}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}