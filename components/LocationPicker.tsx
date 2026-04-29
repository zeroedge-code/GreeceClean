'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Dictionary } from '@/lib/i18n/types'

const GREECE_CENTER: [number, number] = [38.5, 24.5]

const MARKER_ICON = L.icon({
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize:    [25, 41],
  iconAnchor:  [12, 41],
  popupAnchor: [1, -34],
})

type NominatimResult = {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

export default function LocationPicker({
  initialCoords,
  exifDetected,
  onConfirm,
  onBack,
  t,
}: {
  initialCoords: { lat: number; lng: number } | null
  exifDetected: boolean
  onConfirm: (c: { lat: number; lng: number }) => void
  onBack: () => void
  t: Dictionary['form']
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<L.Map | null>(null)
  const markerRef    = useRef<L.Marker | null>(null)
  // Capture initial value so the map init effect doesn't need it in deps
  const initRef      = useRef(initialCoords)

  const [pin,         setPin]         = useState(initialCoords)
  const [gpsLoading,  setGpsLoading]  = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [results,     setResults]     = useState<NominatimResult[]>([])
  const [searching,   setSearching]   = useState(false)
  const [showDrop,    setShowDrop]    = useState(false)

  // ── Map init (once on mount) ────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el || mapRef.current) return

    const init = initRef.current
    const center: [number, number] = init ? [init.lat, init.lng] : GREECE_CENTER
    const zoom = init ? 14 : 7

    const map = L.map(el).setView(center, zoom)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    function addMarker(lat: number, lng: number) {
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng])
      } else {
        const m = L.marker([lat, lng], { icon: MARKER_ICON, draggable: true }).addTo(map)
        m.on('dragend', () => {
          const ll = m.getLatLng()
          setPin({ lat: ll.lat, lng: ll.lng })
        })
        markerRef.current = m
      }
      setPin({ lat, lng })
    }

    if (init) addMarker(init.lat, init.lng)

    map.on('click', (e: L.LeafletMouseEvent) => {
      addMarker(e.latlng.lat, e.latlng.lng)
    })

    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current  = null
      markerRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Imperative move (used by GPS + search) ─────────────────────────────────
  function moveTo(lat: number, lng: number, zoom = 15) {
    const map = mapRef.current
    if (!map) return
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng])
    } else {
      const m = L.marker([lat, lng], { icon: MARKER_ICON, draggable: true }).addTo(map)
      m.on('dragend', () => {
        const ll = m.getLatLng()
        setPin({ lat: ll.lat, lng: ll.lng })
      })
      markerRef.current = m
    }
    map.setView([lat, lng], zoom)
    setPin({ lat, lng })
  }

  // ── GPS fallback ────────────────────────────────────────────────────────────
  function handleGPS() {
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords: c }) => { moveTo(c.latitude, c.longitude); setGpsLoading(false) },
      ()             => setGpsLoading(false),
      { enableHighAccuracy: true, timeout: 12_000 },
    )
  }

  // ── Nominatim search (500 ms debounce, Greece only) ────────────────────────
  useEffect(() => {
    const q = searchQuery.trim()
    if (q.length < 3) { setResults([]); setShowDrop(false); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const url =
          `https://nominatim.openstreetmap.org/search` +
          `?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=gr`
        const res  = await fetch(url, { headers: { 'Accept-Language': 'el,en' } })
        const data = (await res.json()) as NominatimResult[]
        setResults(data)
        setShowDrop(data.length > 0)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  function selectResult(r: NominatimResult) {
    moveTo(parseFloat(r.lat), parseFloat(r.lon), 14)
    setSearchQuery(r.display_name.split(',').slice(0, 2).join(',').trim())
    setShowDrop(false)
    setResults([])
  }

  return (
    <div>
      {/* EXIF detected banner */}
      {exifDetected && (
        <div className="mb-4 flex items-center gap-2 bg-action/5 border border-action/30 rounded-2xl px-4 py-3">
          <span className="text-xl leading-none">📍</span>
          <p className="text-sm font-medium text-action-700">{t.locationFound}</p>
        </div>
      )}

      {/* Nominatim search */}
      <div className="relative mb-3">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowDrop(true)}
          onBlur={() => setTimeout(() => setShowDrop(false), 150)}
          placeholder={t.locationSearchPlaceholder}
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white pr-9"
        />
        {searching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm animate-spin leading-none">
            ⏳
          </span>
        )}
        {showDrop && (
          <ul className="absolute z-[9999] w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-52 overflow-y-auto">
            {results.map((r) => (
              <li key={r.place_id}>
                <button
                  onMouseDown={() => selectResult(r)}
                  className="w-full text-left px-4 py-2.5 text-xs leading-snug hover:bg-gray-50 border-b border-gray-100 last:border-0"
                >
                  {r.display_name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Leaflet map */}
      <div
        ref={containerRef}
        className="w-full rounded-2xl overflow-hidden border border-gray-200 mb-3 touch-none"
        style={{ height: 320, zIndex: 0 }}
      />

      {/* Coords + GPS button */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs font-mono text-gray-400">
          {pin
            ? `${pin.lat.toFixed(6)}, ${pin.lng.toFixed(6)}`
            : <span className="italic">—</span>}
        </p>
        <button
          onClick={handleGPS}
          disabled={gpsLoading}
          className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline disabled:opacity-50"
        >
          {gpsLoading
            ? <><span className="animate-spin inline-block">⏳</span> {t.locationLoading}</>
            : t.locationButton}
        </button>
      </div>

      {/* Nav */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 border border-gray-200 rounded-2xl py-3 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          {t.navBack}
        </button>
        <button
          disabled={!pin}
          onClick={() => pin && onConfirm(pin)}
          className="flex-1 btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t.locationConfirmTitle}
        </button>
      </div>
    </div>
  )
}
