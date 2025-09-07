// app/denver/[neighborhood]/page.tsx
import type { Metadata } from "next"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import Link from "next/link"

export const revalidate = 300

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://nowio.app"

// map slugs to display names you actually use in DB
const NAME_BY_SLUG: Record<string, string> = {
  "rino": "RiNo",
  "lohi": "LoHi",
  "five-points": "Five Points",
  "cap-hill": "Cap Hill",
  "boulder": "Boulder",
  "aurora": "Aurora",
}

type Row = {
  id: string
  slug?: string | null
  title: string
  start_at: string
  image_url: string | null
  price_text: string | null
  is_free: boolean
  business_id: string
}
type Biz = { id: string; name: string; neighborhood: string }

async function getSupabase() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  )
}

export async function generateMetadata(
  { params }: { params: { neighborhood: string } }
): Promise<Metadata> {
  const hood = NAME_BY_SLUG[params.neighborhood] || "Denver"
  const title = `Things to Do in ${hood} Tonight (Verified Micro-Plans)`
  const description = `Live plans in ${hood} for the next 48 hours. Small, verified groups.`
  const url = `${SITE_URL}/denver/${params.neighborhood}`
  return {
    title, description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website" },
  }
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
}

export default async function NeighborhoodPage({ params }: { params: { neighborhood: string } }) {
  const hood = NAME_BY_SLUG[params.neighborhood] || "Denver"
  const sb = await getSupabase()

  const now = new Date()
  const horizon = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  // find businesses in this neighborhood
  const { data: biz } = await sb
    .from("businesses")
    .select("id,name,neighborhood")
    .eq("neighborhood", hood)

  const bizIds = (biz || []).map(b => b.id)
  let events: Row[] = []
  if (bizIds.length) {
    const { data: evs } = await sb
      .from("manual_events")
      .select("id,slug,title,start_at,image_url,price_text,is_free,business_id")
      .in("business_id", bizIds)
      .gte("start_at", now.toISOString())
      .lte("start_at", horizon.toISOString())
      .order("start_at", { ascending: true })
    events = (evs || []) as Row[]
  }

  // JSON-LD ItemList for first few
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: events.slice(0, 5).map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/happening/${e.slug || e.id}`
    }))
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
      <h1 className="text-2xl font-bold">Things to Do in {hood} Tonight</h1>
      <p className="text-gray-600">Live plans for the next 48 hours. Small, verified groups.</p>

      {!events.length ? (
        <p className="mt-4">No plans yet. Check the main <Link href="/happening" className="underline">Happening</Link> page.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {events.map(e => (
            <li key={e.id} className="border rounded-xl p-4 hover:shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Link href={`/happening/${e.slug || e.id}`} className="font-semibold hover:underline">
                    {e.title}
                  </Link>
                  <div className="text-sm text-gray-600">{fmtTime(e.start_at)} • {hood}</div>
                  {e.price_text && <div className="text-sm">{e.is_free ? "Free" : e.price_text}</div>}
                </div>
                {e.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.image_url} alt={e.title} className="w-28 h-20 object-cover rounded-lg border" />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="pt-4">
        <Link href="/happening" className="underline">Browse all neighborhoods →</Link>
      </div>
    </main>
  )
}
