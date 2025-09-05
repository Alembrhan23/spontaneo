// app/admin/perks/list/page.tsx
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import Script from "next/script"
import Link from "next/link"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type PerkRow = {
  id: number
  title: string
  venue_name: string | null
  neighborhood: string | null
  sponsor_tag: string | null
  start_at: string | null
  end_at: string | null
  max_claims: number
  active: boolean
  staff_unlock_token: string | null
  // from perk_summaries view:
  claimed_count: number | null
  redeemed_count: number | null
}

function statusOf(p: PerkRow) {
  const now = Date.now()
  const start = p.start_at ? new Date(p.start_at).getTime() : null
  const end = p.end_at ? new Date(p.end_at).getTime() : null
  const soldOut = (p.max_claims || 0) > 0 && (p.claimed_count ?? 0) >= (p.max_claims || 0)

  if (!p.active) return { key: "inactive", label: "Inactive", badge: "bg-gray-200 text-gray-700" }
  if (soldOut) return { key: "soldout", label: "Sold out", badge: "bg-gray-100 text-gray-700" }
  if (start && now < start) {
    const mins = Math.max(1, Math.round((start - now) / 60000))
    return { key: "soon", label: mins >= 60 ? `Starts in ${Math.round(mins/60)}h` : `Starts in ${mins}m`, badge: "bg-amber-100 text-amber-800" }
  }
  if ((!start || now >= start) && (!end || now <= end)) return { key: "live", label: "Live", badge: "bg-emerald-100 text-emerald-800" }
  return { key: "ended", label: "Ended", badge: "bg-gray-100 text-gray-600" }
}

function cn(...s: Array<string | false | null | undefined>) { return s.filter(Boolean).join(" ") }

