"use client"
import { useEffect, useRef, useState } from "react"
import { BrowserMultiFormatReader, Result } from "@zxing/browser"

export default function StaffScan({ params }: { params: { perkId: string } }) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [msg, setMsg] = useState("Point camera at guest QR")
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    const reader = new BrowserMultiFormatReader()
    let locked = false
    reader.decodeFromVideoDevice(undefined, videoRef.current!, async (res: Result | undefined) => {
      if (!res || locked) return
      locked = true
      setMsg("Redeeming…")
      const token = res.getText()
      try {
        const r = await fetch("/api/perks/redeem-by-token", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token, perkId: params.perkId }),
        })
        const j = await r.json()
        if (j?.ok) {
          setMsg(j.alreadyRedeemed ? "Already redeemed ✓" : "Redeemed ✓")
          setCount(j.redeemed ?? null)
        } else {
          setMsg(j?.error || "Error")
        }
      } finally {
        setTimeout(() => { locked = false; setMsg("Point camera at guest QR") }, 700)
      }
    })
    return () => reader.reset()
  }, [params.perkId])

  return (
    <div className="max-w-md mx-auto p-4 text-center">
      <h1 className="text-xl font-semibold mb-2">Nowio Staff Scanner</h1>
      <p className="text-sm text-gray-600 mb-2">If it says “session expired”, scan the Staff Unlock QR again.</p>
      <video ref={videoRef} className="w-full rounded bg-black aspect-video" />
      {typeof count === "number" && <p className="text-sm text-gray-500 mt-2">{count} redeemed so far</p>}
    </div>
  )
}
