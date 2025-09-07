// app/happening/[slug]/page.tsx
import type { Metadata } from "next"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import Link from "next/link"

export const revalidate = 300

type EventRow = {
  id: string
  slug?: string | null
  business_id: string
  title: string
  start_at: string
  end_at: string | null
  url: string | null
  image_url: string | null
  price_text: string | null
  is_free: boolean
  notes: string | null
}
type Business = {
  id: string
  name: string
  neighborhood: string
  location?: string | null
  image_url?: string | null
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://nowio.app"

// --- Next 15: cookies() must be awaited
async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        // no-ops in a Server Component
        set: () => {},
        remove: () => {},
      },
    }
  )
}

async function fetchEvent(slugOrId: string) {
  const sb = await getSupabase()

  // try slug
  let { data: ev } = await sb
    .from("manual_events")
    .select("id,slug,business_id,title,start_at,end_at,url,image_url,price_text,is_free,notes")
    .eq("slug", slugOrId)
    .maybeSingle()

  // fallback id
  if (!ev) {
    const { data } = await sb
      .from("manual_events")
      .select("id,slug,business_id,title,start_at,end_at,url,image_url,price_text,is_free,notes")
      .eq("id", slugOrId)
      .maybeSingle()
    ev = data || null
  }
  if (!ev) return null

  const { data: biz } = await sb
    .from("businesses")
    .select("id,name,neighborhood,location,image_url")
    .eq("id", ev.business_id)
    .single()

  return { ev, biz: (biz as Business) || null }
}

// --- Next 15: params is async -> await it
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const data = await fetchEvent(slug)
  if (!data) return { title: "Event not found • Nowio" }

  const { ev, biz } = data
  const title = `${ev.title} – ${biz?.neighborhood ?? "Denver"}`
  const description = ev.notes || `Verified micro-plan in ${biz?.neighborhood ?? "Denver"}.`
  const canonical = `${SITE_URL}/happening/${ev.slug || ev.id}`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      images: ev.image_url ? [{ url: ev.image_url }] : undefined,
      type: "website",
    },
    twitter: { card: "summary_large_image" },
  }
}

function fmtDT(iso?: string | null) {
  if (!iso) return ""
  const d = new Date(iso)
  return d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

export default async function EventSEOPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const data = await fetchEvent(slug)

  if (!data) {
    return (
      <main className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold">Event not found</h1>
        <p className="mt-2">Try browsing <Link href="/happening" className="underline">Happening</Link>.</p>
      </main>
    )
  }

  const { ev, biz } = data
  const canonical = `${SITE_URL}/happening/${ev.slug || ev.id}`

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: ev.title,
    startDate: ev.start_at,
    endDate: ev.end_at || undefined,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    image: ev.image_url ? [ev.image_url] : undefined,
    description: ev.notes || `Verified micro-plan in ${biz?.neighborhood ?? "Denver"}.`,
    organizer: { "@type": "Organization", name: "Nowio" },
    location: biz ? {
      "@type": "Place",
      name: biz.name,
      address: { "@type": "PostalAddress", addressLocality: "Denver", addressRegion: "CO", streetAddress: biz.location || "" }
    } : undefined,
    offers: { "@type": "Offer", price: ev.is_free ? "0" : (ev.price_text || ""), priceCurrency: "USD", url: canonical, availability: "https://schema.org/InStock" }
  }

  const ended = new Date(ev.end_at ?? ev.start_at) < new Date()

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="text-sm text-gray-500">
        <Link href="/happening" className="underline">Happening</Link>{" / "}
        <span>{biz?.neighborhood ?? "Denver"}</span>
      </nav>

      <h1 className="text-2xl font-bold">{ev.title}</h1>
      <p className="text-gray-600">{biz?.name}{biz?.neighborhood ? ` • ${biz.neighborhood}` : ""}</p>

      <div className="text-sm">
        <div>{fmtDT(ev.start_at)}{ev.end_at ? ` – ${fmtDT(ev.end_at)}` : ""}</div>
        {ev.price_text && <div className="mt-1">{ev.is_free ? "Free" : ev.price_text}</div>}
      </div>

      {ev.image_url && (/* eslint-disable-next-line @next/next/no-img-element */
        <img src={ev.image_url} alt={ev.title} className="w-full rounded-xl border" />
      )}

      <div className="space-x-2">
        <Link href="/discover" className="inline-block rounded-lg px-4 py-2 bg-black text-white">Open in app</Link>
        <Link href="/happening" className="inline-block rounded-lg px-4 py-2 border">See more tonight</Link>
      </div>

      {ended && (
        <div className="mt-6 rounded-lg border p-4 bg-gray-50">
          <b>This event has ended.</b>
          <div className="mt-2">See other plans happening tonight:</div>
          <Link
            href={`/denver/${(biz?.neighborhood || "denver").toLowerCase().replace(/\s+/g, "-")}`}
            className="underline"
          >
            {biz?.neighborhood || "Denver"} tonight →
          </Link>
        </div>
      )}
    </main>
  )
}
