'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function VerificationCallback() {
  const router = useRouter()

  useEffect(() => {
    // After Stripe flow finishes, user comes back here.
    // By this point, Stripe webhook should have updated Supabase with verified=true.
    // Just redirect them back to dashboard or profile.
    const timer = setTimeout(() => {
      router.push('/dashboard') // or `/profile`
    }, 2000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="flex flex-col items-center justify-center h-[80vh]">
      <h1 className="text-2xl font-bold mb-4">Verification Complete ✅</h1>
      <p className="text-gray-600">You’ll be redirected shortly...</p>
    </div>
  )
}
