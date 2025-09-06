'use client'

import { useEffect, useState } from 'react'

export default function VerifyPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function startVerification() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/verify/start', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to start verification')
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      if (url) {
        window.location.href = url // Stripe hosted flow
      } else {
        throw new Error('No verification URL returned')
      }
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Kick off automatically; keep the button as a fallback
    startVerification()
  }, [])

  return (
    <div className="flex flex-col items-center justify-center h-[80vh]">
      <h1 className="text-2xl font-bold mb-2">Verify Your Identity</h1>
      {loading && <p className="text-gray-500 mb-4">Redirecting to secure verification…</p>}
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {!loading && (
        <button
          onClick={startVerification}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Start Verification
        </button>
      )}
    </div>
  )
}
