'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type Occ = { id: string; event_date: string; theme: string | null; poster_url: string | null }
type Perf = {
  id: string; occurrence_id: string; artist: string;
  start_time_local: string; end_time_local: string; order_index: number;
  business: { id: string; name: string }; external_url?: string | null
}
type RsvpStatus = 'interested' | 'going'

/* ---------- helpers ---------- */
function localDateFromISO(iso: string){ const [y,m,d]=iso.split('-').map(Number); return new Date(y,m-1,d) }
function toMeridiem(hhmm: string){ const [hStr,mStr]=hhmm.split(':'); const hh=+hStr, mm=+(mStr??'0'); const mer=hh>=12?'PM':'AM'; let h=hh%12; if(h===0) h=12; const min=mm===0?'':`:${String(mm).padStart(2,'0')}`; return {h,min,mer} }
function formatTimeRange(start:string,end:string){ const s=toMeridiem(start), e=toMeridiem(end); return `${s.h}${s.min}–${e.h}${e.min}${e.mer}` }
function parseMin(t:string){ const [H,M]=t.split(':').map(Number); return H*60+(M||0) }
function minutesToHHMM(min:number){ const H=Math.floor(min/60)%24, M=min%60; return `${String(H).padStart(2,'0')}:${String(M).padStart(2,'0')}` }
function computeWindow(perfs:Perf[]){ if(!perfs.length) return null; const starts=perfs.map(p=>parseMin(p.start_time_local)); const minStart=Math.min(...starts); const ends=perfs.map(p=>{const m=parseMin(p.end_time_local); return m<minStart?m+1440:m}); const maxEnd=Math.max(...ends); return formatTimeRange(minutesToHHMM(minStart), minutesToHHMM(maxEnd%1440)) }
function resolvePosterUrl(raw?: string | null) {
  if (!raw) return null
  if (/^https?:\/\//i.test(raw)) return raw
  const { data } = supabase.storage.from('business-images').getPublicUrl(raw)
  return data.publicUrl ?? null
}

/* ---------- countdown helpers ---------- */
function buildPerfDateTimes(eventISO: string, startHHMM: string, endHHMM: string) {
  const [y,m,d] = eventISO.split('-').map(Number)
  const sMin = parseMin(startHHMM)
  const eMin = parseMin(endHHMM)
  const start = new Date(y, m-1, d, Math.floor(sMin/60), sMin%60, 0, 0)
  const durMin = eMin >= sMin ? (eMin - sMin) : (eMin + 1440 - sMin) // cross-midnight
  const end = new Date(start.getTime() + durMin*60_000)
  return { start, end }
}
function formatDuration(ms: number) {
  if (ms < 0) ms = 0
  const totalSec = Math.floor(ms/1000)
  const d = Math.floor(totalSec/86400)
  const h = Math.floor((totalSec%86400)/3600)
  const m = Math.floor((totalSec%3600)/60)
  const s = totalSec%60
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}
function useCountdown(start: Date, end: Date) {
  const [now, setNow] = useState<Date>(() => new Date())
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id) }, [])
  const status = now < start ? 'upcoming' : (now >= start && now < end ? 'live' : 'ended')
  const remaining = status === 'upcoming' ? (start.getTime() - now.getTime())
                   : status === 'live'     ? (end.getTime() - now.getTime())
                   : 0
  return { status, remainingText: formatDuration(remaining) }
}

/* ---------- tiny UI atoms ---------- */
function Badge({children,className=''}:{children:React.ReactNode;className?:string}) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>{children}</span>
}
function SectionTitle({children}:{children:React.ReactNode}) {
  return <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">{children}</h2>
}
function Shimmer(){ return (
  <div className="animate-pulse space-y-4">
    <div className="h-7 w-56 rounded-lg bg-slate-200 dark:bg-slate-700" />
    <div className="h-[520px] w-full rounded-3xl bg-slate-200 dark:bg-slate-700" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-700" />
      <div className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-700" />
    </div>
  </div>
)}

