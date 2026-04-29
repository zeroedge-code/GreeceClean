'use client'

import { useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import type { Dictionary } from '@/lib/i18n/types'

type FormTranslations = Dictionary['form']
type Step = 'photo' | 'location' | 'category' | 'success'
const STEPS: Step[] = ['photo', 'location', 'category']

// LocationPicker uses Leaflet which requires the DOM — no SSR
const LocationPickerDynamic = dynamic(() => import('./LocationPicker'), {
  ssr: false,
  loading: () => (
    <div className="w-full rounded-2xl border border-gray-200 bg-gray-100 flex items-center justify-center" style={{ height: 320 }}>
      <span className="text-gray-400 text-sm">⏳</span>
    </div>
  ),
})

function StepDots({ current, t }: { current: Step; t: FormTranslations }) {
  const idx    = STEPS.indexOf(current)
  const labels = [t.photoTitle, t.locationTitle, t.categoryTitle]
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors duration-200 ${
              i < idx ? 'bg-action text-white' : i === idx ? 'bg-primary text-white' : 'bg-gray-200 text-gray-400'
            }`}
            title={labels[i]}
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

export default function ReportForm({ translations: t }: { translations: FormTranslations }) {
  const [step,          setStep]          = useState<Step>('photo')
  const [photo,         setPhoto]         = useState<File | null>(null)
  const [preview,       setPreview]       = useState<string | null>(null)
  const [exifCoords,    setExifCoords]    = useState<{ lat: number; lng: number } | null>(null)
  const [exifScanning,  setExifScanning]  = useState(false)
  const [coords,        setCoords]        = useState<{ lat: number; lng: number } | null>(null)
  const [category,      setCategory]      = useState<string | null>(null)
  const [description,   setDescription]   = useState('')
  const [submitting,    setSubmitting]    = useState(false)
  const [submitError,   setSubmitError]   = useState<string | null>(null)
  const [trackingUrl,   setTrackingUrl]   = useState('')
  const [copied,        setCopied]        = useState(false)
  const [honeyValue,    setHoneyValue]    = useState('')

  const cameraRef  = useRef<HTMLInputElement>(null)
  const libraryRef = useRef<HTMLInputElement>(null)

  // ── Photo selection + EXIF GPS extraction ──────────────────────────────────
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setPhoto(file)
    setPreview(URL.createObjectURL(file))
    setExifCoords(null)
    setCoords(null) // reset confirmed coords when photo changes

    setExifScanning(true)
    try {
      const exifr  = await import('exifr')
      const result = await exifr.gps(file)
      if (result?.latitude != null && result?.longitude != null) {
        setExifCoords({ lat: result.latitude, lng: result.longitude })
      }
    } catch {
      // EXIF read failure is non-fatal
    } finally {
      setExifScanning(false)
    }
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!photo || !coords || !category) return
    setSubmitting(true)
    setSubmitError(null)

    const fd = new FormData()
    fd.append('image',    photo)
    fd.append('lat',      String(coords.lat))
    fd.append('lng',      String(coords.lng))
    fd.append('category', category)
    fd.append('hp_field', honeyValue)
    if (description.trim()) fd.append('description', description.trim())

    try {
      const res = await fetch('/api/report', { method: 'POST', body: fd })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      const data = (await res.json()) as { trackingUrl: string }
      setTrackingUrl(data.trackingUrl)
      setStep('success')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error')
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

  // ── Location confirmed from map picker ────────────────────────────────────
  function handleLocationConfirm(c: { lat: number; lng: number }) {
    setCoords(c)
    setStep('category')
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {step !== 'success' && <StepDots current={step} t={t} />}

      {/* ── STEP 1: Photo ──────────────────────────────────────────────────── */}
      {step === 'photo' && (
        <div>
          <h2 className="text-2xl font-bold text-primary mb-1">{t.photoTitle}</h2>
          <p className="text-gray-500 text-sm mb-6">{t.photoDesc}</p>

          {/* Two hidden inputs: camera (capture) and library (no capture) */}
          <input ref={cameraRef}  type="file" accept="image/*" capture="environment" className="sr-only" onChange={handleFile} />
          <input ref={libraryRef} type="file" accept="image/*"                       className="sr-only" onChange={handleFile} />

          {preview ? (
            <div className="relative mb-4">
              <img src={preview} alt={t.photoTitle} className="w-full rounded-2xl object-cover max-h-72" />
              <button
                onClick={() => { setPhoto(null); setPreview(null); setExifCoords(null) }}
                className="absolute top-2 right-2 bg-white/80 backdrop-blur rounded-full w-8 h-8 flex items-center justify-center text-gray-700 hover:bg-white shadow text-sm"
                aria-label={t.photoRemove}
              >✕</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => cameraRef.current?.click()}
                className="h-36 border-2 border-dashed border-primary-300 rounded-2xl flex flex-col items-center justify-center gap-2 text-primary hover:bg-primary-50 active:bg-primary-100 transition-colors"
              >
                <span className="text-4xl leading-none">📷</span>
                <span className="text-sm font-semibold">{t.photoButton}</span>
              </button>
              <button
                onClick={() => libraryRef.current?.click()}
                className="h-36 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <span className="text-4xl leading-none">🖼️</span>
                <span className="text-sm font-semibold">{t.photoLibrary}</span>
              </button>
            </div>
          )}
          {!preview && <p className="text-xs text-center text-gray-400 mb-4">{t.photoHint}</p>}

          {/* EXIF status */}
          {exifScanning && (
            <p className="flex items-center gap-2 text-xs text-gray-500 mb-4">
              <span className="animate-spin inline-block">⏳</span>
              {t.locationExifScanning}
            </p>
          )}
          {!exifScanning && photo && exifCoords && (
            <p className="flex items-center gap-1.5 text-xs text-action font-medium mb-4">
              📍 {t.locationFound}
            </p>
          )}

          <button
            disabled={!photo || exifScanning}
            onClick={() => setStep('location')}
            className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t.navNext}
          </button>
        </div>
      )}

      {/* ── STEP 2: Location map picker ────────────────────────────────────── */}
      {step === 'location' && (
        <div>
          <h2 className="text-2xl font-bold text-primary mb-1">{t.locationConfirmTitle}</h2>
          <p className="text-gray-500 text-sm mb-4">
            {exifCoords ? t.locationDesc : t.locationExifNotFound}
          </p>
          <LocationPickerDynamic
            initialCoords={coords ?? exifCoords}
            exifDetected={exifCoords !== null}
            onConfirm={handleLocationConfirm}
            onBack={() => setStep('photo')}
            t={t}
          />
        </div>
      )}

      {/* ── STEP 3: Category + description ────────────────────────────────── */}
      {step === 'category' && (
        <div>
          <h2 className="text-2xl font-bold text-primary mb-1">{t.categoryTitle}</h2>
          <p className="text-gray-500 text-sm mb-6">{t.categoryDesc}</p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {t.categories.map((cat) => (
              <button key={cat.id} onClick={() => setCategory(cat.id)}
                className={`card p-4 text-left flex flex-col gap-2 transition-all border-2 ${
                  category === cat.id ? 'border-action bg-action/5' : 'border-transparent hover:border-gray-200'
                }`}>
                <span className="text-2xl leading-none">{cat.icon}</span>
                <span className="text-sm font-medium text-gray-800 leading-snug">{cat.label}</span>
              </button>
            ))}
          </div>

          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1.5">
              {t.descLabel} <span className="text-gray-400 font-normal">{t.descOptional}</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder={t.descPlaceholder}
              className="w-full border border-gray-300 rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <p className="text-right text-xs text-gray-400 mt-1">{description.length}/500</p>
          </div>

          {/* Honeypot */}
          <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
            <label htmlFor="hp_field">Leave this empty</label>
            <input id="hp_field" name="hp_field" type="text" tabIndex={-1} autoComplete="off"
              value={honeyValue} onChange={(e) => setHoneyValue(e.target.value)} />
          </div>

          {submitError && <p className="text-red-500 text-sm text-center mb-3">⚠️ {submitError}</p>}

          <div className="flex gap-3">
            <button onClick={() => setStep('location')}
              className="flex-1 border border-gray-200 rounded-2xl py-3 text-gray-600 hover:bg-gray-50 transition-colors">
              {t.navBack}
            </button>
            <button
              disabled={!category || submitting}
              onClick={handleSubmit}
              className="flex-1 btn-action disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting
                ? <><span className="animate-spin inline-block">⏳</span> {t.submitting}</>
                : t.submit}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Success ────────────────────────────────────────────────── */}
      {step === 'success' && (
        <div className="text-center py-4">
          <div className="text-7xl mb-5 animate-bounce">✅</div>
          <h2 className="text-2xl font-bold text-primary mb-2">{t.successTitle}</h2>
          <p className="text-gray-500 text-sm mb-8 max-w-sm mx-auto">{t.successDesc}</p>

          <div className="card bg-gray-50 mb-6 text-left">
            <p className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">{t.successLinkLabel}</p>
            <p className="text-sm font-mono text-primary break-all mb-4">{trackingUrl}</p>
            <button
              onClick={handleCopy}
              className={`w-full py-2.5 rounded-2xl text-sm font-semibold transition-colors ${
                copied ? 'bg-action text-white' : 'bg-primary text-white hover:bg-primary-600'
              }`}
            >
              {copied ? '✓ ' + t.successLinkLabel : '📋 ' + t.successLinkLabel}
            </button>
          </div>

          <a href="/map" className="text-sm text-primary hover:underline">{t.successMapLink}</a>
        </div>
      )}
    </div>
  )
}
