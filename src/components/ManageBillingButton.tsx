'use client'

import { useState } from 'react'

export default function ManageBillingButton({ className }: { className?: string }) {
  const [loading, setLoading] = useState(false)

  async function openPortal() {
    try {
      setLoading(true)
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
      setLoading(false)
    }
  }

  return (
    <button
      onClick={openPortal}
      disabled={loading}
      className={className ?? 'rounded-lg bg-indigo-600 px-4 py-2 text-white'}
    >
      {loading ? 'Opening…' : 'Manage billing'}
    </button>
  )
}
