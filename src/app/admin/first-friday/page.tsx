'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type Series = { id: string; timezone: string }
type Occ = { id: string; event_date: string; is_published: boolean; theme: string | null }
type Venue = { id: string; business_id: string; display_name: string | null; businesses: { id: string; name: string } }
type Perf = { id: string; artist: string; business_id: string; start_time_local: string; end_time_local: string; order_index: number }

function firstFridayISO(year: number, month1to12: number) {
  const d = new Date(year, month1to12 - 1, 1)
  const offset = (5 - d.getDay() + 7) % 7 // 5=Fri
  d.setDate(1 + offset)
  return d.toISOString().slice(0,10)
}

export default function FirstFridayAdmin() {
  const [series, setSeries] = useState<Series | null>(null)
  const [venues, setVenues] = useState<Venue[]>([])
  const [occ, setOcc] = useState<Occ | null>(null)
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1)
  const [year, setYear] = useState<number>(new Date().getFullYear())
  const [lineup, setLineup] = useState<Perf[]>([])
  const [theme, setTheme] = useState<string>('')

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from('first_friday_series').select('id, timezone').eq('is_active', true).limit(1)
      setSeries(s?.[0] ?? null)
      const { data: v } = await supabase
        .from('first_friday_venues')
        .select('id, business_id, display_name, businesses:business_id(id,name)')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
      setVenues(v ?? [])
    })()
  }, [])

  useEffect(() => {
    (async () => {
      if (!series) return
      const date = firstFridayISO(year, month)
      const { data: occs } = await supabase
        .from('first_friday_occurrences')
        .select('*')
        .eq('series_id', series.id)
        .eq('event_date', date)
        .limit(1)
      const theOcc = occs?.[0] ?? null
      setOcc(theOcc)
      if (theOcc) {
        const { data: perfs } = await supabase
          .from('first_friday_performances')
          .select('id, artist, business_id, start_time_local, end_time_local, order_index')
          .eq('occurrence_id', theOcc.id)
          .order('order_index', { ascending: true })
        setLineup(perfs ?? [])
        setTheme(theOcc.theme ?? '')
      } else {
        setLineup([]); setTheme('')
      }
    })()
  }, [series, month, year])

  async function ensureOccurrence() {
    if (!series) return
    const date = firstFridayISO(year, month)
    if (occ) return
    const { data, error } = await supabase
      .from('first_friday_occurrences')
      .insert({ series_id: series.id, event_date: date, theme, is_published: false })
      .select('*').single()
    if (!error) setOcc(data as any)
    else alert(error.message)
  }

  async function addPerformance() {
    if (!occ) { alert('Create the occurrence first.'); return }
    const business_id = venues[0]?.businesses?.id
    if (!business_id) { alert('Add venues first.'); return }
    const { data, error } = await supabase
      .from('first_friday_performances')
      .insert({
        occurrence_id: occ.id,
        business_id,
        artist: 'New Artist',
        start_time_local: '18:00',
        end_time_local: '20:00',
        order_index: (lineup[lineup.length-1]?.order_index ?? 0) + 10
      }).select('*').single()
    if (!error) setLineup(prev => [...prev, data as any])
    else alert(error.message)
  }

  async function savePerf(p: Perf) {
    const { error } = await supabase
      .from('first_friday_performances')
      .update({
        artist: p.artist,
        business_id: p.business_id,
        start_time_local: p.start_time_local,
        end_time_local: p.end_time_local,
        order_index: p.order_index
      })
      .eq('id', p.id)
    if (error) alert(error.message)
  }

  async function deletePerf(id: string) {
    const { error } = await supabase.from('first_friday_performances').delete().eq('id', id)
    if (error) alert(error.message)
    setLineup(prev => prev.filter(x => x.id !== id))
  }

  async function publishOcc(published: boolean) {
    if (!occ) return
    const { error } = await supabase
      .from('first_friday_occurrences')
      .update({ is_published: published, theme })
      .eq('id', occ.id)
    if (error) alert(error.message)
    else setOcc({ ...occ, is_published: published, theme })
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">First Friday — Admin</h1>

      <div className="flex gap-2 items-end">
        <div>
          <label className="block text-sm mb-1">Month</label>
          <input type="number" min={1} max={12} value={month} onChange={e => setMonth(+e.target.value)} className="border rounded px-2 py-1 w-24" />
        </div>
        <div>
          <label className="block text-sm mb-1">Year</label>
          <input type="number" value={year} onChange={e => setYear(+e.target.value)} className="border rounded px-2 py-1 w-28" />
        </div>
        <div className="grow" />
        <button onClick={ensureOccurrence} className="rounded-xl px-4 py-2 border shadow hover:bg-muted">
          {occ ? 'Occurrence exists' : 'Create this First Friday'}
        </button>
      </div>

      <div className="rounded-2xl border p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm opacity-70">Occurrence date</div>
            <div className="font-semibold">{occ ? new Date(occ.event_date).toDateString() : '—'}</div>
          </div>
          <div className="flex items-center gap-2">
            <input
              placeholder="Theme (optional)"
              value={theme}
              onChange={e => setTheme(e.target.value)}
              className="border rounded px-2 py-1"
            />
            <button onClick={() => publishOcc(!(occ?.is_published))} disabled={!occ}
              className="rounded-xl px-4 py-2 border shadow hover:bg-muted">
              {occ?.is_published ? 'Unpublish' : 'Publish'}
            </button>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Lineup</h3>
            <button onClick={addPerformance} disabled={!occ} className="rounded px-3 py-1.5 border">+ Add slot</button>
          </div>

          <div className="space-y-3">
            {lineup.map((p, idx) => (
              <div key={p.id} className="grid grid-cols-12 gap-2 items-center border rounded-xl p-3">
                <input value={p.artist}
                  onChange={e => setLineup(L => L.map((x,i)=> i===idx?{...x,artist:e.target.value}:x))}
                  onBlur={() => savePerf(lineup[idx])}
                  className="col-span-3 border rounded px-2 py-1" />
                <select value={p.business_id}
                  onChange={e => setLineup(L => L.map((x,i)=> i===idx?{...x,business_id:e.target.value}:x))}
                  onBlur={() => savePerf(lineup[idx])}
                  className="col-span-3 border rounded px-2 py-1">
                  {venues.map(v => (
                    <option key={v.businesses.id} value={v.businesses.id}>
                      {v.display_name ?? v.businesses.name}
                    </option>
                  ))}
                </select>
                <input value={p.start_time_local}
                  onChange={e => setLineup(L => L.map((x,i)=> i===idx?{...x,start_time_local:e.target.value}:x))}
                  onBlur={() => savePerf(lineup[idx])}
                  className="col-span-2 border rounded px-2 py-1" placeholder="18:00" />
                <input value={p.end_time_local}
                  onChange={e => setLineup(L => L.map((x,i)=> i===idx?{...x,end_time_local:e.target.value}:x))}
                  onBlur={() => savePerf(lineup[idx])}
                  className="col-span-2 border rounded px-2 py-1" placeholder="20:00" />
                <input type="number" value={p.order_index}
                  onChange={e => setLineup(L => L.map((x,i)=> i===idx?{...x,order_index:+e.target.value}:x))}
                  onBlur={() => savePerf(lineup[idx])}
                  className="col-span-1 border rounded px-2 py-1" />
                <button onClick={() => deletePerf(p.id)} className="col-span-1 text-red-600 underline">Delete</button>
              </div>
            ))}
            {!lineup.length && <div className="text-sm opacity-70">No slots yet. Click “+ Add slot”.</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
