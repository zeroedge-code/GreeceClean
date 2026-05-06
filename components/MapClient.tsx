'use client'

import { useEffect, useRef } from 'react'
import type * as LeafletType from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { SeedReport } from '@/lib/seed-data'
import { useLocale } from './LocaleProvider'

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

function formatDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(locale === 'el' ? 'el-GR' : locale === 'de' ? 'de-DE' : 'en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
  } catch { return '—' }
}

type StatusKey = 'pending' | 'in_review' | 'forwarded' | 'resolved' | 'rejected'

const STATUS_STYLE: Record<StatusKey, { bg: string; color: string }> = {
  pending:   { bg: '#f3f4f6', color: '#6b7280' },
  in_review: { bg: '#fffbeb', color: '#b45309' },
  forwarded: { bg: '#eff6ff', color: '#1d4ed8' },
  resolved:  { bg: '#f0fdf4', color: '#15803d' },
  rejected:  { bg: '#fef2f2', color: '#b91c1c' },
}

const GREECE_CENTER: [number, number] = [39.0742, 21.8243]

export default function MapClient({ reports }: { reports: SeedReport[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<LeafletType.Map | null>(null)
  const { t, locale } = useLocale()

  useEffect(() => {
    if (!containerRef.current) return
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet') as typeof LeafletType

    const map = L.map(containerRef.current).setView(GREECE_CENTER, 6)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)

    const icon = L.icon({
      iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize:    [25, 41],
      iconAnchor:  [12, 41],
      popupAnchor: [1, -34],
    })

    reports.forEach((r) => {
      const municipalityName = r.municipality?.name_el ?? t.map.unknownMunicipality
      const categoryLabel    = t.tracking.categories[r.category as keyof typeof t.tracking.categories] ?? r.category
      const statusKey        = (r.status ?? 'pending') as StatusKey
      const statusLabel      = t.map.statuses[statusKey] ?? r.status
      const style            = STATUS_STYLE[statusKey] ?? STATUS_STYLE.pending
      const date             = formatDate(r.created_at, locale)

      const popup = `
        <div style="width:260px;font-family:system-ui,-apple-system,sans-serif;overflow:hidden">
          ${r.image_url ? `<img
            src="${escHtml(r.image_url)}"
            alt="${escHtml(categoryLabel)}"
            loading="lazy"
            style="width:100%;height:150px;object-fit:cover;display:block;border-radius:6px 6px 0 0;background:#f3f4f6"
          />` : `<div style="width:100%;height:80px;background:#f3f4f6;border-radius:6px 6px 0 0;display:flex;align-items:center;justify-content:center;font-size:28px">🗑️</div>`}
          <div style="padding:12px 12px 10px">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:5px">
              <span style="font-weight:700;font-size:13px;color:#111827;line-height:1.3">
                ${escHtml(municipalityName)}
              </span>
              <span style="
                flex-shrink:0;font-size:10px;font-weight:600;white-space:nowrap;
                padding:2px 8px;border-radius:9999px;
                background:${style.bg};color:${style.color}
              ">${escHtml(statusLabel)}</span>
            </div>
            <p style="font-size:12px;color:#4b5563;margin:0 0 2px;font-weight:500">${escHtml(categoryLabel)}</p>
            <p style="font-size:11px;color:#9ca3af;margin:0 0 12px">${escHtml(date)}</p>
            <a
              href="/r/${escHtml(r.public_token)}"
              style="
                display:block;text-align:center;text-decoration:none;
                background:#005BAE;color:#ffffff;
                padding:9px 12px;border-radius:8px;
                font-size:12px;font-weight:600;letter-spacing:0.2px
              "
            >${escHtml(t.map.viewReport)}</a>
          </div>
        </div>
      `

      L.marker([r.lat, r.lng], { icon })
        .addTo(map)
        .bindPopup(popup, { maxWidth: 280, minWidth: 260 })
    })

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [reports, t, locale])

  return <div ref={containerRef} className="h-full w-full" />
}
