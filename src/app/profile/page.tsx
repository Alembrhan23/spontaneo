'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type Socials = { website?: string; instagram?: string; twitter?: string; tiktok?: string; linkedin?: string }
type Profile = { full_name: string; avatar_url: string | null; neighborhood: string | null; bio: string | null; is_verified: boolean; socials: Socials }
type Subscription = { stripe_customer_id: string | null; stripe_subscription_id: string | null; price_id: string | null; plan: string | null }

const NEIGHBORHOODS = ['RiNo', 'LoHi', 'Five Points'] as const
const SOCIAL_KEYS: (keyof Socials)[] = ['website', 'instagram', 'twitter', 'tiktok', 'linkedin']

function VerifiedBadge({ small = false }: { small?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full ${small ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-0.5 text-sm'} bg-emerald-600/10 text-emerald-700`} title="ID-verified">
      <svg width="14" height="14" viewBox="0 0 24 24" className="fill-current"><path d="M9 16.2 4.8 12l1.4-1.4L9 13.4l8.8-8.8L19.2 6z" /></svg>
      <span>Verified</span>
    </span>
  )
}
function VibeChip({ balance }: { balance: number }) {
  const tier = balance >= 300 ? 'Rock' : balance >= 150 ? 'Solid' : balance >= 60 ? 'Steady' : 'New'
  return <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-zinc-900 text-white"><span className="font-semibold">{balance} VP</span><span className="text-xs opacity-80">{tier}</span></span>
}
function normalizeUrl(v?: string | null) {
  if (!v) return null
  let s = v.trim()
  if (!s) return null
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s
  try { const u = new URL(s); return u.origin + u.pathname.replace(/\/+$/, '') } catch { return null }
}

export default function ProfilePage() {
  const router = useRouter()

  const [userId, setUserId] = useState<string | null>(null)
  const [p, setP] = useState<Profile>({ full_name: '', avatar_url: null, neighborhood: 'RiNo', bio: '', is_verified: false, socials: {} })
  const [vp, setVp] = useState<number>(0)
  const [sub, setSub] = useState<Subscription | null>(null)
  const [billingBusy, setBillingBusy] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [refreshingVerify, setRefreshingVerify] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const { data: auth } = await supabase.auth.getUser()
      const user = auth.user
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      await supabase.from('profiles').upsert({ id: user.id }, { onConflict: 'id' })

      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, neighborhood, bio, is_verified, socials')
        .eq('id', user.id)
        .maybeSingle()

      setP({
        full_name: prof?.full_name ?? '',
        avatar_url: prof?.avatar_url ?? null,
        neighborhood: (prof?.neighborhood as Profile['neighborhood']) ?? 'RiNo',
        bio: prof?.bio ?? '',
        is_verified: !!prof?.is_verified,
        socials: (prof?.socials ?? {}) as Socials,
      })

      const { data: bal } = await supabase.from('vibe_points_balance').select('balance').eq('user_id', user.id).maybeSingle()
      setVp(bal?.balance ?? 0)

      const { data: subRow } = await supabase
        .from('user_subscriptions')
        .select('stripe_customer_id, stripe_subscription_id, price_id, plan')
        .eq('user_id', user.id)
        .maybeSingle()
      setSub(subRow ?? null)

      setLoading(false)

      // 🔄 live update when webhook writes to profiles
      const ch = supabase
        .channel('profile-verify')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, (payload) => {
          const row = payload.new as any
          if (typeof row.is_verified === 'boolean') {
            setP(prev => ({ ...prev, is_verified: row.is_verified }))
          }
        })
        .subscribe()
      return () => { supabase.removeChannel(ch) }
    })()
  }, [router])

  async function refreshVerification() {
    try {
      setRefreshingVerify(true)
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch('/api/verify/sync', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {} })
      const json = await res.json()
      if (json?.is_verified) setP(prev => ({ ...prev, is_verified: true }))
    } finally { setRefreshingVerify(false) }
  }

  async function startVerification() {
    try {
      setVerifying(true)
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch('/api/verify/start', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {} })
      if (res.status === 401) { router.push('/login?next=/profile'); return }
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error || 'Failed to start verification')
      if (!json.url) throw new Error('No verification URL returned')
      window.location.href = json.url
    } catch (e: any) {
      alert(e?.message || 'Something went wrong.')
    } finally { setVerifying(false) }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setSaving(true)
    const cleaned: Socials = {}
    for (const k of SOCIAL_KEYS) {
      const norm = normalizeUrl((p.socials?.[k] || '').trim()); if (norm) cleaned[k] = norm
    }
    const { error } = await supabase.from('profiles').update({ full_name: p.full_name, avatar_url: p.avatar_url, neighborhood: p.neighborhood, bio: p.bio, socials: cleaned }).eq('id', userId)
    setSaving(false)
    if (error) alert(error.message); else alert('Saved!')
  }

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    if (!userId) return
    const file = e.target.files?.[0]; if (!file) return
    const path = `${userId}/${Date.now()}-${file.name}`
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (upErr) return alert(upErr.message)
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    setP(prev => ({ ...prev, avatar_url: data.publicUrl }))
  }

  async function openPortal() {
    try {
      setBillingBusy(true)
      const res = await fetch('/api/portal', { method: 'POST' })
      if (res.status === 401) { router.push('/login?next=/profile'); return }
      const data = await res.json()
      window.location.href = data?.url || '/pricing?createCustomer=1'
    } catch (e: any) {
      alert(e?.message || 'Something went wrong.')
    } finally { setBillingBusy(false) }
  }

  async function logout() { await supabase.auth.signOut(); router.push('/login') }

  if (loading) return <div className="p-4">Loading…</div>

  const avatarSrc = p.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(p.full_name || 'User')}`
  const showManage = !!(sub?.stripe_customer_id || sub?.stripe_subscription_id)

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <img src={avatarSrc} className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover shrink-0" alt="avatar" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-lg sm:text-xl font-semibold truncate">{p.full_name || 'Your profile'}</h1>
                {p.is_verified && <VerifiedBadge small />}
              </div>
              <div className="mt-2"><VibeChip balance={vp} /></div>
            </div>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            {showManage ? (
              <button onClick={openPortal} disabled={billingBusy} className="flex-1 sm:flex-none rounded-lg border px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50">
                {billingBusy ? 'Opening…' : 'Manage plan'}
              </button>
            ) : (
              <a href="/pricing" className="flex-1 sm:flex-none rounded-lg border px-3 py-2 text-sm hover:bg-zinc-50 text-center">Upgrade</a>
            )}

            {!p.is_verified && (
              <div className="flex gap-2 w-full sm:w-auto">
                <button onClick={startVerification} disabled={verifying} className="flex-1 sm:flex-none rounded-lg bg-emerald-600 text-white px-3 py-2 text-sm hover:bg-emerald-700 text-center disabled:opacity-60">
                  {verifying ? 'Opening…' : 'Verify'}
                </button>
                <button type="button" onClick={refreshVerification} disabled={refreshingVerify}
                        className="flex-1 sm:flex-none rounded-lg border px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60"
                        title="Refresh verification status">
                  {refreshingVerify ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>
            )}

            <button onClick={logout} className="flex-1 sm:flex-none rounded-lg border px-3 py-2 text-sm hover:bg-zinc-50">
              Log out
            </button>
          </div>
        </div>

        {/* form & rest of your page unchanged below */}
        {/* ... keep all your existing fields, save(), links, billing summary, etc ... */}
      </div>
    </div>
  )
}
