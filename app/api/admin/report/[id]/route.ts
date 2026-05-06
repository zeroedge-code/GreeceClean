import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { buildMunicipalityReportEmail, type ReportForEmail } from '@/lib/emailTemplates'
import { VALID_CATEGORIES } from '@/lib/categories'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const { id } = await params
  let body: {
    action?: string
    category?: string
    status?: string
    municipality_id?: string | null
    description?: string | null
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const VALID_STATUSES = ['pending', 'in_review', 'forwarded', 'resolved', 'rejected']
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  let update: Record<string, unknown>
  if (body.action === 'approve') {
    update = { is_approved: true, status: 'in_review' }
  } else if (body.action === 'mark_cleaned') {
    update = { status: 'resolved' }
  } else if (body.action === 'reject') {
    update = { is_approved: false, status: 'rejected' }
  } else if (body.action === 'deactivate') {
    update = { is_approved: false, status: 'pending' }
  } else if (body.action === 'forward') {
    return handleForward(id)
  } else if (body.action === 'edit') {
    update = {}
    if (body.category && VALID_CATEGORIES.includes(body.category)) update.category = body.category
    if (body.status && VALID_STATUSES.includes(body.status)) update.status = body.status
    if ('municipality_id' in body) {
      update.municipality_id = body.municipality_id && UUID_RE.test(body.municipality_id)
        ? body.municipality_id
        : null
    }
    if ('description' in body) {
      update.description = body.description?.trim() || null
    }
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

async function handleForward(id: string): Promise<NextResponse> {
  const { data: report, error: fetchError } = await supabaseAdmin
    .from('reports')
    .select('id, public_token, category, description, lat, lng, image_url, created_at, status, municipality_id, municipality:municipality_id(id, name_el, email_official)')
    .eq('id', id)
    .single()

  if (fetchError || !report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  const muni = report.municipality as unknown as { id: string; name_el: string; email_official: string | null } | null

  if (!muni) {
    return NextResponse.json({ error: 'Δεν έχει οριστεί δήμος για αυτή την αναφορά' }, { status: 422 })
  }
  if (!muni.email_official) {
    return NextResponse.json({ error: `Ο δήμος ${muni.name_el} δεν έχει email επικοινωνίας` }, { status: 422 })
  }

  const { error: updateError } = await supabaseAdmin
    .from('reports')
    .update({ status: 'forwarded' })
    .eq('id', id)

  if (updateError) {
    console.error('Forward update error:', updateError)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  const { subject, html } = buildMunicipalityReportEmail(
    report as unknown as ReportForEmail,
    { id: muni.id, name_el: muni.name_el, email_official: muni.email_official },
  )

  let emailStatus: 'sent' | 'failed' = 'sent'
  let emailError: string | null = null

  try {
    await sendEmail({ to: muni.email_official, subject, html })
  } catch (e) {
    emailStatus = 'failed'
    emailError = e instanceof Error ? e.message : 'Unknown error'
    console.error('Forward email error:', emailError)
  }

  await supabaseAdmin.from('email_logs').insert({
    report_id:        id,
    municipality_id:  muni.id,
    recipient_email:  muni.email_official,
    status:           emailStatus,
    error_message:    emailError,
  })

  if (emailStatus === 'failed') {
    return NextResponse.json(
      { ok: true, warning: `Το status άλλαξε σε "forwarded" αλλά το email απέτυχε: ${emailError}` },
      { status: 207 },
    )
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
