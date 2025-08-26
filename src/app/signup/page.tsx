// app/signup/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function signup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })

    if (error) {
      setLoading(false)
      alert(error.message)
      return
    }

    // If you get an active session immediately (email confirmation OFF),
    // you can safely upsert the profile client-side (RLS will allow it).
    if (data.user && data.session) {
      await supabase
        .from('profiles')
        .upsert({ id: data.user.id, full_name: fullName }, { onConflict: 'id' })
      // ignore error on purpose; the auth trigger should also create it
      setLoading(false)
      router.push('/discover')
      return
    }

    // If email confirmation is ON, there is no session yet.
    // Don't upsert (RLS would block it). The DB trigger will create the profile.
    setLoading(false)
    alert('Check your email to confirm your account. Then log in.')
    router.push('/login')
  }

  return (
    <form onSubmit={signup} className="max-w-md mx-auto bg-white rounded-2xl shadow p-6 space-y-4">
      <h1 className="text-xl font-bold">Create your account</h1>
      <input className="w-full border rounded p-2" placeholder="Full name" value={fullName} onChange={e=>setFullName(e.target.value)} />
      <input className="w-full border rounded p-2" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
      <input className="w-full border rounded p-2" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
      <button disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl">
        {loading ? 'Creating…' : 'Sign up'}
      </button>
      <div className="text-sm text-center">
        Already have an account? <a href="/login" className="text-indigo-600 hover:underline">Log in</a>
      </div>
    </form>
  )
}
