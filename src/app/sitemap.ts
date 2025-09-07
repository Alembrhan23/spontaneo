// app/sitemap.ts
import type { MetadataRoute } from "next"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://nowio.app"
export const revalidate = 300

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sb = await getSupabase()
  const now = new Date()
  const past = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  const { data: events } = await sb
    .from("manual_events")
    .select("id,slug,start_at,updated_at")
    .gte("start_at", past.toISOString())

  const eventUrls =
    (events || []).map(e => ({
      url: `${SITE_URL}/happening/${e.slug || e.id}`,
      lastModified: new Date(e.updated_at || e.start_at),
      changeFrequency: "hourly" as const,
      priority: 0.9,
    }))

  const neighborhoods = ["rino","lohi","five-points","cap-hill","boulder","aurora"].map(slug => ({
    url: `${SITE_URL}/denver/${slug}`,
    lastModified: now,
    changeFrequency: "hourly" as const,
    priority: 0.7,
  }))

  // plus your main feed
  const staticUrls = [
    { url: `${SITE_URL}/happening`, lastModified: now, changeFrequency: "hourly" as const, priority: 0.6 },
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily" as const, priority: 0.5 },
  ]

  return [...eventUrls, ...neighborhoods, ...staticUrls]
}