export default async function AdminPerksList({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const cookieStore = await cookies()
  const supa = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (n) => cookieStore.get(n)?.value,
        set: (n, v, o: any) => cookieStore.set({ name: n, value: v, ...o }),
        remove: (n, o: any) => cookieStore.set({ name: n, value: "", ...o }),
      },
    }
  )

  // Pull from the summary view so counts are included (no client fetch needed)
  const { data, error } = await supa
    .from("perk_summaries")
    .select("*")
    .limit(300)

  if (error) throw new Error(error.message)
  const perks = (data || []) as PerkRow[]

  // Read filters/sort from URL (?q=&status=&neigh=&sort=)
  const q = (typeof searchParams?.q === "string" ? searchParams?.q : "").trim().toLowerCase()
  const status = (typeof searchParams?.status === "string" ? searchParams?.status : "all") as "all" | "live" | "soon" | "soldout" | "ended" | "inactive"
  const neigh = (typeof searchParams?.neigh === "string" ? searchParams?.neigh : "all")
  // DEFAULT sort now = timeleft
  const sort = (typeof searchParams?.sort === "string" ? searchParams?.sort : "timeleft") as "timeleft" | "start" | "created" | "title"

  // Filter server-side (in memory)
  const now = Date.now()
  const filtered = perks.filter(p => {
    if (neigh !== "all" && (p.neighborhood || "").toLowerCase() !== neigh.toLowerCase()) return false
    if (q) {
      const blob = `${p.title} ${p.venue_name ?? ""} ${p.neighborhood ?? ""} ${p.sponsor_tag ?? ""}`.toLowerCase()
      if (!blob.includes(q)) return false
    }
    const st = statusOf(p).key
    if (status !== "all" && st !== status) return false
    return true
  })

  // ---- Sorting
  function sortTupleTimeLeft(p: PerkRow): [number, number] {
    const st = statusOf(p).key
    const start = p.start_at ? new Date(p.start_at).getTime() : Number.POSITIVE_INFINITY
    const end = p.end_at ? new Date(p.end_at).getTime() : Number.POSITIVE_INFINITY
    // bucket: 0 live, 1 soon/soldout, 2 others, 3 inactive, 4 ended (last)
    const bucket =
      st === "live" ? 0 :
      (st === "soon" || st === "soldout") ? 1 :
      st === "inactive" ? 3 :
      st === "ended" ? 4 : 2
    // value: time remaining (live -> until end; soon -> until start; others -> start)
    const value =
      st === "live" ? Math.max(0, end - now) :
      (st === "soon" || st === "soldout") ? Math.max(0, start - now) :
      start
    return [bucket, value]
  }

  const rows = filtered.sort((a, b) => {
    if (sort === "title") return a.title.localeCompare(b.title)
    if (sort === "created") return b.id - a.id // proxy
    if (sort === "start") {
      const sa = a.start_at ? new Date(a.start_at).getTime() : now + 9e12
      const sb = b.start_at ? new Date(b.start_at).getTime() : now + 9e12
      return sa - sb
    }
    // timeleft (default)
    const [ba, va] = sortTupleTimeLeft(a)
    const [bb, vb] = sortTupleTimeLeft(b)
    return ba - bb || va - vb || a.id - b.id
  })

  const neighborhoods = Array.from(new Set(perks.map(p => p.neighborhood).filter(Boolean))) as string[]
  const totals = (() => {
    let live = 0, soon = 0, ended = 0, inactive = 0, soldout = 0
    for (const p of perks) {
      const st = statusOf(p).key
      if (st === "live") live++
      else if (st === "soon") soon++
      else if (st === "ended") ended++
      else if (st === "inactive") inactive++
      const sold = (p.max_claims || 0) > 0 && (p.claimed_count ?? 0) >= (p.max_claims || 0)
      if (sold) soldout++
    }
    return { total: perks.length, live, soon, ended, inactive, soldout }
  })()

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      {/* tiny util script: copy + AJAX forms (activate/regenerate) */}
      <Script id="perks-admin-utils" strategy="afterInteractive">{`
        (function(){
          async function copyText(text){
            try{
              if('clipboard' in navigator && window.isSecureContext && document.hasFocus()){
                await navigator.clipboard.writeText(text); return true;
              }
              throw new Error('fallback');
            }catch(_){
              const ta=document.createElement('textarea'); ta.value=text; ta.readOnly=true;
              ta.style.position='fixed'; ta.style.left='-9999px'; document.body.appendChild(ta);
              ta.select(); ta.setSelectionRange(0, ta.value.length);
              const ok=document.execCommand('copy'); document.body.removeChild(ta); return ok;
            }
          }
          document.addEventListener('click', async (e) => {
            const btn = e.target.closest('[data-copy]');
            if (!btn) return;
            e.preventDefault();
            const text = btn.getAttribute('data-copy') || '';
            const ok = await copyText(text);
            const msg = btn.getAttribute('data-msg') || (ok ? 'Copied' : text);
            window.alert(msg);
          });

          document.addEventListener('submit', async (e) => {
            const form = e.target;
            if (!(form instanceof HTMLFormElement)) return;
            if (!form.hasAttribute('data-ajax')) return;
            e.preventDefault();
            const url = form.action;
            const payload = {};
            new FormData(form).forEach((v, k) => { payload[k] = v === 'true' ? true : v === 'false' ? false : v });
            const res = await fetch(url, { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify(payload) });
            let j = {};
            try { j = await res.json() } catch {}
            if (!res.ok) { window.alert(j['error'] || 'Failed'); return; }
            if (j['staff_unlock_token']) {
              const link = location.origin + '/api/perks/' + form.dataset.id + '/staff/unlock?t=' + j['staff_unlock_token'];
              await copyText(link);
              window.alert('New staff unlock link copied');
            }
            location.reload();
          });
        })();
      `}</Script>

      {/* header */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Perks</h1>
        <span className="text-sm text-gray-500">{totals.total} total</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <span className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-800">Live {totals.live}</span>
          <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-800">Soon {totals.soon}</span>
          <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">Ended {totals.ended}</span>
          <span className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-700">Inactive {totals.inactive}</span>
          <span className="text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-700">Sold out {totals.soldout}</span>
        </div>
      </div>

      {/* controls (GET form updates URL) */}
      <form className="flex flex-wrap gap-2" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search title, venue, sponsor…"
          className="border rounded px-3 py-2 text-sm w-full sm:w-72"
        />
        <select name="status" defaultValue={status} className="border rounded px-3 py-2 text-sm">
          <option value="all">All statuses</option>
          <option value="live">Live</option>
          <option value="soon">Starting soon</option>
          <option value="soldout">Sold out</option>
          <option value="ended">Ended</option>
          <option value="inactive">Inactive</option>
        </select>
        <select name="neigh" defaultValue={neigh} className="border rounded px-3 py-2 text-sm">
          <option value="all">All neighborhoods</option>
          {neighborhoods.map(n => <option key={n} value={n as string}>{n}</option>)}
        </select>
        <select name="sort" defaultValue={sort} className="border rounded px-3 py-2 text-sm">
          <option value="timeleft">Sort by time left</option>
          <option value="start">Sort by start</option>
          <option value="created">Sort by created</option>
          <option value="title">Sort by title</option>
        </select>
        <button className="ml-auto inline-flex items-center gap-1 rounded px-3 py-2 text-sm bg-black text-white" type="submit">
          Apply
        </button>
        <Link href="/admin/perks/new" className="inline-flex items-center gap-1 rounded px-3 py-2 text-sm border">
          + New Perk
        </Link>
      </form>

      {/* table */}
      <div className="overflow-x-auto rounded-2xl border">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left bg-gray-50">
              <th className="py-2 pl-4 pr-3">Status</th>
              <th className="py-2 px-3">Perk</th>
              <th className="py-2 px-3">Window</th>
              <th className="py-2 px-3">Progress</th>
              <th className="py-2 px-3">Active</th>
              <th className="py-2 pr-4 pl-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const st = statusOf(p)
              const claimed = p.claimed_count ?? 0
              const redeemed = p.redeemed_count ?? 0
              const max = p.max_claims || 0
              const pct = max ? Math.min(100, Math.round((claimed / max) * 100)) : 0
              const origin = typeof window === "undefined" ? "" : window.location.origin

              const start = p.start_at ? new Date(p.start_at) : null
              const end = p.end_at ? new Date(p.end_at) : null

              return (
                <tr key={p.id} className="border-t align-top">
                  {/* Status */}
                  <td className="py-3 pl-4 pr-3">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full inline-block", st.badge)}>{st.label}</span>
                    {p.sponsor_tag && (
                      <div className="text-[11px] text-indigo-700 bg-indigo-50 inline-block px-2 py-0.5 rounded mt-1">
                        {p.sponsor_tag}
                      </div>
                    )}
                  </td>

                  {/* Perk (give it room) */}
                  <td className="py-3 px-3" style={{ minWidth: 280 }}>
                    <div className="font-medium">{p.title}</div>
                    <div className="text-xs text-gray-600">
                      {p.venue_name || "—"}{p.neighborhood ? ` • ${p.neighborhood}` : ""}
                    </div>
                    <Link href={`/perks/${p.id}`} className="text-xs underline text-gray-700" target="_blank">
                      View public page →
                    </Link>
                  </td>

                  {/* Window — split onto two lines */}
                  <td className="py-3 px-3 whitespace-normal leading-5">
                    {start ? (
                      <>
                        <div>{start.toLocaleDateString()}</div>
                        <div className="text-xs text-gray-600">
                          {start.toLocaleTimeString()}
                          {end ? ` – ${end.toLocaleTimeString()}` : ""}
                        </div>
                      </>
                    ) : "—"}
                  </td>

                  {/* Progress (counts line already separate) */}
                  <td className="py-3 px-3" style={{ minWidth: 180 }}>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mt-1 text-xs text-gray-600">
                      {claimed}/{max} claimed • {redeemed} redeemed
                    </div>
                  </td>

                  {/* Active */}
                  <td className="py-3 px-3">
                    <span className={cn(
                      "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded",
                      p.active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
                    )}>
                      <span className={cn("inline-block h-1.5 w-1.5 rounded-full", p.active ? "bg-emerald-600" : "bg-gray-500")} />
                      {p.active ? "Active" : "Inactive"}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3 pr-4 pl-3">
                    <div className="flex flex-wrap gap-2">
                      <a href="#" data-copy={`${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/perks/${p.id}`} data-msg="User link copied" className="border rounded px-2 py-1">Copy user link</a>
                      <a href="#" data-copy={`${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/api/perks/${p.id}/staff/unlock?t=${p.staff_unlock_token ?? ""}`} data-msg="Staff unlock copied" className="border rounded px-2 py-1">Copy staff unlock</a>

                      <form data-ajax data-id={p.id} action={`/api/admin/perks/${p.id}/active`} method="post" className="inline">
                        <input type="hidden" name="active" value={(!p.active).toString()} />
                        <button className="border rounded px-2 py-1" type="submit">{p.active ? "Deactivate" : "Activate"}</button>
                      </form>

                      <form data-ajax data-id={p.id} action={`/api/admin/perks/${p.id}/regenerate-unlock`} method="post" className="inline">
                        <button className="border rounded px-2 py-1" type="submit">Regenerate unlock</button>
                      </form>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
