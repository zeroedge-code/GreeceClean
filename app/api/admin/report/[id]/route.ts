import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const { id } = await params
  const body = (await req.json()) as {
    action?: string
    category?: string
    status?: string
  }

  const VALID_CATEGORIES = ['illegal_dump', 'roadside_litter', 'abandoned_vehicle', 'vandalism', 'other']
  const VALID_STATUSES = ['pending', 'in_review', 'forwarded', 'resolved', 'rejected']

  let update: Record<string, unknown>
  if (body.action === 'approve') {
    update = { is_approved: true, status: 'in_review' }
  } else if (body.action === 'mark_cleaned') {
    update = { status: 'resolved' }
  } else if (body.action === 'reject') {
    update = { is_approved: false, status: 'rejected' }
  } else if (body.action === 'deactivate') {
    update = { is_approved: false, status: 'pending' }
  } else if (body.action === 'edit') {
    update = {}
    if (body.category && VALID_CATEGORIES.includes(body.category)) update.category = body.category
    if (body.status && VALID_STATUSES.includes(body.status)) update.status = body.status
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('reports').update(update).eq('id', id)
  if (error) {
    console.error('Admin PATCH error:', error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const { id } = await params

  // Fetch public_token first so we can remove the stored image
  const { data: report } = await supabaseAdmin
    .from('reports')
    .select('public_token')
    .eq('id', id)
    .single()

  if (report?.public_token) {
    await supabaseAdmin.storage.from('reports').remove([`${report.public_token}.webp`])
  }

  const { error } = await supabaseAdmin.from('reports').delete().eq('id', id)
  if (error) {
    console.error('Admin DELETE error:', error)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
