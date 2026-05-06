'use client'

import { useState, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import exifr from 'exifr'
import type { Dictionary } from '@/lib/i18n/types'
import { CATEGORY_META } from '@/lib/categories'

type FormTranslations = Dictionary['form']
type CopyTranslations = Dictionary['copy']
type Step = 'category' | 'photos' | 'location' | 'submit' | 'success'
const STEPS: Step[] = ['category', 'photos', 'location', 'submit']

// ── LocalStorage draft ────────────────────────────────────────────────────────
const DRAFT_KEY = 'gc_draft'
type Draft = { category?: string; coords?: { lat: number; lng: number }; description?: string }

function saveDraft(updates: Partial<Draft>) {
  try {
    const existing: Draft = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? '{}')
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...existing, ...updates }))
  } catch { /* ignore */ }
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
}

// ── Lazy Leaflet ──────────────────────────────────────────────────────────────
const LocationPickerDynamic = dynamic(() => import('./LocationPicker'), {
  ssr: false,
  loading: () => (
    <div className="w-full rounded-2xl border border-gray-200 bg-gray-100 flex items-center justify-center" style={{ height: 280 }}>
      <span className="text-gray-400 animate-spin">⏳</span>
    </div>
  ),
})

// ── Photo helpers ─────────────────────────────────────────────────────────────
type PhotoEntry = { file: File; preview: string }

// Downsample to max 1200px and produce a compressed File for submission.
// Keeps the large original blob out of React state, preventing OOM on mobile
// and Vercel 4.5 MB request limit (HTTP 413).
function compressToFile(file: File, maxPx = 1200): Promise<{ preview: string; compressed: File }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')?.drawImage(img, 0, 0, w, h)
      const preview = canvas.toDataURL('image/jpeg', 0.82)
      canvas.toBlob((blob) => {
        const compressed = blob ? new File([blob], 'photo.jpg', { type: 'image/jpeg' }) : file
        resolve({ preview, compressed })
      }, 'image/jpeg', 0.82)
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve({ preview: url, compressed: file }) }
    img.src = url
  })
}

