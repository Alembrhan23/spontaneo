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
  const [focused, setFocused] = useState(false)        // NEW: track focus
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<Place[]>([])
  const [hi, setHi] = useState(0)                      // NEW: highlighted index
  const [suppressOpen, setSuppressOpen] = useState(false) // NEW: prevents immediate reopen after select

  const abortRef = useRef<AbortController | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // keep external value in sync
  useEffect(() => { setQuery(value ?? '') }, [value])

  // fetch suggestions with debounce
  useEffect(() => {
    if (!token) return
    const q = query.trim()
    if (q.length < minChars) { setResults([]); setOpen(false); return }

    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`)
    url.searchParams.set('access_token', token)
    url.searchParams.set('autocomplete', 'true')
    url.searchParams.set('limit', '5')
    url.searchParams.set('country', 'US')
    url.searchParams.set('proximity', '-104.99,39.74') // Denver

    const t = setTimeout(async () => {
      try {
        const res = await fetch(url.toString(), { signal: ac.signal })
        if (!res.ok) { setResults([]); setOpen(false); return }
        const data = await res.json()
        const feats: Place[] = (data.features || []).map((f: any) => ({
          id: f.id, place_name: f.place_name, center: f.center as [number, number]
        }))
        setResults(feats)
        // Only open if input is focused and not suppressed
        setOpen(focused && !suppressOpen && feats.length > 0)
        setHi(0)
      } catch {/* ignore */}
    }, 220)

    return () => { clearTimeout(t); ac.abort() }
  }, [query, token, minChars, focused, suppressOpen])

  // close on click outside
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current || wrapRef.current.contains(e.target as Node)) return
      setOpen(false); setFocused(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  function choose(p: Place) {
    setQuery(p.place_name)
    setResults([])
    setOpen(false)
    setSuppressOpen(true)          // prevent immediate reopen from fetch
    setTimeout(() => setSuppressOpen(false), 400)
    onSelect({ name: p.place_name, lat: p.center[1], lng: p.center[0] })
    // Blur to hide native suggestions on mobile and keep UI tidy
    requestAnimationFrame(() => inputRef.current?.blur())
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') { setOpen(false); return }
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi(i => Math.min(results.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(i => Math.max(0, i - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); choose(results[hi]) }
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => { setFocused(true); if (results.length) setOpen(true) }}
        onBlur={() => { setFocused(false); setOpen(false) }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full border rounded p-2"
        autoComplete="off"
      />

      {token && open && focused && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow max-h-64 overflow-auto">
          {results.map((r, idx) => (
            <li key={r.id}>
              <button
                type="button"
                // prevent blur until click handler runs
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(r)}
                className={`w-full text-left px-3 py-2 hover:bg-indigo-50 ${idx === hi ? 'bg-indigo-50' : ''}`}
              >
                {r.place_name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {!token && (
        <div className="mt-1 text-xs text-amber-600">
          Places autocomplete disabled (missing <code>NEXT_PUBLIC_MAPBOX_TOKEN</code>).
        </div>
      )}
    </div>
  )
}
