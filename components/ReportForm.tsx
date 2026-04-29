'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

type Step = 'photo' | 'location' | 'category' | 'success'

const STEPS: Step[] = ['photo', 'location', 'category']

const CATEGORIES = [
  { id: 'illegal_dump',      label: 'Παράνομη Χωματερή',       icon: '🗑️' },
  { id: 'roadside_litter',   label: 'Σκουπίδια στο Δρόμο',     icon: '🚮' },
  { id: 'abandoned_vehicle', label: 'Εγκαταλελειμμένο Όχημα',  icon: '🚗' },
  { id: 'vandalism',         label: 'Βανδαλισμός',             icon: '🔨' },
  { id: 'other',             label: 'Άλλο',                    icon: '❓' },
] as const

type CategoryId = (typeof CATEGORIES)[number]['id']

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepDots({ current }: { current: Step }) {
  const idx = STEPS.indexOf(current)
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors duration-200 ${
              i < idx
                ? 'bg-action text-white'
                : i === idx
                ? 'bg-primary text-white'
                : 'bg-gray-200 text-gray-400'
            }`}
          >
            {i < idx ? '✓' : i + 1}
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-8 h-0.5 transition-colors duration-200 ${i < idx ? 'bg-action' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Main form ─────────────────────────────────────────────────────────────────
export default function ReportForm() {
  const [step, setStep]             = useState<Step>('photo')
  const [photo, setPhoto]           = useState<File | null>(null)
  const [preview, setPreview]       = useState<string | null>(null)
  const [coords, setCoords]         = useState<{ lat: number; lng: number } | null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError]     = useState<string | null>(null)
  const [category, setCategory]     = useState<CategoryId | null>(null)
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [trackingUrl, setTrackingUrl] = useState('')
  const [copied, setCopied]         = useState(false)
  const [honeyValue, setHoneyValue] = useState('')

  const fileRef = useRef<HTMLInputElement>(null)

  // Auto-trigger GPS as soon as the user reaches the location step
  useEffect(() => {
    if (step === 'location' && !coords) handleGPS()
    // handleGPS is stable (useCallback with no deps)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleGPS = useCallback(() => {
    setGpsLoading(true)
    setGpsError(null)
    navigator.geolocation.getCurrentPosition(
      ({ coords: c }) => {
        setCoords({ lat: c.latitude, lng: c.longitude })
        setGpsLoading(false)
      },
      () => {
        setGpsError('Δεν ήταν δυνατός ο εντοπισμός θέσης. Ελέγξτε τα δικαιώματα GPS.')
        setGpsLoading(false)
      },
      { enableHighAccuracy: true, timeout: 12_000 },
    )
  }, [])

  const handleSubmit = async () => {
    if (!photo || !coords || !category) return
    setSubmitting(true)
    setSubmitError(null)

    const fd = new FormData()
    fd.append('image', photo)
    fd.append('lat', String(coords.lat))
    fd.append('lng', String(coords.lng))
    fd.append('category', category)
    fd.append('hp_field', honeyValue)
    if (description.trim()) fd.append('description', description.trim())

    try {
      const res = await fetch('/api/report', { method: 'POST', body: fd })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      const data = (await res.json()) as { trackingUrl: string }
      setTrackingUrl(data.trackingUrl)
      setStep('success')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Άγνωστο σφάλμα')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(trackingUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2_000)
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {step !== 'success' && <StepDots current={step} />}

      {/* ── STEP 1: Photo ── */}
      {step === 'photo' && (
        <div>
          <h2 className="text-2xl font-bold text-primary mb-1">Φωτογραφία</h2>
          <p className="text-gray-500 text-sm mb-6">Τράβα ή επίλεξε φωτογραφία του προβλήματος.</p>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={handleFile}
          />

          {preview ? (
            <div className="relative mb-6">
              <img
                src={preview}
                alt="Προεπισκόπηση"
                className="w-full rounded-2xl object-cover max-h-72"
              />
              <button
                onClick={() => { setPhoto(null); setPreview(null) }}
                className="absolute top-2 right-2 bg-white/80 backdrop-blur rounded-full w-8 h-8 flex items-center justify-center text-gray-700 hover:bg-white shadow text-sm"
                aria-label="Αφαίρεση φωτογραφίας"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full h-48 border-2 border-dashed border-primary-300 rounded-2xl flex flex-col items-center justify-center gap-3 text-primary hover:bg-primary-50 active:bg-primary-100 transition-colors mb-6"
            >
              <span className="text-5xl leading-none">📷</span>
              <span className="font-semibold">Κάμερα / Αρχείο</span>
              <span className="text-xs text-gray-400">JPG · PNG · HEIC · max 10 MB</span>
            </button>
          )}

          <button
            disabled={!photo}
            onClick={() => setStep('location')}
            className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Επόμενο →
          </button>
        </div>
      )}

      {/* ── STEP 2: Location ── */}
      {step === 'location' && (
        <div>
          <h2 className="text-2xl font-bold text-primary mb-1">Τοποθεσία</h2>
          <p className="text-gray-500 text-sm mb-6">Εντοπισμός της θέσης σου μέσω GPS.</p>

          {coords ? (
            <div className="card mb-6 border-action/40 bg-action/5">
              <div className="flex items-start gap-3">
                <span className="text-3xl leading-none">📍</span>
                <div>
                  <p className="font-semibold text-action-700">Τοποθεσία εντοπίστηκε</p>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">
                    {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                  </p>
                  <button
                    onClick={() => setCoords(null)}
                    className="text-xs text-gray-400 hover:text-gray-600 underline mt-1"
                  >
                    Επανάληψη
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={handleGPS}
                disabled={gpsLoading}
                className="btn-primary w-full mb-3 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {gpsLoading
                  ? <><span className="animate-spin inline-block">⏳</span> Εντοπισμός…</>
                  : <><span>📍</span> Λήψη Τοποθεσίας GPS</>
                }
              </button>
              {gpsError && (
                <p className="text-red-500 text-sm text-center mb-2">{gpsError}</p>
              )}
            </>
          )}

          <div className="flex gap-3 mt-2">
            <button
              onClick={() => setStep('photo')}
              className="flex-1 border border-gray-200 rounded-2xl py-3 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              ← Πίσω
            </button>
            <button
              disabled={!coords}
              onClick={() => setStep('category')}
              className="flex-1 btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Επόμενο →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Category ── */}
      {step === 'category' && (
        <div>
          <h2 className="text-2xl font-bold text-primary mb-1">Κατηγορία</h2>
          <p className="text-gray-500 text-sm mb-6">Τι είδους πρόβλημα είναι αυτό;</p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`card p-4 text-left flex flex-col gap-2 transition-all border-2 ${
                  category === cat.id
                    ? 'border-action bg-action/5'
                    : 'border-transparent hover:border-gray-200 active:border-gray-300'
                }`}
              >
                <span className="text-2xl leading-none">{cat.icon}</span>
                <span className="text-sm font-medium text-gray-800 leading-snug">{cat.label}</span>
              </button>
            ))}
          </div>

          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1.5">
              Περιγραφή <span className="text-gray-400 font-normal">(προαιρετικό)</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Περίγραψε το πρόβλημα με λίγα λόγια…"
              className="w-full border border-gray-300 rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <p className="text-right text-xs text-gray-400 mt-1">{description.length}/500</p>
          </div>

          {/*
            Honeypot — position off-screen, never shown to users.
            Bots that fill all form fields will populate this; we reject silently server-side.
          */}
          <div
            aria-hidden="true"
            style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}
          >
            <label htmlFor="hp_field">Leave this empty</label>
            <input id="hp_field" name="hp_field" type="text" tabIndex={-1} autoComplete="off"
              value={honeyValue} onChange={e => setHoneyValue(e.target.value)} />
          </div>

          {submitError && (
            <p className="text-red-500 text-sm text-center mb-3">⚠️ {submitError}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep('location')}
              className="flex-1 border border-gray-200 rounded-2xl py-3 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              ← Πίσω
            </button>
            <button
              disabled={!category || submitting}
              onClick={handleSubmit}
              className="flex-1 btn-action disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting
                ? <><span className="animate-spin inline-block">⏳</span> Αποστολή…</>
                : 'Υποβολή ✓'
              }
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Success ── */}
      {step === 'success' && (
        <div className="text-center py-4">
          <div className="text-7xl mb-5 animate-bounce">✅</div>
          <h2 className="text-2xl font-bold text-primary mb-2">Η αναφορά σου ελήφθη!</h2>
          <p className="text-gray-500 text-sm mb-8 max-w-sm mx-auto">
            Θα επεξεργαστεί σύντομα και θα προωθηθεί στον αρμόδιο δήμο.
          </p>

          <div className="card bg-gray-50 mb-6 text-left">
            <p className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">
              Σύνδεσμος παρακολούθησης
            </p>
            <p className="text-sm font-mono text-primary break-all mb-4">{trackingUrl}</p>
            <button
              onClick={handleCopy}
              className={`w-full py-2.5 rounded-2xl text-sm font-semibold transition-colors ${
                copied
                  ? 'bg-action text-white'
                  : 'bg-primary text-white hover:bg-primary-600'
              }`}
            >
              {copied ? '✓ Αντιγράφηκε!' : '📋 Αντιγραφή Συνδέσμου'}
            </button>
          </div>

          <a href="/map" className="text-sm text-primary hover:underline">
            Δες τον χάρτη με όλες τις αναφορές →
          </a>
        </div>
      )}
    </div>
  )
}
