import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { createSessionToken, COOKIE } from '@/lib/auth'
import { rateLimit, clientIp } from '@/lib/rate-limit'

function safeEqual(a, b) {
  const ab = Buffer.from(String(a))
  const bb = Buffer.from(String(b))
  // Compare equal-length buffers in constant time (length leak is acceptable for a shared password).
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

const INVALID = { error: 'Invalid email or password.' }

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  // Throttle by IP and by email so one address cannot be hammered from many IPs.
  const byIp = rateLimit(`ip:${clientIp(request)}`, { limit: 10 })
  const byEmail = email ? rateLimit(`email:${email}`, { limit: 5 }) : { ok: true }
  if (!byIp.ok || !byEmail.ok) {
    const retryAfter = Math.max(byIp.retryAfter ?? 0, byEmail.retryAfter ?? 0)
    return NextResponse.json(
      { error: 'Too many attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  const correctPassword = process.env.DASHBOARD_PASSWORD
  if (!correctPassword) {
    console.error('DASHBOARD_PASSWORD is not configured')
    return NextResponse.json({ error: 'Sign-in is not configured.' }, { status: 500 })
  }

  // Same response for "not allowed" and "wrong password" so the allowlist cannot be probed.
  const allowlist = process.env.DASHBOARD_ALLOWED_EMAILS
  if (allowlist) {
    const allowed = allowlist.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
    if (!allowed.includes(email)) return NextResponse.json(INVALID, { status: 401 })
  }

  if (!email || !safeEqual(password, correctPassword)) {
    return NextResponse.json(INVALID, { status: 401 })
  }

  const token = await createSessionToken(email)

  const res = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12, // 12 hours
  })
  return res
}
