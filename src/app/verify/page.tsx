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
      const { url } = await res.json()
      if (url) {
        window.location.href = url // Stripe hosted flow
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    startVerification()
  }, [])

  return (
    <div className="flex flex-col items-center justify-center h-[80vh]">
      <h1 className="text-2xl font-bold mb-4">Verify Your Identity</h1>
      {loading && <p className="text-gray-500">Redirecting to secure verification…</p>}
      {error && <p className="text-red-500">{error}</p>}
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
