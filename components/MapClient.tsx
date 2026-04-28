'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const GREECE_CENTER: [number, number] = [39.0742, 21.8243]

const markerIcon = L.icon({
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize:    [25, 41],
  iconAnchor:  [12, 41],
  popupAnchor: [1, -34],
})

type Report = {
  id: string
  public_token: string
  lat: number
  lng: number
  status: string
  municipality: string
}

export default function MapClient() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Destroy any stale instance left by Strict Mode double-mount or HMR
    if (mapRef.current) {
      mapRef.current.remove()
      mapRef.current = null
    }

    const map = L.map(containerRef.current).setView(GREECE_CENTER, 6)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)

    mapRef.current = map

    // TODO: fetch approved reports from Supabase and add markers
    const reports: Report[] = []
    reports.forEach((r) => {
      L.marker([r.lat, r.lng], { icon: markerIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-size:13px;min-width:140px">
            <p style="font-weight:600;margin:0 0 2px">${r.municipality}</p>
            <p style="color:#6b7280;margin:0 0 6px">${r.status}</p>
            <a href="/r/${r.public_token}" style="color:#005BAE">Προβολή αναφοράς →</a>
          </div>
        `)
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  return <div ref={containerRef} className="h-full w-full" />
}
