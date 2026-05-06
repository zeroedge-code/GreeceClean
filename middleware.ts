import { NextRequest, NextResponse } from 'next/server'

async function hmacHex(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('')
}

async function isValidSession(token: string | undefined): Promise<boolean> {
  const adminPassword = process.env.ADMIN_PASSWORD
  const cookieSecret  = process.env.ADMIN_COOKIE_SECRET
  if (!token || !adminPassword || !cookieSecret) return false
  const expected = await hmacHex(cookieSecret, adminPassword)
  if (token.length !== expected.length) return false
  // Constant-time comparison without Node.js timingSafeEqual
  const enc = new TextEncoder()
  const a = enc.encode(token)
  const b = enc.encode(expected)
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isAuthRoute =
    pathname === '/admin/login' ||
    pathname.startsWith('/api/admin/login') ||
    pathname.startsWith('/api/admin/logout')

  if (isAuthRoute) return NextResponse.next()

  const session = req.cookies.get('admin_session')?.value
  if (!await isValidSession(session)) {
    const loginUrl = new URL('/admin/login', req.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
