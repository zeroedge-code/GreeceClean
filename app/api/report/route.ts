import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { reverseGeocode } from '@/lib/geocoding'
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'

const MAX_BYTES = 500 * 1024 // 500 KB per image
const STORAGE_BUCKET = 'reports'

async function compressImage(raw: Buffer): Promise<Buffer> {
  const attempts = [
    { width: 1920, quality: 80 },
    { width: 1200, quality: 65 },
    { width: 900,  quality: 50 },
    { width: 700,  quality: 30 },
  ] as const

  for (const { width, quality } of attempts) {
    const buf = await sharp(raw)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality })
      .toBuffer()
    if (buf.length <= MAX_BYTES) return buf
  }

  throw new Error('Image cannot be compressed below 500 KB')
}

function originOf(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-host')
  const proto = req.headers.get('x-forwarded-proto') ?? 'http'
  if (forwarded) return `${proto}://${forwarded}`
  return req.nextUrl.origin
}

// Look up municipality by name; auto-create if not found.
async function resolveMunicipalityId(name: string): Promise<string | null> {
  if (!name) return null

  const { data: exact } = await supabaseAdmin
    .from('municipalities')
    .select('id')
    .ilike('name_el', name)
    .maybeSingle()
  if (exact) return exact.id

  const { data: partial } = await supabaseAdmin
    .from('municipalities')
    .select('id')
    .ilike('name_el', `%${name}%`)
    .limit(1)
    .maybeSingle()
  if (partial) return partial.id

  const { data: created } = await supabaseAdmin
    .from('municipalities')
    .insert({ name_el: name, name_en: '' })
    .select('id')
    .single()
  return created?.id ?? null
}

export async function POST(req: NextRequest) {
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // ── Honeypot ───────────────────────────────────────────────────────────────
  const honeypot = formData.get('hp_field')?.toString() ?? ''
  if (honeypot.trim() !== '') {
    const fakeToken = crypto.randomUUID().replace(/-/g, '').slice(0, 12)
    return NextResponse.json({
      token: fakeToken,
      trackingUrl: `${originOf(req)}/r/${fakeToken}`,
    })
  }

  // ── Input validation ───────────────────────────────────────────────────────
  const imageFiles = [
    formData.get('image')  as File | null,
    formData.get('image2') as File | null,
    formData.get('image3') as File | null,
  ].filter((f): f is File => f !== null && f.size > 0)

  const lat      = parseFloat(formData.get('lat')?.toString() ?? '')
  const lng      = parseFloat(formData.get('lng')?.toString() ?? '')
  const category = formData.get('category')?.toString() ?? ''
  const description = formData.get('description')?.toString().slice(0, 500) || null

  if (imageFiles.length === 0 || isNaN(lat) || isNaN(lng) || !category) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  for (const f of imageFiles) {
    if (f.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image too large (max 10 MB)' }, { status: 413 })
    }
  }

  if (!['illegal_dump', 'roadside_litter', 'abandoned_vehicle', 'vandalism', 'other'].includes(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 422 })
  }

  // ── Compress all images ────────────────────────────────────────────────────
  let compressedImages: Buffer[]
  try {
    compressedImages = await Promise.all(
      imageFiles.map(async (f) => {
        const raw = Buffer.from(await f.arrayBuffer())
        return compressImage(raw)
      })
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Image processing failed'
    return NextResponse.json({ error: msg }, { status: 422 })
  }

  // ── Token & geocoding ──────────────────────────────────────────────────────
  const publicToken = crypto.randomUUID().replace(/-/g, '').slice(0, 12)
  const { municipalityName } = await reverseGeocode(lat, lng)

  // ── Stub mode ──────────────────────────────────────────────────────────────
  if (!isSupabaseConfigured) {
    console.info(`[stub] report ${publicToken} | ${municipalityName} | ${category} | ${compressedImages.length} image(s)`)
    return NextResponse.json({
      token: publicToken,
      trackingUrl: `${originOf(req)}/r/${publicToken}`,
      _stub: true,
    })
  }

  // ── Upload all images + resolve municipality in parallel ───────────────────
  const storagePaths = compressedImages.map((_, i) =>
    i === 0 ? `${publicToken}.webp` : `${publicToken}_${i + 1}.webp`
  )

  const [uploadResults, municipalityId] = await Promise.all([
    Promise.all(
      compressedImages.map((buf, i) =>
        supabaseAdmin.storage
          .from(STORAGE_BUCKET)
          .upload(storagePaths[i], buf, { contentType: 'image/webp', upsert: false })
      )
    ),
    resolveMunicipalityId(municipalityName),
  ])

  for (const result of uploadResults) {
    if (result.error) {
      console.error('Storage upload error:', result.error)
      return NextResponse.json({ error: 'Storage error' }, { status: 500 })
    }
  }

  const imageUrls = storagePaths.map((path) =>
    supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl
  )

  // ── Insert report ──────────────────────────────────────────────────────────
  const { error: dbErr } = await supabaseAdmin.from('reports').insert({
    public_token:    publicToken,
    image_url:       imageUrls[0],
    image_urls:      imageUrls,
    lat,
    lng,
    category,
    status:          'pending',
    is_approved:     false,
    municipality_id: municipalityId,
    description,
  })

  if (dbErr) {
    console.error('DB insert error:', dbErr)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({
    token:       publicToken,
    trackingUrl: `${originOf(req)}/r/${publicToken}`,
  })
}
