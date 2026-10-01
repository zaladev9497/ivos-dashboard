// Small in-memory sliding-window limiter for the login endpoint.
// Note: state is per server instance. On serverless hosting each instance keeps its own counters,
// which still blunts brute-force attempts; use a shared store (Redis/Upstash) for a hard guarantee.
const buckets = new Map()

export function rateLimit(key, { limit = 5, windowMs = 15 * 60_000 } = {}) {
  const now = Date.now()
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs)
  if (hits.length >= limit) {
    buckets.set(key, hits)
    return { ok: false, retryAfter: Math.ceil((windowMs - (now - hits[0])) / 1000) }
  }
  hits.push(now)
  buckets.set(key, hits)
  // Opportunistic cleanup so the map cannot grow without bound.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k)
  }
  return { ok: true, remaining: limit - hits.length }
}

export function clientIp(request) {
  const fwd = request.headers.get('x-forwarded-for')
  return (fwd ? fwd.split(',')[0].trim() : request.headers.get('x-real-ip')) || 'unknown'
}
