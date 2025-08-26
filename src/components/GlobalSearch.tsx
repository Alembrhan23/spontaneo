'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [acts, setActs] = useState<any[]>([])
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current || wrapRef.current.contains(e.target as Node)) return
      onClose()
    }
    if (open) {
      document.addEventListener('keydown', onKey)
      document.addEventListener('mousedown', onDoc)
    }
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDoc)
    }
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(async () => {
      const s = q.trim()
      if (!s) { setActs([]); return }
      setLoading(true)
      const { data, error } = await supabase
        .from('activities')
        .select('id, title, neighborhood, start_at')
        .or(`title.ilike.%${s}%,description.ilike.%${s}%`)
        .order('start_at', { ascending: true })
        .limit(10)
      if (!error) setActs(data ?? [])
      setLoading(false)
    }, 220)
    return () => clearTimeout(t)
  }, [q, open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-[1px]">
      <div ref={wrapRef} className="mx-auto mt-24 w-full max-w-2xl rounded-2xl bg-white shadow-xl border">
        <div className="p-3 border-b">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search activities…"
            className="w-full outline-none text-lg"
          />
        </div>

        {loading ? (
          <div className="p-6 text-sm text-zinc-500">Searching…</div>
        ) : (
          <ul className="p-2 max-h-96 overflow-auto">
            {acts.length === 0 && <li className="px-3 py-2 text-sm text-zinc-500">No results</li>}
            {acts.map((a) => (
              <li key={a.id}>
                <button
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-indigo-50"
                  onClick={() => { onClose(); router.push(`/activities/${a.id}`) }}
                >
                  <div className="font-medium">{a.title}</div>
                  <div className="text-xs text-zinc-500">
                    {a.neighborhood || '—'} • {new Date(a.start_at).toLocaleString()}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="p-3 border-t text-xs text-zinc-500 flex items-center justify-between">
          <span>Type to search • Enter to open</span>
          <span className="hidden md:block">Ctrl/⌘ K or /</span>
        </div>
      </div>
    </div>
  )
}
