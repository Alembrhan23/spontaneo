'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type Socials = { website?: string; instagram?: string; twitter?: string; tiktok?: string; linkedin?: string }
type Profile = {
  full_name: string
  avatar_url: string | null
  neighborhood: string | null
  bio: string | null
  is_verified: boolean
  socials: Socials
}

const NEIGHBORHOODS = ['RiNo', 'LoHi', 'Five Points'] as const
const SOCIAL_KEYS: (keyof Socials)[] = ['website','instagram','twitter','tiktok','linkedin']

function VerifiedBadge({ small=false }:{ small?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full ${
        small ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-0.5 text-sm'
      } bg-emerald-600/10 text-emerald-700`}
      title="ID-verified"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" className="fill-current">
        <path d="M9 16.2 4.8 12l1.4-1.4L9 13.4l8.8-8.8L19.2 6z"/>
      </svg>
      <span>Verified</span>
    </span>
  )
}

function VibeChip({ balance }:{ balance: number }) {
  const tier = balance >= 300 ? 'Rock' : balance >= 150 ? 'Solid' : balance >= 60 ? 'Steady' : 'New'
  return (
    <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-zinc-900 text-white">
      <span className="font-semibold">{balance} VP</span>
      <span className="text-xs opacity-80">{tier}</span>
    </span>
  )
}

function normalizeUrl(v?: string | null) {
  if (!v) return null
  let s = v.trim()
  if (!s) return null
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s
  try {
    const u = new URL(s)
    return u.origin + u.pathname.replace(/\/+$/,'')
  } catch { return null }
}

export default function ProfilePage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [p, setP] = useState<Profile>({
    full_name: '',
    avatar_url: null,
    neighborhood: 'RiNo',
    bio: '',
    is_verified: false,
    socials: {}
  })
  const [vp, setVp] = useState<number>(0)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      await supabase.from('profiles').upsert({ id: user.id }, { onConflict: 'id' })

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, neighborhood, bio, is_verified, socials')
        .eq('id', user.id)
        .maybeSingle()

      if (error) console.error(error)

      setP({
        full_name: data?.full_name ?? '',
        avatar_url: data?.avatar_url ?? null,
        neighborhood: (data?.neighborhood as Profile['neighborhood']) ?? 'RiNo',
        bio: data?.bio ?? '',
        is_verified: !!data?.is_verified,
        socials: (data?.socials ?? {}) as Socials
      })

      const { data: bal } = await supabase
        .from('vibe_points_balance')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle()
      setVp(bal?.balance ?? 0)

      setLoading(false)
    })()
  }, [router])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setSaving(true)

    const cleaned: Socials = {}
    for (const key of SOCIAL_KEYS) {
      const raw = (p.socials?.[key] || '').trim()
      const norm = normalizeUrl(raw)
      if (norm) cleaned[key] = norm
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        neighborhood: p.neighborhood,
        bio: p.bio,
        socials: cleaned
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

  if (loading) return <div className="p-4">Loading…</div>

  const avatarSrc =
    p.avatar_url ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(p.full_name || 'User')}`

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow p-4 sm:p-6 space-y-6">
        {/* Header — mobile-first: stack; on sm+ make it a row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <img
              src={avatarSrc}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover shrink-0"
              alt="avatar"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-lg sm:text-xl font-semibold truncate">
                  {p.full_name || 'Your profile'}
                </h1>
                {p.is_verified && <VerifiedBadge small />}
              </div>
              <div className="mt-2">
                <VibeChip balance={vp} />
              </div>
            </div>
          </div>

          {/* Actions — full-width on mobile, inline on desktop */}
          <div className="flex gap-2 w-full sm:w-auto">
            {!p.is_verified && (
              <a
                href="/verify/start"
                className="flex-1 sm:flex-none rounded-lg bg-emerald-600 text-white px-3 py-2 text-sm hover:bg-emerald-700 text-center"
              >
                Verify
              </a>
            )}
            <button
              onClick={logout}
              className="flex-1 sm:flex-none rounded-lg border px-3 py-2 text-sm hover:bg-zinc-50"
            >
              Log out
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="text-sm text-gray-600">Full name</label>
            <input
              className="mt-1 w-full border rounded-lg p-2"
              value={p.full_name}
              onChange={e => setP({ ...p, full_name: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Neighborhood</label>
            <select
              className="mt-1 w-full border rounded-lg p-2"
              value={p.neighborhood ?? 'RiNo'}
              onChange={e => setP({ ...p, neighborhood: e.target.value })}
            >
              {NEIGHBORHOODS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-600">Bio</label>
            <textarea
              className="mt-1 w-full border rounded-lg p-2"
              rows={3}
              value={p.bio ?? ''}
              onChange={e => setP({ ...p, bio: e.target.value })}
            />
          </div>

          {/* Socials */}
          <div className="grid gap-4 sm:grid-cols-2">
            {SOCIAL_KEYS.map(k => (
              <label key={k} className="block">
                <span className="text-sm capitalize">{k}</span>
                <input
                  className="mt-1 w-full border rounded-lg p-2"
                  placeholder={
                    k === 'website' ? 'https://your-site.com'
                      : k === 'instagram' ? 'https://instagram.com/yourhandle'
                      : k === 'twitter' ? 'https://twitter.com/yourhandle'
                      : k === 'tiktok' ? 'https://www.tiktok.com/@yourhandle'
                      : 'https://www.linkedin.com/in/yourhandle'
                  }
                  value={(p.socials?.[k] as string) || ''}
                  onChange={e => setP({ ...p, socials: { ...p.socials, [k]: e.target.value } })}
                />
              </label>
            ))}
          </div>

          <button
            disabled={saving}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>

        {/* Preview links */}
        <div>
          <h2 className="font-semibold mb-2">Your links</h2>
          <div className="flex flex-wrap gap-2">
            {SOCIAL_KEYS.filter(k => p.socials?.[k]).map(k => {
              const href = p.socials?.[k] as string
              let host = href
              try { host = new URL(href).hostname } catch {}
              return (
                <a
                  key={k}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-sm hover:bg-zinc-50 max-w-[70vw] sm:max-w-none"
                  title={href}
                >
                  <span>
                    {k === 'website' ? '🌐' : k === 'instagram' ? '📸' : k === 'twitter' ? '🐦' : k === 'tiktok' ? '🎵' : '💼'}
                  </span>
                  <span className="truncate">{host}</span>
                </a>
              )
            })}
            {SOCIAL_KEYS.every(k => !p.socials?.[k]) && (
              <div className="text-sm text-gray-500">No social links yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
