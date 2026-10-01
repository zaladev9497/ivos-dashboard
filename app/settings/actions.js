'use server'
import { revalidatePath } from 'next/cache'
import { requireActor } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase'
import { logAudit } from '@/lib/audit'

// working_days is stored as integer[] of ISO weekdays: 1 = Monday ... 7 = Sunday.
const ISO_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7]
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/

function validTimezone(tz) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

// Normalises a typed phone number to E.164 (+15550001111). Returns null when it cannot be a valid number.
function toE164(input) {
  const raw = String(input).trim()
  const digits = raw.replace(/\D/g, '')
  if (raw.startsWith('+')) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return null
}

// Only these columns can ever be written from the browser, each with its own check.
// Anything else (company_id, ids, unknown keys) is rejected instead of being passed to the database.
const FIELD_RULES = {
  timezone: (v) => (typeof v === 'string' && validTimezone(v.trim()) ? { value: v.trim() } : { error: 'Timezone must be a valid IANA name, e.g. America/Chicago.' }),
  open_time: (v) => (typeof v === 'string' && TIME_RE.test(v) ? { value: v } : { error: 'Opening time must look like 08:00.' }),
  close_time: (v) => (typeof v === 'string' && TIME_RE.test(v) ? { value: v } : { error: 'Closing time must look like 17:00.' }),
  working_days: (v) => {
    if (!Array.isArray(v) || v.length === 0) return { error: 'Choose at least one working day.' }
    const nums = v.map(Number)
    if (!nums.every((d) => ISO_WEEKDAYS.includes(d))) return { error: 'Working days contain an unknown day.' }
    // Stored ascending (Mon-first) and de-duplicated.
    return { value: ISO_WEEKDAYS.filter((d) => nums.includes(d)) }
  },
  quote_validity_days: (v) => (Number.isInteger(v) && v >= 1 && v <= 365 ? { value: v } : { error: 'Quote validity must be a whole number from 1 to 365 days.' }),
  sms_redirect_to: (v) => {
    if (v === null || v === '') return { value: null }
    const e164 = typeof v === 'string' ? toE164(v) : null
    return e164 ? { value: e164 } : { error: 'SMS redirect must be a valid phone number, e.g. +15550001111.' }
  },
  test_only: (v) => (typeof v === 'boolean' ? { value: v } : { error: 'Test mode must be on or off.' }),
  demo_mode: (v) => (typeof v === 'boolean' ? { value: v } : { error: 'Demo mode must be on or off.' }),
  demo_poll_interval_seconds: (v) => (Number.isInteger(v) && v >= 5 && v <= 300 ? { value: v } : { error: 'Demo poll interval must be a whole number from 5 to 300 seconds.' }),
}

function validate(fields) {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return { error: 'Invalid request.' }
  const clean = {}
  for (const [key, raw] of Object.entries(fields)) {
    const rule = FIELD_RULES[key]
    if (!rule) return { error: `"${key}" cannot be changed here.` }
    const res = rule(raw)
    if (res.error) return { error: res.error }
    clean[key] = res.value
  }
  if (Object.keys(clean).length === 0) return { error: 'Nothing to save.' }
  return { clean }
}

export async function updateBusinessCalendar(fields) {
  const actor = await requireActor()

  const { clean, error: invalid } = validate(fields)
  if (invalid) return { error: invalid }

  const sb = createServerClient()
  const { data: before } = await sb
    .from('business_calendar')
    .select('*')
    .limit(1)
    .maybeSingle()

  if (!before) return { error: 'Business calendar row not found.' }

  // Cross-field check against the values that will be stored.
  const norm = (t) => (t && String(t).length === 5 ? `${t}:00` : t && String(t))
  const open = norm(clean.open_time ?? before.open_time)
  const close = norm(clean.close_time ?? before.close_time)
  if (('open_time' in clean || 'close_time' in clean) && open && close && open >= close) {
    return { error: 'Opening time must be earlier than closing time.' }
  }

  const { error } = await sb
    .from('business_calendar')
    .update({ ...clean, updated_at: new Date().toISOString() })
    .eq('company_id', before.company_id)

  if (error) return { error: error.message }

  const changedKeys = Object.keys(clean).filter(
    (k) => JSON.stringify(before[k]) !== JSON.stringify(clean[k])
  )

  await logAudit({
    actor,
    action: 'settings.update',
    tableName: 'business_calendar',
    rowId: before.company_id,
    before: Object.fromEntries(changedKeys.map((k) => [k, before[k]])),
    after: Object.fromEntries(changedKeys.map((k) => [k, clean[k]])),
    note: changedKeys.map((k) => `${k}: ${JSON.stringify(before[k])} → ${JSON.stringify(clean[k])}`).join('; '),
  })

  revalidatePath('/settings')
  revalidatePath('/', 'layout')
  return { ok: true }
}
