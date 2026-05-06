import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'

function isValidSession(token: string | undefined): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD
  const cookieSecret = process.env.ADMIN_COOKIE_SECRET
  if (!token || !adminPassword || !cookieSecret) return false
  const expected = createHmac('sha256', cookieSecret).update(adminPassword).digest('hex')
  try {
    return token.length === expected.length &&
      timingSafeEqual(Buffer.from(token), Buffer.from(expected))
  } catch { return false }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isAuthRoute =
    pathname === '/admin/login' ||
    pathname.startsWith('/api/admin/login') ||
    pathname.startsWith('/api/admin/logout')

  if (isAuthRoute) return NextResponse.next()

  const session = req.cookies.get('admin_session')?.value
  if (!isValidSession(session)) {
    const loginUrl = new URL('/admin/login', req.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
