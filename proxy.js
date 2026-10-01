import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { COOKIE } from '@/lib/auth'

// Public paths: no session needed.
const PUBLIC_PREFIXES = ['/login', '/api/auth', '/api/health', '/_next', '/favicon', '/robots.txt']

function secret() {
  const s = process.env.AUTH_SECRET
  if (s) return new TextEncoder().encode(s)
  // Fail closed in production; a well-known dev secret is only allowed locally.
  if (process.env.NODE_ENV === 'production') return null
  return new TextEncoder().encode('dev-secret-set-AUTH_SECRET-in-env')
}

function toLogin(request, { keepFrom } = {}) {
  const url = request.nextUrl.clone()
  url.pathname = '/login'
  url.search = ''
  if (keepFrom) url.searchParams.set('from', request.nextUrl.pathname)
  return NextResponse.redirect(url)
}

export async function proxy(request) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next()

  const key = secret()
  const token = request.cookies.get(COOKIE)?.value

  if (!key || !token) return toLogin(request, { keepFrom: true })

  try {
    await jwtVerify(token, key)
    return NextResponse.next()
  } catch {
    return toLogin(request)
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
