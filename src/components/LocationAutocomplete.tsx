// components/LocationAutocomplete.tsx
'use client'

import { useEffect, useRef, useState } from 'react'

type Place = {
  id: string
  place_name: string
  center: [number, number] // [lng, lat]
}

export default function LocationAutocomplete({
  value,
  onSelect,
  placeholder = 'Search a place…',
  minChars = 2,
}: {
  value?: string
  onSelect: (p: { name: string; lat: number; lng: number }) => void
  placeholder?: string
  minChars?: number
}) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const [query, setQuery] = useState(value ?? '')
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<Place[]>([])
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => { setQuery(value ?? '') }, [value])

  useEffect(() => {
    if (!token) return // no token: silently degrade to plain input
    const q = query.trim()
    if (q.length < minChars) { setResults([]); setOpen(false); return }

    // cancel previous request
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`)
    url.searchParams.set('access_token', token)
    url.searchParams.set('autocomplete', 'true')
    url.searchParams.set('limit', '5')
    url.searchParams.set('country', 'US')
    // IMPORTANT: ASCII minus, not Unicode minus
    url.searchParams.set('proximity', '-104.99,39.74') // Denver area

    const t = setTimeout(async () => {
      try {
        const res = await fetch(url.toString(), { signal: ac.signal })
        if (!res.ok) { setResults([]); setOpen(false); return }
        const data = await res.json()
        const feats = (data.features || []).map((f: any) => ({
          id: f.id, place_name: f.place_name, center: f.center as [number, number]
        }))
        setResults(feats)
        setOpen(feats.length > 0)
      } catch {
        /* ignore */
      }
    }, 220) // tiny debounce

    return () => { clearTimeout(t); ac.abort() }
  }, [query, token, minChars])

  function choose(p: Place) {
    setQuery(p.place_name)
    setOpen(false)
    onSelect({ name: p.place_name, lat: p.center[1], lng: p.center[0] })
  }

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        placeholder={placeholder}
        className="w-full border rounded p-2"
        autoComplete="off"
      />
      {token && open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow max-h-64 overflow-auto">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => choose(r)}
              className="w-full text-left px-3 py-2 hover:bg-gray-50"
            >
              {r.place_name}
            </button>
          ))}
        </div>
      )}
      {!token && (
        <div className="mt-1 text-xs text-amber-600">
          Places autocomplete disabled (missing <code>NEXT_PUBLIC_MAPBOX_TOKEN</code>).
        </div>
      )}
    </div>
  )
}
