// app/login/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function login(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) return alert(error.message)
    router.push('/discover')
  }

  return (
    <form onSubmit={login} className="max-w-md mx-auto bg-white rounded-2xl shadow p-6 space-y-4">
      <h1 className="text-xl font-bold">Log in</h1>
      <input className="w-full border rounded p-2" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
      <input className="w-full border rounded p-2" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      <button disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl">
        {loading ? 'Logging in…' : 'Log in'}
      </button>
      <div className="text-sm text-center">
        No account? <a href="/signup" className="text-indigo-600 hover:underline">Sign up</a>
      </div>
    </form>
  )
}
