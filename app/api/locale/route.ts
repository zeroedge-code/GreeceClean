import { NextRequest, NextResponse } from 'next/server'
import { LOCALES } from '@/lib/i18n/types'
import type { Locale } from '@/lib/i18n/types'

export async function POST(req: NextRequest) {
  const { locale } = (await req.json()) as { locale: unknown }

  if (!LOCALES.includes(locale as Locale)) {
    return NextResponse.json({ error: 'Invalid locale' }, { status: 400 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set('locale', locale as string, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    httpOnly: false,
  })
  return res
}
