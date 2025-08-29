'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type Biz = { id: string; name: string; neighborhood: string; image_url: string | null }

// normalize slugs (handles punctuation & spaces)
function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/['’]/g, '')          // remove apostrophes/curly quotes
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')   // non-alphanum -> -
    .replace(/(^-|-$)/g, '')
    .replace(/--+/g, '-')
}

// overrides for tricky names
const SLUG_OVERRIDES: Record<string, string> = {
  "Cervantes’ Masterpiece Ballroom": "cervantes-masterpiece-ballroom",
  "Cervantes' Masterpiece Ballroom": "cervantes-masterpiece-ballroom",
  "Welton Room / Monkey Bar": "welton-room-monkey-bar",
  "The Marigold (Mary Gold)": "the-marigold-mary-gold",
}

export default function BulkBusinessImages() {
  const [rows, setRows] = useState<Biz[]>([])
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const [unmatched, setUnmatched] = useState<File[]>([])

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from('businesses')
        .select('id,name,neighborhood,image_url')
        .order('neighborhood').order('name')
      setRows(data || [])
    })()
  }, [])

  const bySlug = useMemo(() => {
    const map = new Map<string, Biz>()
    for (const b of rows) {
      const slug = SLUG_OVERRIDES[b.name] || slugify(b.name)
      map.set(slug, b)
    }
    return map
  }, [rows])

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setBusy(true)
    const logs: string[] = []
    const notMatched: File[] = []

    for (const file of Array.from(files)) {
      try {
        const base = file.name.replace(/\.[^.]+$/, '')
        const slug = slugify(base)
        const biz = bySlug.get(slug)
        if (!biz) {
          notMatched.push(file)
          logs.push(`❓ No match for "${file.name}" (slug: ${slug})`)
          continue
        }

        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
        const key = `${biz.id}/${Date.now()}.${ext}`

        // upload
        const { error: upErr } = await supabase.storage
          .from('business-images')
          .upload(key, file, { cacheControl: '3600', upsert: true })
        if (upErr) throw upErr

        // public URL
        const { data: pub } = supabase.storage
          .from('business-images')
          .getPublicUrl(key)
        const url = pub.publicUrl

        // save on business
        const { error: dbErr } = await supabase
          .from('businesses')
          .update({ image_url: url })
          .eq('id', biz.id)
        if (dbErr) throw dbErr

        // live update UI
        setRows(r => r.map(x => x.id === biz.id ? { ...x, image_url: url } : x))
        logs.push(`✅ ${biz.name} ← ${file.name}`)
      } catch (e: any) {
        logs.push(`❌ ${file.name}: ${e.message || e}`)
      }
    }

    setLog(prev => [...logs, ...prev])
    setUnmatched(notMatched)
    setBusy(false)
  }

  async function assignUnmatched(file: File, businessId: string) {
    const biz = rows.find(b => b.id === businessId)
    if (!biz) return
    setBusy(true)
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const key = `${biz.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('business-images').upload(key, file, { cacheControl: '3600', upsert: true })
      if (upErr) throw upErr
      const { data: pub } = supabase.storage.from('business-images').getPublicUrl(key)
      const url = pub.publicUrl
      const { error: dbErr } = await supabase.from('businesses').update({ image_url: url }).eq('id', biz.id)
      if (dbErr) throw dbErr
      setRows(r => r.map(x => x.id === biz.id ? { ...x, image_url: url } : x))
      setLog(prev => [`✅ (manual) ${biz.name} ← ${file.name}`, ...prev])
      setUnmatched(u => u.filter(f => f !== file))
    } catch (e: any) {
      setLog(prev => [`❌ (manual) ${file.name}: ${e.message || e}`, ...prev])
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Bulk upload business images</h1>
        <a href="/admin/partners" className="ml-auto underline">Back to Partners</a>
      </header>

      <section className="rounded-2xl border bg-white p-5">
        <p className="text-sm text-gray-600">
          Name your files using the business <b>slug</b>. Example:
          <code className="ml-1 rounded bg-gray-100 px-1 py-0.5">nocturne-jazz-supper-club.jpg</code>,
          <code className="ml-1 rounded bg-gray-100 px-1 py-0.5">welton-room-monkey-bar.png</code>.
        </p>
        <div className="mt-4">
          <label className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer hover:bg-gray-50">
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e)=>handleFiles(e.target.files)} disabled={busy} />
            {busy ? 'Uploading…' : 'Choose images'}
          </label>
        </div>
      </section>

      {unmatched.length > 0 && (
        <section className="rounded-2xl border bg-white p-5">
          <h2 className="font-semibold mb-2">Unmatched files</h2>
          <div className="space-y-2">
            {unmatched.map(file => (
              <div key={file.name} className="flex items-center gap-2">
                <span className="text-sm">{file.name}</span>
                <select className="ml-auto border rounded px-2 py-1 text-sm"
                        onChange={e => e.target.value && assignUnmatched(file, e.target.value)}>
                  <option value="">Assign to business…</option>
                  {rows.map(b => <option key={b.id} value={b.id}>{b.neighborhood} — {b.name}</option>)}
                </select>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {rows.map(b => (
          <article key={b.id} className="flex gap-3 items-center rounded-xl border p-3">
            <div className="h-16 w-16 overflow-hidden rounded-lg border bg-gray-50">
              {b.image_url
                ? <img src={b.image_url} alt="" className="h-full w-full object-cover" />
                : <div className="grid h-full w-full place-items-center text-xs text-gray-400">No image</div>}
            </div>
            <div className="min-w-0">
              <div className="font-medium truncate">{b.name}</div>
              <div className="text-xs text-gray-500">{b.neighborhood}</div>
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <h2 className="font-semibold mb-2">Log</h2>
        <div className="text-xs text-gray-700 space-y-1 max-h-64 overflow-auto">
          {log.length ? log.map((l, i) => <div key={i}>{l}</div>) : <div>No activity yet.</div>}
        </div>
      </section>
    </main>
  )
}