/* ---------- page ---------- */
export default function FirstFridayPage() {
  const [allOccs,setAllOccs]=useState<Occ[]>([])
  const [occ,setOcc]=useState<Occ|null>(null)
  const [posterUrl,setPosterUrl]=useState<string|null>(null)
  const [posterError,setPosterError]=useState(false)
  const [perfs,setPerfs]=useState<Perf[]>([])
  const [loading,setLoading]=useState(true)

  const [userId,setUserId] = useState<string|null>(null)
  const [rsvpMap,setRsvpMap] = useState<Record<string, RsvpStatus | null>>({})
  const [saving,setSaving] = useState<Record<string, boolean>>({})

  const params=useSearchParams(); const router=useRouter(); const selectedId=params.get('occ')

  useEffect(()=>{ supabase.auth.getUser().then(({data})=> setUserId(data.user?.id ?? null)) },[])

  useEffect(()=>{ (async()=>{
    setLoading(true)
    const { data:occs } = await supabase.from('first_friday_occurrences')
      .select('id,event_date,theme,poster_url').eq('is_published',true).order('event_date',{ascending:true})
    const list=(occs??[]) as Occ[]; setAllOccs(list)
    const todayISO=new Date().toISOString().slice(0,10)
    const chosen=(selectedId?list.find(o=>o.id===selectedId):undefined) ?? list.find(o=>o.event_date>=todayISO) ?? (list.length?list[list.length-1]:null)
    setOcc(chosen??null)
    if (chosen){
      const url = resolvePosterUrl(chosen.poster_url ?? undefined)
      setPosterUrl(url); setPosterError(false)
      const { data:lineup } = await supabase.from('first_friday_performances')
        .select('id,occurrence_id,artist,start_time_local,end_time_local,order_index,external_url,businesses:business_id(id,name)')
        .eq('occurrence_id', chosen.id).order('order_index',{ascending:true})
      setPerfs((lineup??[]).map((r:any)=>({...r, business:{id:r.businesses?.id, name:r.businesses?.name}})))
    } else { setPerfs([]); setPosterUrl(null); setPosterError(false) }
    setLoading(false)
  })() },[selectedId])

  // Load my RSVPs once perf list & user ready
  useEffect(()=>{ (async()=>{
    if (!userId || !perfs.length) { setRsvpMap({}); return }
    const ids = perfs.map(p=>p.id)
    const { data } = await supabase.from('ff_rsvps')
      .select('performance_id,status')
      .eq('user_id', userId)
      .in('performance_id', ids)
    const map: Record<string, RsvpStatus | null> = {}
    ids.forEach(id => map[id] = null)
    ;(data||[]).forEach(r => { map[r.performance_id] = r.status as RsvpStatus })
    setRsvpMap(map)
  })() },[userId, perfs])

  const previous = useMemo(()=>!occ?[]:allOccs.filter(o=>o.id!==occ.id).slice().reverse(),[allOccs,occ])
  const stats = useMemo(()=>({ acts: perfs.length, venues: new Set(perfs.map(p=>p.business?.name??'')).size, window: computeWindow(perfs)}),[perfs])

  // Earliest start for hero countdown
  const heroTimes = useMemo(() => {
    if (!occ || !perfs.length) return null
    const minStartPerf = perfs.reduce((a,b) =>
      parseMin(a.start_time_local) <= parseMin(b.start_time_local) ? a : b
    )
    const { start, end } = buildPerfDateTimes(occ.event_date, minStartPerf.start_time_local, minStartPerf.end_time_local)
    return { start, end }
  }, [occ, perfs])

  async function toggleRSVP(perfId: string, status: RsvpStatus) {
    if (!userId) { router.push('/login'); return }
    setSaving(s => ({ ...s, [perfId]: true }))
    setRsvpMap(m => {
      const next = { ...m }
      next[perfId] = next[perfId] === status ? null : status
      return next
    }) // optimistic

    const desired = (rsvpMap[perfId] === status) ? null : status
    try {
      if (desired) {
        await supabase.from('ff_rsvps').upsert(
          [{ user_id: userId, performance_id: perfId, status: desired }],
          { onConflict: 'user_id,performance_id' }
        )
      } else {
        await supabase.from('ff_rsvps')
          .delete()
          .eq('user_id', userId)
          .eq('performance_id', perfId)
      }
    } finally {
      setSaving(s => ({ ...s, [perfId]: false }))
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-8 md:py-10">

        {/* HERO — poster LEFT, copy RIGHT */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg bg-white dark:bg-slate-900">
          <div className="grid lg:grid-cols-[1fr_1.4fr]">
            {/* LEFT: poster */}
            <div className="relative lg:min-h-[560px]">
              <div className="h-full w-full lg:aspect-[3/4]">
                {posterUrl && !posterError ? (
                  <img
                    src={posterUrl}
                    alt="First Friday poster"
                    className="h-full w-full object-cover rounded-b-none lg:rounded-r-none rounded-t-3xl lg:rounded-tl-3xl lg:rounded-bl-3xl"
                    loading="lazy"
                    onError={() => setPosterError(true)}
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-b-none lg:rounded-r-none rounded-t-3xl lg:rounded-tl-3xl lg:rounded-bl-3xl">
                    <div className="text-center p-6">
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Poster unavailable</div>
                    </div>
                  </div>
                )}
              </div>
              <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/5 dark:ring-white/5" />
            </div>

            {/* RIGHT: copy */}
            <div className="p-6 md:p-10 min-h-[420px] lg:min-h-[560px] flex flex-col justify-center">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge className="bg-indigo-600 text-white">First Friday • Five Points</Badge>
                {stats.window && <Badge className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">{stats.window}</Badge>}
                {heroTimes && <HeroCountdown start={heroTimes.start} end={heroTimes.end} />}
              </div>

              <h1 className="text-3xl md:text-4xl font-bold leading-tight text-slate-900 dark:text-white">
                {occ ? `First Friday — ${localDateFromISO(occ.event_date).toLocaleDateString()}` : 'First Friday'}
              </h1>

              {occ?.theme && <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">{occ.theme}</p>}

              <div className="mt-8 flex flex-wrap gap-3">
                <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-200 dark:border-indigo-700/40">{stats.acts} Acts</Badge>
                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700/40">{stats.venues} Venues</Badge>
                <Badge className="bg-slate-100 text-slate-800 border border-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700">Live Jazz • Community</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* BODY — lineup + previous on RIGHT */}
        <div className="mt-10 grid lg:grid-cols-3 gap-8">
          {/* LINEUP */}
          <div className="lg:col-span-2">
            <SectionTitle>Lineup</SectionTitle>
            <div className="mt-4">
              {loading ? (
                <Shimmer />
              ) : perfs.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {perfs.map((p)=>{
                    const { start, end } = buildPerfDateTimes(occ!.event_date, p.start_time_local, p.end_time_local)
                    const my = rsvpMap[p.id] || null
                    const busy = !!saving[p.id]
                    return (
                      <div
                        key={p.id}
                        className="group h-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-lg hover:-translate-y-[2px] transition-all"
                      >
                        <div className="p-4 h-full flex flex-col gap-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">{p.artist}</div>
                              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300 truncate">{p.business?.name}</div>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="mb-1">
                                <span className="inline-flex items-center rounded-xl px-2.5 py-1 text-xs font-semibold bg-indigo-600 text-white">
                                  {formatTimeRange(p.start_time_local, p.end_time_local)}
                                </span>
                              </div>
                              <CountdownBadge start={start} end={end} />
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="mt-1 flex items-center gap-2">
                            <button
                              disabled={busy}
                              onClick={() => toggleRSVP(p.id, 'interested')}
                              className={`h-8 rounded-lg px-3 text-xs font-semibold transition-colors border
                                ${my==='interested'
                                  ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-400/15 dark:text-amber-200 dark:border-amber-400/20'
                                  : 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-700'}`}
                            >
                              Interested
                            </button>

                            <button
                              disabled={busy}
                              onClick={() => toggleRSVP(p.id, 'going')}
                              className={`h-8 rounded-lg px-3 text-xs font-semibold transition-colors border
                                ${my==='going'
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-700'}`}
                            >
                              Going
                            </button>

                            {p.external_url && (
                              <a
                                href={p.external_url}
                                target="_blank"
                                className="ml-auto h-8 inline-flex items-center rounded-lg px-3 text-xs font-semibold border bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50 dark:bg-slate-900 dark:text-indigo-200 dark:border-indigo-900/40 dark:hover:bg-indigo-900/20"
                              >
                                Details
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-sm text-slate-600 dark:text-slate-300">
                  No lineup added yet.
                </div>
              )}
            </div>
          </div>

          {/* PREVIOUS */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-8">
              <SectionTitle>Previous First Fridays</SectionTitle>
              <div className="mt-4">
                {loading ? (
                  <Shimmer />
                ) : previous.length ? (
                  <div className="grid gap-3">
                    {previous.map(prev=>(
                      <button
                        key={prev.id}
                        onClick={()=>router.push(`/first-friday?occ=${prev.id}`)}
                        className="text-left rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900/90 transition-colors overflow-hidden"
                      >
                        {resolvePosterUrl(prev.poster_url) && (
                          <img src={resolvePosterUrl(prev.poster_url)!} alt="" className="h-32 w-full object-cover" loading="lazy" />
                        )}
                        <div className="p-3">
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {localDateFromISO(prev.event_date).toLocaleDateString()}
                          </div>
                          {prev.theme && <div className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{prev.theme}</div>}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-sm text-slate-600 dark:text-slate-300">
                    No past events yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

/* ---------- countdown UI pieces ---------- */

function CountdownBadge({ start, end }: { start: Date; end: Date }) {
  const { status, remainingText } = useCountdown(start, end)
  if (status === 'upcoming') {
    return (
      <span className="inline-flex items-center rounded-xl px-2.5 py-1 text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200">
        Starts in {remainingText}
      </span>
    )
  }
  if (status === 'live') {
    return (
      <span className="inline-flex items-center rounded-xl px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 text-white">
        Live • {remainingText} left
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-xl px-2.5 py-1 text-[11px] font-semibold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
      Ended
    </span>
  )
}

function HeroCountdown({ start, end }: { start: Date; end: Date }) {
  const { status, remainingText } = useCountdown(start, end)
  if (status === 'upcoming') {
    return <Badge className="bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-400/15 dark:text-amber-200 dark:border-amber-400/20">Starts in {remainingText}</Badge>
  }
  if (status === 'live') {
    return <Badge className="bg-emerald-600 text-white">Live now • {remainingText} left</Badge>
  }
  return <Badge className="bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">Ended</Badge>
}
