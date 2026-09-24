import { NextResponse } from 'next/server'
import { createSessionToken, COOKIE } from '@/lib/auth'

export async function POST(request) {
  const { email, password } = await request.json()

  const correctPassword = process.env.DASHBOARD_PASSWORD
  if (!correctPassword) {
    return NextResponse.json({ error: 'DASHBOARD_PASSWORD is not configured.' }, { status: 500 })
  }

  // Optional email allowlist
  const allowlist = process.env.DASHBOARD_ALLOWED_EMAILS
  if (allowlist) {
    const allowed = allowlist.split(',').map(e => e.trim().toLowerCase())
    if (!allowed.includes(email?.toLowerCase())) {
      return NextResponse.json({ error: 'Email not on the allowlist.' }, { status: 403 })
    }
  }

  if (!email || password !== correctPassword) {
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 })
  }

  const token = await createSessionToken(email.toLowerCase().trim())

  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12, // 12 hours
  })
  return res
}
