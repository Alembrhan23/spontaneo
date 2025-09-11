'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

// Dynamically import leaflet components with SSR disabled
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false })

type Business = {
  id: string
  name: string
  neighborhood: string
  location?: string | null
  image_url?: string | null
}

type EventRow = {
  id: string
  title: string
  start_at: string
  end_at: string | null
  business_id: string
}

export default function EventsMapPage() {
  const [events, setEvents] = useState<(EventRow & { business: Business | null })[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false) // 👈 prevent SSR crash

  useEffect(() => {
    setMounted(true)
    async function load() {
      setLoading(true)
      const { data: evts } = await supabase
        .from('manual_events')
        .select('id,title,start_at,end_at,business_id')
        .order('start_at', { ascending: true })

      const bizIds = [...new Set((evts ?? []).map(e => e.business_id))]
      const { data: biz } = await supabase
        .from('businesses')
        .select('id,name,neighborhood,location,image_url')
        .in('id', bizIds)

      const bizMap: Record<string, Business> = {}
      ;(biz || []).forEach(b => { bizMap[b.id] = b })

      setEvents((evts || []).map(e => ({ ...e, business: bizMap[e.business_id] || null })))
      setLoading(false)
    }
    load()
  }, [])

  if (!mounted) return null // 👈 ensures no Leaflet runs on SSR

  if (loading) return <div className="p-6">Loading map…</div>

  return (
    <div className="h-screen w-full">
      <MapContainer
        center={[39.7392, -104.9903]} // Denver default
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {events.map((e) => {
          // TEMP fallback — Denver coords (until you add lat/lng columns)
          const coords: [number, number] = [39.7392, -104.9903]
          return (
            <Marker key={e.id} position={coords}>
              <Popup>
                <h3 className="font-semibold">{e.title}</h3>
                <p className="text-sm text-gray-600">{e.business?.name}</p>
                <p className="text-xs text-gray-500">{e.business?.location || 'No address'}</p>
                <p className="text-xs">
                  {new Date(e.start_at).toLocaleString()}
                  {e.end_at && ` – ${new Date(e.end_at).toLocaleString()}`}
                </p>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
