'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

const options = ['RiNo','LoHi','Five Points']

export default function Neighborhood() {
  const [current, setCurrent] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('default_neighborhood').eq('id', user.id).maybeSingle()
      setCurrent(data?.default_neighborhood || 'RiNo')
    })()
  }, [])

  async function save(n) {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').upsert({ id: user.id, default_neighborhood: n }, { onConflict: 'id' })
    setCurrent(n); setSaving(false)
  }

  return (
    <div className="max-w-md bg-white shadow rounded-2xl p-6">
      <h1 className="text-xl font-bold mb-4">Default Neighborhood</h1>
      <div className="flex gap-2 flex-wrap">
        {options.map(o => (
          <button key={o} onClick={()=>save(o)}
            className={`px-4 py-2 rounded-full ${current===o ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}>
            {o}
          </button>
        ))}
      </div>
      {saving && <div className="text-sm text-gray-500 mt-3">Saving…</div>}
    </div>
  )
}
