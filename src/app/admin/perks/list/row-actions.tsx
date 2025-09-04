"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase/client"

async function copyText(text: string) {
  try {
    if ("clipboard" in navigator && window.isSecureContext && document.hasFocus()) {
      await navigator.clipboard.writeText(text)
      return true
    }
    throw new Error("fallback")
  } catch {
    // Fallback: hidden textarea + execCommand
    const ta = document.createElement("textarea")
    ta.value = text
    ta.readOnly = true
    ta.style.position = "fixed"
    ta.style.left = "-9999px"
    document.body.appendChild(ta)
    ta.select()
    ta.setSelectionRange(0, ta.value.length)
    const ok = document.execCommand("copy")
    document.body.removeChild(ta)
    return ok
  }
}

export default function PerkRowActions({
  perkId,
  staffUnlockToken,
  active,
}: { perkId: number; staffUnlockToken: string; active: boolean }) {
  const origin = useMemo(() => (typeof window !== "undefined" ? window.location.origin : ""), [])
  const userLink = `${origin}/perks/${perkId}`
  const staffLink = `${origin}/api/perks/${perkId}/staff/unlock?t=${staffUnlockToken}`

  async function toggleActive() {
    const res = await fetch(`/api/admin/perks/${perkId}/active`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active: !active }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      alert(j?.error || "Failed to update")
      return
    }
    location.reload()
  }

  async function regenerate() {
    const res = await fetch(`/api/admin/perks/${perkId}/regenerate-unlock`, { method: "POST" })
    const j = await res.json()
    if (!res.ok) {
      alert(j?.error || "Failed")
      return
    }
    const link = `${origin}/api/perks/${perkId}/staff/unlock?t=${j.staff_unlock_token}`
    const ok = await copyText(link)
    alert(ok ? "New staff unlock link copied" : link)
    location.reload()
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button className="border rounded px-2 py-1" onClick={async () => {
        const ok = await copyText(userLink)
        alert(ok ? "User link copied" : userLink)
      }}>
        Copy user link
      </button>

      <button className="border rounded px-2 py-1" onClick={async () => {
        const ok = await copyText(staffLink)
        alert(ok ? "Staff unlock copied" : staffLink)
      }}>
        Copy staff unlock
      </button>

      <button className="border rounded px-2 py-1" onClick={toggleActive}>
        {active ? "Deactivate" : "Activate"}
      </button>

      <button className="border rounded px-2 py-1" onClick={regenerate}>
        Regenerate unlock
      </button>
    </div>
  )
}

/* Unchanged: PerkCounts named export (keep as you have now) */
export function PerkCounts({ perkId }: { perkId: number }) {
  const [counts, setCounts] = useState<{ claimed_count: number; redeemed_count: number } | null>(null)
  useEffect(() => {
    let cancelled = false
    supabase.rpc("perk_progress", { p_perk_id: perkId }).then(({ data }) => {
      if (!cancelled && data) setCounts(data as any)
    })
    return () => { cancelled = true }
  }, [perkId])
  if (!counts) return <span className="text-gray-400">—</span>
  return <span>{counts.claimed_count ?? 0} • {counts.redeemed_count ?? 0} rd</span>
}
