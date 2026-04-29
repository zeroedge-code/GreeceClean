import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'

type Params = { params: Promise<{ id: string }> }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const { id } = await params
  const body = (await req.json()) as {
    email_official?: string
    region?: string
    name_en?: string
  }

  const update: Record<string, string> = {}

  if ('email_official' in body) {
    const email = (body.email_official ?? '').trim().toLowerCase()
    if (email !== '' && !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }
    update.email_official = email || ''
  }

  if ('region' in body) {
    update.region = (body.region ?? '').trim()
  }

  if ('name_en' in body) {
    update.name_en = (body.name_en ?? '').trim()
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('municipalities')
    .update(update)
    .eq('id', id)

  if (error) {
    console.error('Municipality PATCH error:', error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
