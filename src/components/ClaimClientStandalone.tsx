"use client"
import { useCallback, useState } from "react"
import ClaimPass from "@/components/ClaimPass"

export default function ClaimClientStandalone({ perkId, title, total }: { perkId: number, title: string, total: number }) {
  const [resp, setResp] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const getCoords = useCallback(() => {
    return new Promise<{lat?: number; lng?: number}>((resolve) => {
      if (!("geolocation" in navigator)) return resolve({})
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve({}),
        { enableHighAccuracy: true, timeout: 5000 }
      )
    })
  }, [])

  async function checkIn() {
    setLoading(true)
    const coords = await getCoords()
    const r = await fetch(`/api/perks/${perkId}/checkin`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ coords }),
    })
    const j = await r.json()
    setResp(j)
    setLoading(false)
  }

  const perk = resp?.perk
  return (
    <div>
      {!perk?.token && !perk?.soldOut && !perk?.tooFar && (
        <button onClick={checkIn} disabled={loading} className="px-4 py-2 rounded bg-indigo-600 text-white">
          {loading ? "Checking in..." : "I'm here"}
        </button>
      )}

      {perk?.tooFar && (
        <p className="text-sm text-gray-600 mt-2">
          You’re {perk.distance_m}m away. Be within {perk.radius_m}m to claim.
        </p>
      )}

      {perk?.soldOut && <p className="text-sm text-gray-600 mt-2">Sold out. {perk?.total} claimed.</p>}

      {perk?.token && <ClaimPass token={perk.token} title={title} order={perk?.order} total={total} />}
    </div>
  )
}
