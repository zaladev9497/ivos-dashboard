// GSM-7 basic character set
const GSM7 = new Set(
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1bÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?' +
  '¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'
)
// These are in GSM-7 but occupy 2 units (escape + char)
const GSM7_EXT = new Set(['^', '{', '}', '\\', '[', '~', ']', '|', '€'])

export function smsInfo(text) {
  if (!text) return { encoding: 'GSM-7', length: 0, segments: 0, charsPerSegment: 160, remaining: 160 }

  let isGsm7 = true
  let gsm7Length = 0

  for (const ch of text) {
    if (GSM7_EXT.has(ch)) {
      gsm7Length += 2
    } else if (GSM7.has(ch)) {
      gsm7Length += 1
    } else {
      isGsm7 = false
      break
    }
  }

  if (!isGsm7) {
    const len = [...text].length
    const single = 70
    const multi = 67
    const segments = len <= single ? 1 : Math.ceil(len / multi)
    const charsPerSegment = segments === 1 ? single : multi
    const capacity = segments === 1 ? single : segments * multi
    return { encoding: 'UCS-2', length: len, segments, charsPerSegment, remaining: capacity - len }
  }

  const single = 160
  const multi = 153
  const segments = gsm7Length <= single ? 1 : Math.ceil(gsm7Length / multi)
  const charsPerSegment = segments === 1 ? single : multi
  const capacity = segments === 1 ? single : segments * multi
  return { encoding: 'GSM-7', length: gsm7Length, segments, charsPerSegment, remaining: capacity - gsm7Length }
}

// Returns an array of warning strings (empty = clean)
export function typographicWarnings(text) {
  const w = []
  if (/[‘’]/.test(text)) w.push("Typographic apostrophe/quote (‘’) — replace with straight apostrophe (') to avoid UCS-2 encoding, which doubles the cost per SMS.")
  if (/—/.test(text)) w.push('Em dash (—) — replace with a hyphen (-) to stay in GSM-7.')
  if (/–/.test(text)) w.push('En dash (–) — replace with a hyphen (-) to stay in GSM-7.')
  if (/[“”]/.test(text)) w.push('Typographic double quotes (“”) — replace with straight quotes (") to stay in GSM-7.')
  return w
}

const ALLOWED_MERGE_FIELDS = new Set([
  'first_name','full_name','city','company_name','consultant_name',
  'appointment_day_date','appointment_time','arrival_window','address',
  'project_reference','quote_link','quote_number','quote_expiry_date','quote_age_days',
])

export function validateMergeFields(text) {
  const found = [...(text ?? '').matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1])
  const invalid = found.filter(f => !ALLOWED_MERGE_FIELDS.has(f))
  return { found, invalid }
}

// Preview substitution values
const PREVIEW = {
  first_name: 'Katherine',
  full_name: 'Katherine Smith',
  city: 'Bedford',
  company_name: 'Texas Shade',
  consultant_name: 'Lance',
  appointment_day_date: 'October 23',
  appointment_time: '2:00 PM',
  arrival_window: '2:00 PM – 4:00 PM',
  address: '304 Mountain View Ct, Bedford TX',
  project_reference: 'REQ-2026-001',
  // Exactly 96 characters:
  quote_link: 'https://clienthub.getjobber.com/client_hubs/AbCdEfGhIjKlMnOp/login?source=share_money_link_v2ab',
  quote_number: 'Q-1234',
  quote_expiry_date: 'November 5',
  quote_age_days: '3',
}

export function applyPreview(body) {
  return (body ?? '').replace(/\{\{(\w+)\}\}/g, (match, key) => PREVIEW[key] ?? match)
}
