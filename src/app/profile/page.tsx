// app/profile/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type Profile = {
  full_name: string
  avatar_url: string | null
  neighborhood: string | null
  bio: string | null
}

const NEIGHBORHOODS = ['RiNo', 'LoHi', 'Five Points'] as const

export default function ProfilePage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [p, setP] = useState<Profile>({
    full_name: '',
    avatar_url: null,
    neighborhood: 'RiNo',
    bio: '',
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      // Safety net: ensure a row exists (trigger usually creates it)
      await supabase.from('profiles')
        .upsert({ id: user.id }, { onConflict: 'id' })

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, neighborhood, bio')
        .eq('id', user.id)
        .maybeSingle()

      if (error) {
        console.error(error)
      }

      setP({
        full_name: data?.full_name ?? '',
        avatar_url: data?.avatar_url ?? null,
        neighborhood: data?.neighborhood ?? 'RiNo',
        bio: data?.bio ?? '',
      })
      setLoading(false)
    })()
  }, [router])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setSaving(true)

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        neighborhood: p.neighborhood,
        bio: p.bio,
      })
      .eq('id', userId)

    setSaving(false)
    if (error) return alert(error.message)
    alert('Saved!')
  }

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    if (!userId) return
    const file = e.target.files?.[0]
    if (!file) return

    const path = `${userId}/${Date.now()}-${file.name}`
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (upErr) return alert(upErr.message)

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    setP(prev => ({ ...prev, avatar_url: data.publicUrl }))
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return <div>Loading…</div>

  const avatarSrc =
    p.avatar_url ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(p.full_name || 'User')}`

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow p-6 space-y-6">
      <div className="flex items-center gap-4">
        <img src={avatarSrc} className="w-20 h-20 rounded-full" alt="avatar" />
        <div>
          <label className="inline-block px-4 py-2 rounded-lg bg-indigo-50 text-indigo-700 cursor-pointer">
            Change Avatar
            <input type="file" accept="image/*" className="hidden" onChange={onPickAvatar} />
          </label>
          <div className="text-xs text-gray-500 mt-1">JPG/PNG, ~2MB</div>
        </div>
        <button onClick={logout} className="ml-auto text-sm text-red-600 hover:underline">Log out</button>
      </div>

      <form onSubmit={save} className="space-y-4">
        <div>
          <label className="text-sm text-gray-600">Full name</label>
          <input
            className="mt-1 w-full border rounded p-2"
            value={p.full_name}
            onChange={e => setP({ ...p, full_name: e.target.value })}
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">Neighborhood</label>
          <select
            className="mt-1 w-full border rounded p-2"
            value={p.neighborhood ?? 'RiNo'}
            onChange={e => setP({ ...p, neighborhood: e.target.value })}
          >
            {NEIGHBORHOODS.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        <div>
          <label className="text-sm text-gray-600">Bio</label>
          <textarea
            className="mt-1 w-full border rounded p-2"
            rows={3}
            value={p.bio ?? ''}
            onChange={e => setP({ ...p, bio: e.target.value })}
          />
        </div>

        <button
          disabled={saving}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  )
}
