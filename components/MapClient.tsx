'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { SeedReport } from '@/lib/seed-data'
import { useLocale } from './LocaleProvider'

const GREECE_CENTER: [number, number] = [39.0742, 21.8243]

const markerIcon = L.icon({
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize:    [25, 41],
  iconAnchor:  [12, 41],
  popupAnchor: [1, -34],
})

export default function MapClient({ reports }: { reports: SeedReport[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<L.Map | null>(null)
  const { t }        = useLocale()

  useEffect(() => {
    if (!containerRef.current) return

    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }

    const map = L.map(containerRef.current).setView(GREECE_CENTER, 6)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)

    reports.forEach((r) => {
      const municipalityName = r.municipality?.name_el ?? t.map.unknownMunicipality
      const categoryLabel    = t.tracking.categories[r.category] ?? r.category
      L.marker([r.lat, r.lng], { icon: markerIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-size:13px;min-width:160px;line-height:1.5">
            <p style="font-weight:600;margin:0 0 2px">${municipalityName}</p>
            <p style="color:#6b7280;margin:0 0 6px;font-size:12px">${categoryLabel}</p>
            <a href="/r/${r.public_token}" style="color:#005BAE;font-size:12px">
              ${t.map.viewReport}
            </a>
          </div>
        `)
    })

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [reports, t])

  return <div ref={containerRef} className="h-full w-full" />
}
