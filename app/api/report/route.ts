import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { reverseGeocode } from '@/lib/geocoding'
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'

const MAX_BYTES = 500 * 1024 // 500 KB
const STORAGE_BUCKET = 'reports'

// Progressively harder compression until under MAX_BYTES
async function compressImage(raw: Buffer): Promise<Buffer> {
  const attempts = [
    { width: 1920, quality: 80 },
    { width: 1200, quality: 65 },
    { width: 900,  quality: 50 },
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

export async function POST(req: NextRequest) {
  const formData = await req.formData()

  // ── Honeypot ───────────────────────────────────────────────────────────────
  // Bots fill every visible field. This field is never shown to real users.
  // A non-empty value means a bot submitted the form — silently accept & discard.
  const honeypot = formData.get('hp_field')?.toString() ?? ''
  if (honeypot.trim() !== '') {
    const fakeToken = crypto.randomUUID().replace(/-/g, '').slice(0, 12)
    return NextResponse.json({
      token: fakeToken,
      trackingUrl: `${originOf(req)}/r/${fakeToken}`,
    })
  }

  // ── Input validation ───────────────────────────────────────────────────────
  const imageFile = formData.get('image') as File | null
  const lat = parseFloat(formData.get('lat')?.toString() ?? '')
  const lng = parseFloat(formData.get('lng')?.toString() ?? '')
  const category = formData.get('category')?.toString() ?? ''

  if (!imageFile || isNaN(lat) || isNaN(lng) || !category) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (imageFile.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Image too large (max 10 MB)' }, { status: 413 })
  }

  // Bounding box for Greece (mainland + islands)
  if (lat < 34.8 || lat > 41.8 || lng < 19.3 || lng > 29.7) {
    return NextResponse.json({ error: 'Coordinates outside Greece' }, { status: 422 })
  }

  if (!['illegal_dump', 'roadside_litter', 'abandoned_vehicle', 'vandalism', 'other'].includes(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 422 })
  }

  // ── Image compression ──────────────────────────────────────────────────────
  let compressed: Buffer
  try {
    const raw = Buffer.from(await imageFile.arrayBuffer())
    compressed = await compressImage(raw)
  } catch {
    return NextResponse.json({ error: 'Image processing failed' }, { status: 422 })
  }

  // ── Token & geocoding ──────────────────────────────────────────────────────
  const publicToken = crypto.randomUUID().replace(/-/g, '').slice(0, 12)
  const { municipalityName } = await reverseGeocode(lat, lng)

  // ── Stub mode (Supabase not yet configured) ────────────────────────────────
  if (!isSupabaseConfigured) {
    console.info(`[stub] report ${publicToken} | ${municipalityName} | ${category} | ${compressed.length} bytes`)
    return NextResponse.json({
      token: publicToken,
      trackingUrl: `${originOf(req)}/r/${publicToken}`,
      _stub: true,
    })
  }

  // ── Upload image ───────────────────────────────────────────────────────────
  const { error: uploadErr } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(`${publicToken}.webp`, compressed, {
      contentType: 'image/webp',
      upsert: false,
    })

  if (uploadErr) {
    console.error('Storage upload error:', uploadErr)
    return NextResponse.json({ error: 'Storage error' }, { status: 500 })
  }

  const { data: urlData } = supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(`${publicToken}.webp`)

  // ── Insert report ──────────────────────────────────────────────────────────
  const { error: dbErr } = await supabaseAdmin.from('reports').insert({
    public_token: publicToken,
    image_url: urlData.publicUrl,
    lat,
    lng,
    category,
    status: 'pending',
    is_approved: false,
    // municipality_id resolved in a background job that matches municipalityName to the table
  })

  if (dbErr) {
    console.error('DB insert error:', dbErr)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({
    token: publicToken,
    trackingUrl: `${originOf(req)}/r/${publicToken}`,
  })
}
