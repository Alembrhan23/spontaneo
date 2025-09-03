'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'

export const metadata = { title: 'Billing success • Nowio' }

export default function BillingSuccessPage() {
  const search = useSearchParams()
  const sessionId = search.get('session_id') // optional, just for display
  const [opening, setOpening] = useState(false)

  async function openPortal() {
    try {
      setOpening(true)
      const res = await fetch('/api/portal', { method: 'POST' })
      const data = await res.json()
      if (data?.url) {
        window.location.href = data.url
        return
      }
      alert(data?.error || 'Could not open billing portal')
    } catch (e: any) {
      alert(e?.message || 'Something went wrong')
    } finally {
      setOpening(false)
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center">
      <div className="mx-auto max-w-xl w-full bg-white border rounded-2xl p-6 sm:p-8 shadow-sm text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <svg width="24" height="24" viewBox="0 0 24 24" className="fill-current">
            <path d="M9 16.2 4.8 12l1.4-1.4L9 13.4l8.8-8.8L19.2 6z"/>
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900">You’re all set!</h1>
        <p className="mt-2 text-gray-600">
          Thanks for upgrading. Your subscription is active.
        </p>
        {sessionId && (
          <p className="mt-1 text-xs text-gray-500">Ref: {sessionId}</p>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={openPortal}
            disabled={opening}
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-white hover:bg-indigo-700 transition-colors disabled:opacity-60"
          >
            {opening ? 'Opening…' : 'Manage billing'}
          </button>
          <Link
            href="/pp/profile"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-2.5 hover:bg-gray-50 transition-colors"
          >
            Go to profile
          </Link>
          <Link
            href="/discover"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-2.5 hover:bg-gray-50 transition-colors"
          >
            Start exploring
          </Link>
        </div>

        <p className="mt-4 text-xs text-gray-500">
          You can update payment details or cancel anytime from the billing portal.
        </p>
      </div>
    </div>
  )
}
