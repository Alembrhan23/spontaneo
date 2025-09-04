"use client"
import { useEffect, useState } from "react"
import QRCode from "qrcode"

export default function ClaimPass({ token, title, order, total }: { token: string; title: string; order?: number|null; total?: number|null }) {
  const [dataUrl, setDataUrl] = useState<string>("")
  useEffect(() => { QRCode.toDataURL(token, { margin: 1, width: 240 }).then(setDataUrl).catch(() => {}) }, [token])

  return (
    <div className="mt-4 rounded-xl border p-4 text-center">
      <h4 className="font-semibold">{title}</h4>
      <p className="text-sm text-gray-600">Show this QR at the bar.</p>
      {dataUrl ? <img src={dataUrl} alt="Perk QR" className="mx-auto my-3 h-48 w-48" /> : <div className="h-48" />}
      {order && total && <p className="text-xs text-gray-500">You’re #{order} of {total}. One per person.</p>}
    </div>
  )
}
