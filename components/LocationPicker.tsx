'use client'

import { useEffect, useRef, useState } from 'react'
import type * as LeafletType from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Dictionary } from '@/lib/i18n/types'

const GREECE_CENTER: [number, number] = [38.5, 24.5]

function makeIcon(L: typeof LeafletType) {
  return L.icon({
    iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize:    [25, 41],
    iconAnchor:  [12, 41],
    popupAnchor: [1, -34],
  })
}

type NominatimResult = {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

export default function LocationPicker({
  initialCoords,
  onConfirm,
  onBack,
  t,
}: {
  initialCoords: { lat: number; lng: number } | null
  onConfirm: (c: { lat: number; lng: number }) => void
  onBack: () => void
  t: Dictionary['form']
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<LeafletType.Map | null>(null)
  const markerRef    = useRef<LeafletType.Marker | null>(null)

  const [pin,         setPin]        = useState(initialCoords)
  const [mapVisible,  setMapVisible] = useState(!!initialCoords)
  const [gpsLoading,  setGpsLoading] = useState(!initialCoords)
  const [gpsError,    setGpsError]   = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [results,     setResults]    = useState<NominatimResult[]>([])
  const [searching,   setSearching]  = useState(false)
  const [showDrop,    setShowDrop]   = useState(false)

  // Auto-fire GPS on mount if no EXIF coords provided
  useEffect(() => {
    if (initialCoords) return
    if (!navigator.geolocation) {
      setGpsLoading(false)
      setGpsError(true)
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords: c }) => {
        setPin({ lat: c.latitude, lng: c.longitude })
        setMapVisible(true)
        setGpsLoading(false)
      },
      () => {
        setGpsLoading(false)
        setGpsError(true)
      },
      { enableHighAccuracy: true, timeout: 12_000 },
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Map init — runs once when mapVisible becomes true ──────────────────────
  useEffect(() => {
    if (!mapVisible) return
    const el = containerRef.current
    if (!el || mapRef.current) return

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet') as typeof LeafletType

    const center: [number, number] = pin ? [pin.lat, pin.lng] : GREECE_CENTER
    const zoom = pin ? 14 : 7

    const map = L.map(el).setView(center, zoom)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    function addOrMoveMarker(lat: number, lng: number) {
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng])
      } else {
        const m = L.marker([lat, lng], { icon: makeIcon(L), draggable: true }).addTo(map)
        m.on('dragend', () => {
          const ll = m.getLatLng()
          setPin({ lat: ll.lat, lng: ll.lng })
        })
        markerRef.current = m
      }
      setPin({ lat, lng })
    }

    if (pin) addOrMoveMarker(pin.lat, pin.lng)

    map.on('click', (e: LeafletType.LeafletMouseEvent) => {
      addOrMoveMarker(e.latlng.lat, e.latlng.lng)
    })

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null; markerRef.current = null }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapVisible])

  // ── Move map + pin (GPS retry and search results) ─────────────────────────
  function moveTo(lat: number, lng: number, zoom = 15) {
    setPin({ lat, lng })
    const map = mapRef.current
    if (!map) return
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet') as typeof LeafletType
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng])
    } else {
      const m = L.marker([lat, lng], { icon: makeIcon(L), draggable: true }).addTo(map)
      m.on('dragend', () => { const ll = m.getLatLng(); setPin({ lat: ll.lat, lng: ll.lng }) })
      markerRef.current = m
    }
    map.setView([lat, lng], zoom)
  }

  // ── GPS retry ─────────────────────────────────────────────────────────────
  function handleGPS() {
    if (!navigator.geolocation) return
    setGpsLoading(true)
    setGpsError(false)
    navigator.geolocation.getCurrentPosition(
      ({ coords: c }) => {
        moveTo(c.latitude, c.longitude)
        if (!mapVisible) setMapVisible(true)
        setGpsLoading(false)
      },
      () => { setGpsLoading(false); setGpsError(true) },
      { enableHighAccuracy: true, timeout: 12_000 },
    )
  }

  // ── Nominatim search ──────────────────────────────────────────────────────
  useEffect(() => {
    const q = searchQuery.trim()
    if (q.length < 3) { setResults([]); setShowDrop(false); return }
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`
        const res  = await fetch(url, { headers: { 'Accept-Language': 'el,en' }, signal: controller.signal })
        const data = (await res.json()) as NominatimResult[]
        setResults(data)
        setShowDrop(data.length > 0)
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setResults([])
      } finally {
        setSearching(false)
      }
    }, 500)
    return () => { clearTimeout(timer); controller.abort() }
  }, [searchQuery])

  function selectResult(r: NominatimResult) {
    moveTo(parseFloat(r.lat), parseFloat(r.lon), 14)
    if (!mapVisible) setMapVisible(true)
    setSearchQuery(r.display_name.split(',').slice(0, 2).join(',').trim())
    setShowDrop(false)
    setResults([])
  }

  return (
    <div>
      {/* GPS auto-detecting spinner (shown before map opens) */}
      {gpsLoading && !mapVisible && (
        <div className="flex items-center justify-center gap-3 py-10 text-gray-500">
          <span className="animate-spin text-2xl leading-none">⏳</span>
          <p className="text-sm">{t.locationLoading}</p>
        </div>
      )}

      {/* GPS error banner */}
      {gpsError && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 mb-3 flex items-center justify-between gap-3">
          <p className="text-sm text-orange-700">{t.locationError}</p>
          <button onClick={handleGPS} className="text-xs font-semibold text-primary hover:underline shrink-0">
            {t.locationRetry}
          </button>
        </div>
      )}

      {/* Search box (shown once map is visible or GPS failed) */}
      {(mapVisible || gpsError) && (
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
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm animate-spin leading-none">⏳</span>
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
      )}

      {/* "Open map" button — only when GPS failed and map not yet opened */}
      {gpsError && !mapVisible && (
        <button
          onClick={() => setMapVisible(true)}
          className="w-full border-2 border-dashed border-gray-300 rounded-2xl py-3 text-sm text-gray-500 font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors mb-3"
        >
          {t.locationShowMap}
        </button>
      )}

      {/* Leaflet map — renders as soon as GPS/EXIF coords are known */}
      {mapVisible && (
        <>
          <div
            ref={containerRef}
            className="w-full rounded-2xl overflow-hidden border border-gray-200 mb-2 touch-none"
            style={{ height: 260, zIndex: 0 }}
          />
          <p className="text-xs text-center text-gray-400 mb-1">{t.locationAdjustHint}</p>
        </>
      )}

      {/* Coords + GPS button row */}
      {(mapVisible || pin) && (
        <div className="flex items-center justify-between mb-4 mt-2">
          <p className="text-xs font-mono text-gray-400">
            {pin
              ? `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}`
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
      )}

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