// ── Step dots ─────────────────────────────────────────────────────────────────
function StepDots({ current, t }: { current: Step; t: FormTranslations }) {
  const idx    = STEPS.indexOf(current)
  const labels = [
    t.categoryTitle,
    t.photoTitle,
    t.locationTitle,
    t.submit.split(' ')[0],
  ]
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

// ── Main component ────────────────────────────────────────────────────────────
export default function ReportForm({
  translations: t,
  copyTranslations: ct,
}: {
  translations: FormTranslations
  copyTranslations: CopyTranslations
}) {
  const [step,         setStep]        = useState<Step>('category')
  const [category,     setCategory]    = useState<string | null>(null)
  const [photos,       setPhotos]      = useState<PhotoEntry[]>([])
  const [exifCoords,   setExifCoords]  = useState<{ lat: number; lng: number } | null>(null)
  const [exifScanning, setExifScanning] = useState(false)
  const [coords,       setCoords]      = useState<{ lat: number; lng: number } | null>(null)
  const [description,  setDescription] = useState('')
  const [submitting,   setSubmitting]  = useState(false)
  const [submitError,  setSubmitError] = useState<string | null>(null)
  const [trackingUrl,  setTrackingUrl] = useState('')
  const [copied,       setCopied]      = useState(false)
  const [honeyValue,   setHoneyValue]  = useState('')

  // ── Camera state ────────────────────────────────────────────────────────────
  const [cameraStream,   setCameraStream]   = useState<MediaStream | null>(null)
  const [showCameraView, setShowCameraView] = useState(false)
  const [cameraError,    setCameraError]    = useState(false)
  const videoRef  = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Attach stream to video element
  useEffect(() => {
    const video = videoRef.current
    if (!video || !cameraStream) return
    video.srcObject = cameraStream
  }, [cameraStream, showCameraView])

  // ── Restore LocalStorage draft on mount ─────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (!saved) return
      const draft: Draft = JSON.parse(saved)
      if (draft.category) {
        setCategory(draft.category)
        setStep('photos') // skip category since it's already chosen
      }
      if (draft.coords) setCoords(draft.coords)
      if (draft.description) setDescription(draft.description)
    } catch { /* ignore */ }
  }, [])

  // ── Camera helpers ───────────────────────────────────────────────────────────
  async function openCameraView() {
    if (!navigator.mediaDevices?.getUserMedia) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      setCameraError(false)
      setShowCameraView(true)
      setCameraStream(stream)
    } catch {
      setCameraError(true)
    }
  }

  function stopCamera() {
    cameraStream?.getTracks().forEach((track) => track.stop())
    setCameraStream(null)
    setShowCameraView(false)
  }

  function captureFrame() {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width  = video.videoWidth  || 1280
    canvas.height = video.videoHeight || 720
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    stopCamera()
    canvas.toBlob((blob) => {
      if (!blob) return
      const file    = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' })
      const preview = URL.createObjectURL(blob)
      setPhotos(prev => [...prev, { file, preview }])
      // Camera frames carry no EXIF — try device GPS if no coords yet
      if (!exifCoords && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => setExifCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => null,
          { timeout: 8000, maximumAge: 60_000 },
        )
      }
    }, 'image/jpeg', 0.82)
  }

  // ── Library file handler ─────────────────────────────────────────────────────
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || photos.length >= 3) return
    e.target.value = ''

    const shouldScanExif = !exifCoords
    if (shouldScanExif) setExifScanning(true)

    const [{ preview, compressed }] = await Promise.all([
      compressToFile(file),
      shouldScanExif
        ? exifr.gps(file).then((result) => {
            if (result?.latitude != null && result?.longitude != null) {
              setExifCoords({ lat: result.latitude, lng: result.longitude })
            }
          }).catch(() => null)
        : Promise.resolve(null),
    ])

    if (shouldScanExif) setExifScanning(false)
    setPhotos(prev => [...prev, { file: compressed, preview }])
  }

  // ── Photo management ─────────────────────────────────────────────────────────
  function removePhoto(index: number) {
    setPhotos(prev => {
      const next = prev.filter((_, i) => i !== index)
      if (next.length === 0) setExifCoords(null)
      return next
    })
  }

  function movePhoto(from: number, direction: -1 | 1) {
    const to = from + direction
    if (to < 0 || to >= photos.length) return
    setPhotos(prev => {
      const arr = [...prev]
      ;[arr[from], arr[to]] = [arr[to], arr[from]]
      return arr
    })
  }

  // ── Location confirmed ───────────────────────────────────────────────────────
  function handleLocationConfirm(c: { lat: number; lng: number }) {
    setCoords(c)
    saveDraft({ coords: c })
    setStep('submit')
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (skipDescription = false) => {
    if (!photos.length || !coords || !category) return
    setSubmitting(true)
    setSubmitError(null)

    const fd = new FormData()
    photos.forEach((p, i) => fd.append(i === 0 ? 'image' : `image${i + 1}`, p.file))
    fd.append('lat',      String(coords.lat))
    fd.append('lng',      String(coords.lng))
    fd.append('category', category)
    fd.append('hp_field', honeyValue)
    if (!skipDescription && description.trim()) fd.append('description', description.trim())

    try {
      const res = await fetch('/api/report', { method: 'POST', body: fd })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      const data = (await res.json()) as { trackingUrl: string }
      setTrackingUrl(data.trackingUrl)
      clearDraft()
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

  const supportsCamera = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {step !== 'success' && <StepDots current={step} t={t} />}

      {/* ── STEP 1: Category ──────────────────────────────────────────────── */}
      {step === 'category' && (
        <div>
          <h2 className="text-2xl font-bold text-primary mb-1">{t.categoryTitle}</h2>
          <p className="text-gray-500 text-sm mb-6">{t.categoryDesc}</p>

          <div className="grid grid-cols-3 gap-3">
            {t.categories.map((cat) => {
              const meta = CATEGORY_META[cat.id]
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setCategory(cat.id)
                    saveDraft({ category: cat.id })
                    setStep('photos')
                  }}
                  className={`rounded-2xl p-3 text-left flex flex-col gap-2 transition-all duration-150 border-2 border-transparent active:scale-95 hover:scale-105 ${meta?.bgColor ?? 'bg-gray-50'} ${meta?.borderHover ?? 'hover:border-gray-300'}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${meta?.iconBg ?? 'bg-gray-100'}`}>
                    <span className="text-xl leading-none">{cat.icon}</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-800 leading-snug">{cat.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── STEP 2: Photos ────────────────────────────────────────────────── */}
      {step === 'photos' && (
        <div>
          <h2 className="text-2xl font-bold text-primary mb-1">{t.photoTitle}</h2>
          <p className="text-gray-500 text-sm mb-5">{t.photosMultiDesc}</p>

          {/* ── Live camera viewfinder ── */}
          {showCameraView && (
            <div className="relative mb-4 rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: '4/3' }}>
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute bottom-5 inset-x-0 flex items-center justify-between px-8">
                <button
                  onClick={stopCamera}
                  className="text-white text-sm font-medium bg-black/40 backdrop-blur rounded-full px-4 py-2"
                >
                  {t.navBack}
                </button>
                <button
                  onClick={captureFrame}
                  className="w-16 h-16 rounded-full bg-white shadow-xl flex items-center justify-center"
                  aria-label="Capture"
                >
                  <span className="w-12 h-12 rounded-full bg-white border-2 border-gray-300 block" />
                </button>
                <div className="w-16" />
              </div>
            </div>
          )}

          {/* ── Photo thumbnails with reorder + remove ── */}
          {!showCameraView && photos.length > 0 && (
            <div className="flex gap-3 mb-4 overflow-x-auto pb-1">
              {photos.map((p, i) => (
                <div key={i} className="relative shrink-0">
                  <img
                    src={p.preview}
                    alt={`Photo ${i + 1}`}
                    className={`rounded-xl object-cover ${photos.length === 1 ? 'w-40 h-40' : 'w-28 h-28'}`}
                  />
                  {/* Position badge */}
                  <div className="absolute top-1 left-1 bg-black/60 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {i + 1}
                  </div>
                  {/* Remove */}
                  <button
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 bg-white/90 rounded-full w-6 h-6 flex items-center justify-center text-gray-700 shadow text-xs"
                    aria-label={t.photoRemove}
                  >✕</button>
                  {/* Reorder arrows */}
                  {photos.length > 1 && (
                    <div className="absolute bottom-1 inset-x-1 flex justify-between">
                      <button
                        onClick={() => movePhoto(i, -1)}
                        disabled={i === 0}
                        className="bg-black/50 text-white rounded text-xs px-1 disabled:opacity-0"
                      >←</button>
                      <button
                        onClick={() => movePhoto(i, 1)}
                        disabled={i === photos.length - 1}
                        className="bg-black/50 text-white rounded text-xs px-1 disabled:opacity-0"
                      >→</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Add photo buttons (camera + library) ── */}
          {!showCameraView && photos.length < 3 && (
            <>
              <div className={`grid gap-3 mb-3 ${supportsCamera ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {supportsCamera && (
                  <button
                    onClick={openCameraView}
                    className={`border-2 border-dashed border-primary-300 rounded-2xl flex flex-col items-center justify-center gap-2 text-primary hover:bg-primary-50 active:bg-primary-100 transition-colors ${photos.length === 0 ? 'h-36' : 'h-20'}`}
                  >
                    <span className={`${photos.length === 0 ? 'text-4xl' : 'text-2xl'} leading-none`}>📷</span>
                    <span className={`${photos.length === 0 ? 'text-sm' : 'text-xs'} font-semibold`}>
                      {photos.length === 0 ? t.photoButton : '+ 📷'}
                    </span>
                  </button>
                )}
                <label className={`border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer select-none ${photos.length === 0 ? 'h-36' : 'h-20'}`}>
                  <span className={`${photos.length === 0 ? 'text-4xl' : 'text-2xl'} leading-none`}>🖼️</span>
                  <span className={`${photos.length === 0 ? 'text-sm' : 'text-xs'} font-semibold`}>
                    {photos.length === 0 ? t.photoLibrary : '+ 🖼️'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFile}
                    className="sr-only"
                  />
                </label>
              </div>
              {photos.length === 0 && (
                <p className="text-xs text-center text-gray-400 mb-2">{t.photoHint}</p>
              )}
              {cameraError && (
                <p className="flex items-center gap-1.5 text-xs text-red-600 font-medium mb-2">
                  ⚠️ {t.photoCameraError}
                </p>
              )}
            </>
          )}

          {/* EXIF / GPS status */}
          {exifScanning && (
            <p className="flex items-center gap-2 text-xs text-gray-500 mb-4">
              <span className="animate-spin inline-block">⏳</span>
              {t.locationExifScanning}
            </p>
          )}
          {!exifScanning && exifCoords && photos.length > 0 && (
            <p className="flex items-center gap-1.5 text-xs text-action font-medium mb-4">
              📍 {t.locationFound}
            </p>
          )}

          {!showCameraView && (
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setStep('category')}
                className="flex-1 border border-gray-200 rounded-2xl py-3 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {t.navBack}
              </button>
              <button
                disabled={photos.length === 0 || exifScanning}
                onClick={() => setStep('location')}
                className="flex-1 btn-primary disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {exifScanning && <span className="animate-spin inline-block leading-none">⏳</span>}
                {t.navNext}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 3: Location ──────────────────────────────────────────────── */}
      {step === 'location' && (
        <div>
          <h2 className="text-2xl font-bold text-primary mb-1">{t.locationTitle}</h2>
          <p className="text-gray-500 text-sm mb-4">
            {exifCoords ? t.locationFound : t.locationDesc}
          </p>
          <LocationPickerDynamic
            initialCoords={coords ?? exifCoords}
            onConfirm={handleLocationConfirm}
            onBack={() => setStep('photos')}
            t={t}
          />
        </div>
      )}

      {/* ── STEP 4: Submit ────────────────────────────────────────────────── */}
      {step === 'submit' && (
        <div>
          <h2 className="text-2xl font-bold text-primary mb-5">{t.submitTitle}</h2>

          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1.5">
              {t.descLabel} <span className="text-gray-400 font-normal">{t.descOptional}</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => { setDescription(e.target.value); saveDraft({ description: e.target.value }) }}
              maxLength={500}
              rows={4}
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

          <div className="flex gap-3 mb-3">
            <button
              onClick={() => setStep('location')}
              className="flex-1 border border-gray-200 rounded-2xl py-3 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {t.navBack}
            </button>
            <button
              disabled={submitting}
              onClick={() => handleSubmit(false)}
              className="flex-1 btn-action disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting
                ? <><span className="animate-spin inline-block">⏳</span> {t.submitting}</>
                : t.submit}
            </button>
          </div>

          {!submitting && (
            <button
              onClick={() => handleSubmit(true)}
              className="w-full text-xs text-gray-400 hover:text-gray-600 text-center py-1.5 transition-colors"
            >
              {t.submitSkip}
            </button>
          )}
        </div>
      )}

      {/* ── Success ───────────────────────────────────────────────────────── */}
      {step === 'success' && (
        <div className="text-center py-4">
          <div className="text-7xl mb-5 animate-bounce">✅</div>
          <h2 className="text-2xl font-bold text-primary mb-3">{t.successTitle}</h2>
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
              {copied ? ct.copied : ct.copy}
            </button>
          </div>

          <button
            onClick={() => {
              setStep('category')
              setCategory(null)
              setPhotos([])
              setExifCoords(null)
              setCoords(null)
              setDescription('')
              setTrackingUrl('')
              setCopied(false)
            }}
            className="w-full btn-primary mb-4"
          >
            {t.successAnother}
          </button>

          <a href="/map" className="text-sm text-primary hover:underline">{t.successMapLink}</a>
        </div>
      )}
    </div>
  )
}
