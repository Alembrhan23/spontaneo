"use client"
import { useState } from "react"
import ClaimPass from "@/components/ClaimPass"

export default function ClaimClient({ perkId, planId, title, total }: { perkId: number, planId: string, title: string, total: number }) {
  const [resp, setResp] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function checkIn() {
    setLoading(true)
    const r = await fetch(`/api/plans/${planId}/checkin`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ perkId }),
    })
    const j = await r.json()
    setResp(j)
    setLoading(false)
  }

  const perk = resp?.perk
  return (
    <div className="mt-4">
      {!perk?.token && !perk?.soldOut && (
        <button onClick={checkIn} disabled={loading} className="px-4 py-2 rounded bg-indigo-600 text-white">
          {loading ? "Checking in..." : "I'm here"}
        </button>
      )}
      {perk?.soldOut && <p className="text-sm text-gray-600 mt-2">Sold out. {perk?.total} claimed.</p>}
      {perk?.token && <ClaimPass token={perk.token} title={title} order={perk?.order} total={total} />}
    </div>
  )
}
