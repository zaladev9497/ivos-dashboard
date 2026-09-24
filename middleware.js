import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { COOKIE } from '@/lib/auth'

function secret() {
  const s = process.env.AUTH_SECRET
  if (!s) return new TextEncoder().encode('dev-secret-set-AUTH_SECRET-in-env')
  return new TextEncoder().encode(s)
}

export async function middleware(request) {
  const { pathname } = request.nextUrl

  // Public paths — no auth needed
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }

  const token = request.cookies.get(COOKIE)?.value

  if (!token) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  try {
    await jwtVerify(token, secret())
    return NextResponse.next()
  } catch {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
