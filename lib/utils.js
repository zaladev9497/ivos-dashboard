const TZ = 'America/Chicago'

export function formatDate(iso, opts = {}) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
    ...opts,
  }).format(new Date(iso))
}

export function formatDateShort(iso) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso))
}

export function relativeTime(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const abs = Math.abs(diff)
  const future = diff < 0
  const prefix = future ? 'in ' : ''
  const suffix = future ? '' : ' ago'

  if (abs < 60_000) return 'just now'
  if (abs < 3_600_000) return `${prefix}${Math.round(abs / 60_000)}m${suffix}`
  if (abs < 86_400_000) return `${prefix}${Math.round(abs / 3_600_000)}h${suffix}`
  if (abs < 7 * 86_400_000) return `${prefix}${Math.round(abs / 86_400_000)}d${suffix}`
  return formatDateShort(iso)
}

export function formatTime(iso) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function formatDayFull(iso) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, weekday: 'long', month: 'long', day: 'numeric',
  }).format(new Date(iso))
}

export function formatDayHeading(iso) {
  if (!iso) return 'Unknown date'
  const fmt = (d, opts) => new Intl.DateTimeFormat('en-US', { timeZone: TZ, ...opts }).format(d)
  const d = new Date(iso)
  const now = new Date()
  const dayOf = (dt) => fmt(dt, { year: 'numeric', month: '2-digit', day: '2-digit' })
  if (dayOf(d) === dayOf(now)) return 'Today'
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
  if (dayOf(d) === dayOf(yesterday)) return 'Yesterday'
  return fmt(d, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

export function ageInDays(iso) {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

// State / status colour mappings (Tailwind classes)
export const STATUS_COLORS = {
  sent: 'text-green-700 bg-green-50 ring-green-200',
  delivered: 'text-green-700 bg-green-50 ring-green-200',
  pending: 'text-blue-700 bg-blue-50 ring-blue-200',
  claimed: 'text-blue-700 bg-blue-50 ring-blue-200',
  suppressed: 'text-slate-600 bg-slate-100 ring-slate-200',
  cancelled: 'text-slate-600 bg-slate-100 ring-slate-200',
  skipped: 'text-slate-600 bg-slate-100 ring-slate-200',
  failed: 'text-red-700 bg-red-50 ring-red-200',
  test: 'text-amber-700 bg-amber-50 ring-amber-200',
  redirected: 'text-amber-700 bg-amber-50 ring-amber-200',
  open: 'text-red-700 bg-red-50 ring-red-200',
  acknowledged: 'text-amber-700 bg-amber-50 ring-amber-200',
  resolved: 'text-green-700 bg-green-50 ring-green-200',
  high: 'text-red-700 bg-red-50 ring-red-200',
  medium: 'text-amber-700 bg-amber-50 ring-amber-200',
  low: 'text-blue-700 bg-blue-50 ring-blue-200',
  inbound: 'text-violet-700 bg-violet-50 ring-violet-200',
  outbound: 'text-sky-700 bg-sky-50 ring-sky-200',
}

export function statusClass(status) {
  return (
    STATUS_COLORS[status?.toLowerCase()] ??
    'text-slate-600 bg-slate-100 ring-slate-200'
  )
}

export function badge(label, status) {
  // Returns props only — rendered by Badge component
  return { label: label ?? status, status }
}

export function journeyTypeLabel(jt) {
  const map = {
    retrofit: 'Retrofit',
    new_construction: 'New Construction',
    service: 'Service',
  }
  return map[jt] ?? jt ?? '—'
}

// ─── Template names ───────────────────────────────────────────────────────────
// Template keys look like "retrofit.quote.day15_action". Turn them into readable names:
// "Quote — Day 15 action". The raw key stays available as a secondary label where useful.
const KEY_PREFIXES = new Set(['retrofit', 'nc', 'new_construction', 'service', 'post_sale', 'concierge', 'task'])
const ACRONYMS = { pm: 'PM', nc: 'NC', sms: 'SMS', id: 'ID', url: 'URL', uchannel: 'U-channel' }

function labelWord(w) {
  const lower = w.toLowerCase()
  if (ACRONYMS[lower]) return ACRONYMS[lower]
  const dayLike = lower.match(/^(day|month|week)(\d+)$/)
  if (dayLike) return `${dayLike[1][0].toUpperCase()}${dayLike[1].slice(1)} ${dayLike[2]}`
  if (/^\d+[a-z]+$/.test(lower)) return lower // 24h, 48h, 30day
  return lower
}

export function templateLabel(key) {
  if (!key) return '—'
  const parts = key.split('.')
  const relevant = KEY_PREFIXES.has(parts[0]) && parts.length > 1 ? parts.slice(1) : parts
  const segments = relevant.map((seg) => {
    const words = seg
      .replace(/^tp\d+[a-z]?_/i, '') // post-sale step codes (tp07_, tp08c_) are internal
      .split('_')
      .filter(Boolean)
      .map(labelWord)
    return words.join(' ')
  })
  const text = segments.filter(Boolean).join(' — ')
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : key
}

// "{{first_name}}" -> "[First name]" so previews read as text, not code.
export function friendlyBody(body) {
  if (!body) return ''
  return body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, name) => {
    const words = name.split('_').map(labelWord).join(' ')
    return `[${words.charAt(0).toUpperCase()}${words.slice(1)}]`
  })
}

// Report "detail" can be text or a JSON object like { total_open: 12, stale_count: 3 }.
// Objects are shown as "Total open 12 · Stale count 3" instead of crashing the page.
export function formatDetail(detail) {
  if (detail === null || detail === undefined || detail === '') return ''
  if (typeof detail === 'string') return detail
  if (typeof detail !== 'object') return String(detail)
  if (Array.isArray(detail)) return detail.map(formatDetail).filter(Boolean).join(', ')
  return Object.entries(detail)
    .map(([key, value]) => {
      const label = key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
      const shown = value !== null && typeof value === 'object' ? JSON.stringify(value) : String(value)
      return `${label} ${shown}`
    })
    .join(' · ')
}
