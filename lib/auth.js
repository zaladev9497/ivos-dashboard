import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const COOKIE = 'dashboard_session'

function secret() {
  const s = process.env.AUTH_SECRET
  if (!s) throw new Error('AUTH_SECRET env var is not set')
  return new TextEncoder().encode(s)
}

export async function createSessionToken(email) {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(secret())
}

export async function verifySessionToken(token) {
  try {
    const { payload } = await jwtVerify(token, secret())
    return payload
  } catch {
    return null
  }
}

// Call from server components / server actions
export async function getActor() {
  try {
    const store = await cookies()
    const token = store.get(COOKIE)?.value
    if (!token) return null
    const payload = await verifySessionToken(token)
    return payload?.email ?? null
  } catch {
    return null
  }
}

export async function requireActor() {
  const actor = await getActor()
  if (!actor) throw new Error('Not authenticated')
  return actor
}

export { COOKIE }
