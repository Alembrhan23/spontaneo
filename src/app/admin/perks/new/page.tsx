"use client"

import { useMemo, useState } from "react"

export default function AdminPerkNew() {
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string>("")
  const [result, setResult] = useState<{ id: number; staff_unlock_token: string } | null>(null)

  const [venueName, setVenueName] = useState("")
  const [neighborhood, setNeighborhood] = useState("")
  const [title, setTitle] = useState("Free taster for first 25")
  const [kind, setKind] = useState<"checkin" | "code">("checkin")
  const [maxClaims, setMaxClaims] = useState(25)
  const [startAt, setStartAt] = useState<string>("")
  const [endAt, setEndAt] = useState<string>("")
  const [sponsorTag, setSponsorTag] = useState<string>("")
  const [finePrint, setFinePrint] = useState<string>("One per person, 21+. Valid during the time window.")
  const [geoLat, setGeoLat] = useState<string>("")
  const [geoLng, setGeoLng] = useState<string>("")
  const [geoRadius, setGeoRadius] = useState<string>("150")
  const [active, setActive] = useState(true)

  const origin = useMemo(() => (typeof window !== "undefined" ? window.location.origin : ""), [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg("")
    setResult(null)

    const payload = {
      venue_name: venueName || null,
      neighborhood: neighborhood || null,
      title,
      kind,
      max_claims: Number(maxClaims) || 25,
      start_at: startAt || null,
      end_at: endAt || null,
      sponsor_tag: sponsorTag || null,
      fine_print: finePrint || null,
      geofence_lat: geoLat ? Number(geoLat) : null,
      geofence_lng: geoLng ? Number(geoLng) : null,
      geofence_radius_m: geoRadius ? Number(geoRadius) : null,
      active,
    }

    const res = await fetch("/api/admin/perks/new", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { setMsg(json?.error || "Failed to create perk"); return }
    setResult({ id: json.id, staff_unlock_token: json.staff_unlock_token })
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-semibold">Add Perk</h1>

      <form onSubmit={submit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <div className="text-sm font-medium">Venue name</div>
            <input value={venueName} onChange={(e) => setVenueName(e.target.value)} placeholder="Spangalang Brewery" className="mt-1 w-full border rounded px-3 py-2" />
          </label>

          <label className="block">
            <div className="text-sm font-medium">Neighborhood</div>
            <input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="RiNo" className="mt-1 w-full border rounded px-3 py-2" />
          </label>

          <label className="block sm:col-span-2">
            <div className="text-sm font-medium">Title</div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" />
          </label>

          <label className="block">
            <div className="text-sm font-medium">Type</div>
            <select value={kind} onChange={(e) => setKind(e.target.value as any)} className="mt-1 w-full border rounded px-3 py-2">
              <option value="checkin">Check-in (first-come)</option>
              <option value="code">Code/Link</option>
            </select>
          </label>

          <label className="block">
            <div className="text-sm font-medium">Max claims</div>
            <input type="number" value={maxClaims} onChange={(e) => setMaxClaims(Number(e.target.value))} className="mt-1 w-full border rounded px-3 py-2" />
          </label>

          <label className="block">
            <div className="text-sm font-medium">Start</div>
            <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" />
          </label>

          <label className="block">
            <div className="text-sm font-medium">End</div>
            <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" />
          </label>

          <label className="block">
            <div className="text-sm font-medium">Sponsor tag</div>
            <input value={sponsorTag} onChange={(e) => setSponsorTag(e.target.value)} placeholder="Sponsored" className="mt-1 w-full border rounded px-3 py-2" />
          </label>

          <label className="block sm:col-span-2">
            <div className="text-sm font-medium">Fine print</div>
            <textarea value={finePrint} onChange={(e) => setFinePrint(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" rows={3} />
          </label>

          <div className="sm:col-span-2 text-sm font-medium mt-2">Geofence (optional)</div>
          <label className="block">
            <div className="text-sm">Latitude</div>
            <input value={geoLat} onChange={(e) => setGeoLat(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" />
          </label>
          <label className="block">
            <div className="text-sm">Longitude</div>
            <input value={geoLng} onChange={(e) => setGeoLng(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" />
          </label>
          <label className="block">
            <div className="text-sm">Radius (m)</div>
            <input value={geoRadius} onChange={(e) => setGeoRadius(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" />
          </label>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <span className="text-sm">Active</span>
          </label>
        </div>

        <button disabled={saving} className="px-4 py-2 rounded bg-black text-white">
          {saving ? "Saving…" : "Create Perk"}
        </button>
      </form>

      {msg && <p className="text-sm text-red-600">{msg}</p>}

      {result && (
        <div className="mt-4 border rounded p-4 space-y-2">
          <div className="font-medium">Perk created ✓</div>
          <div className="text-sm">
            User link: <code className="bg-black/5 px-1 rounded">{origin}/perks/{result.id}</code>
            <button className="ml-2 text-indigo-600" onClick={() => navigator.clipboard.writeText(`${origin}/perks/${result.id}`)}>Copy</button>
          </div>
          <div className="text-sm">
            Staff unlock:{" "}
            <code className="bg-black/5 px-1 rounded">
              {origin}/api/perks/{result.id}/staff/unlock?t={result.staff_unlock_token}
            </code>
            <button
              className="ml-2 text-indigo-600"
              onClick={() => navigator.clipboard.writeText(`${origin}/api/perks/${result.id}/staff/unlock?t=${result.staff_unlock_token}`)}
            >
              Copy
            </button>
          </div>
          <a className="inline-block mt-2 text-sm underline" href={`/admin/perks/list`}>Go to Perks list →</a>
        </div>
      )}
    </div>
  )
}
