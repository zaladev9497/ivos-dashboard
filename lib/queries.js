import { createServerClient } from './supabase'

const PAGE_SIZE = 50

// ─── Leads ────────────────────────────────────────────────────────────────────

export async function getLeads({
  page = 1,
  search = '',
  journeyType = '',
  stage = '',
  showTest = false,
  hasException = false,
  dateFrom = '',
  dateTo = '',
} = {}) {
  const sb = createServerClient()
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let q = sb
    .from('leads')
    .select(
      `id, full_name, first_name, last_name, email, phone, journey_type,
       request_status, is_test_record, ingested_at, created_at, is_archived,
       external_web_uri, needs_manual_routing,
       journeys(id, journey_type, state, current_stage, updated_at),
       operations_exceptions(id, severity, state)`,
      { count: 'exact' }
    )
    .order('ingested_at', { ascending: false })
    .range(from, to)

  if (!showTest) q = q.eq('is_test_record', false)
  if (journeyType) q = q.eq('journey_type', journeyType)
  if (hasException) q = q.not('operations_exceptions', 'is', null)
  if (dateFrom) q = q.gte('ingested_at', dateFrom)
  if (dateTo) q = q.lte('ingested_at', dateTo)

  if (search) {
    const s = `%${search}%`
    q = q.or(`full_name.ilike.${s},email.ilike.${s},phone.ilike.${s}`)
  }

  const { data, error, count } = await q
  if (error) throw error
  return { leads: data ?? [], total: count ?? 0, pageSize: PAGE_SIZE }
}

export async function getLead(id) {
  const sb = createServerClient()
  const { data, error } = await sb
    .from('leads')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

// ─── Lead detail: all related records ─────────────────────────────────────────

export async function getLeadJourneys(leadId) {
  const sb = createServerClient()
  const { data, error } = await sb
    .from('journeys')
    .select('*')
    .eq('lead_id', leadId)
    .order('started_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getLeadMessages(leadId) {
  const sb = createServerClient()
  const { data, error } = await sb
    .from('messages')
    .select('*')
    .eq('lead_id', leadId)
    .order('sent_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getLeadScheduledMessages(leadId) {
  const sb = createServerClient()
  const { data, error } = await sb
    .from('scheduled_messages')
    .select('*')
    .eq('lead_id', leadId)
    .order('scheduled_for', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getLeadJourneyEvents(leadId) {
  const sb = createServerClient()
  const { data, error } = await sb
    .from('journey_events')
    .select('*')
    .eq('lead_id', leadId)
    .order('occurred_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getLeadEvents(leadId) {
  const sb = createServerClient()
  const { data, error } = await sb
    .from('lead_events')
    .select('*')
    .eq('lead_id', leadId)
    .order('occurred_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getLeadExceptions(leadId) {
  const sb = createServerClient()
  const { data, error } = await sb
    .from('operations_exceptions')
    .select('*')
    .eq('lead_id', leadId)
    .order('first_seen_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getLeadConversation(leadId) {
  const sb = createServerClient()
  const { data, error } = await sb
    .from('conversations')
    .select('*')
    .eq('lead_id', leadId)
    .order('last_outbound_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getLeadGlasshouseEvents(leadId) {
  const sb = createServerClient()
  const { data, error } = await sb
    .from('glasshouse_events')
    .select('*')
    .eq('lead_id', leadId)
    .order('occurred_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getLeadGlasshousePromotion(leadId) {
  const sb = createServerClient()
  const { data, error } = await sb
    .from('glasshouse_promotions')
    .select('*')
    .eq('lead_id', leadId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getLeadNcOrders(leadId) {
  const sb = createServerClient()
  const { data, error } = await sb
    .from('nc_orders')
    .select('*')
    .eq('lead_id', leadId)
    .order('first_seen_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

export async function getPipeline() {
  const sb = createServerClient()
  const { data, error } = await sb
    .from('journeys')
    .select(
      `id, journey_type, state, current_stage, started_at, updated_at,
       leads!inner(id, full_name, is_test_record, is_archived)`
    )
    .eq('leads.is_test_record', false)
    .eq('leads.is_archived', false)
    .neq('state', 'completed')
    .neq('state', 'cancelled')
  if (error) throw error
  return data ?? []
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function getMessages({
  page = 1,
  direction = '',
  deliveryStatus = '',
  purpose = '',
  showTest = false,
} = {}) {
  const sb = createServerClient()
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let q = sb
    .from('messages')
    .select(
      `id, lead_id, direction, body, purpose, provider, delivery_status,
       error_message, is_test, sent_at,
       leads(full_name)`,
      { count: 'exact' }
    )
    .order('sent_at', { ascending: false })
    .range(from, to)

  if (!showTest) q = q.eq('is_test', false)
  if (direction) q = q.eq('direction', direction)
  if (deliveryStatus) q = q.eq('delivery_status', deliveryStatus)
  if (purpose) q = q.eq('purpose', purpose)

  const { data, error, count } = await q
  if (error) throw error
  return { messages: data ?? [], total: count ?? 0, pageSize: PAGE_SIZE }
}

export async function getScheduledMessages({
  page = 1,
  state = '',
  channel = '',
  showTest = false,
} = {}) {
  const sb = createServerClient()
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let q = sb
    .from('scheduled_messages')
    .select(
      `id, lead_id, journey_id, template_key, channel, scheduled_for,
       state, suppression_reason, attempts, last_attempt_at, error_message,
       leads(full_name, is_test_record)`,
      { count: 'exact' }
    )
    .order('scheduled_for', { ascending: false })
    .range(from, to)

  if (!showTest) q = q.eq('leads.is_test_record', false)
  if (state) q = q.eq('state', state)
  if (channel) q = q.eq('channel', channel)

  const { data, error, count } = await q
  if (error) throw error
  return { messages: data ?? [], total: count ?? 0, pageSize: PAGE_SIZE }
}

// ─── Operations ───────────────────────────────────────────────────────────────

export async function getOpenExceptions() {
  const sb = createServerClient()
  const { data, error } = await sb
    .from('operations_exceptions')
    .select('*')
    .in('state', ['open', 'acknowledged'])
    .order('severity', { ascending: false })
    .order('last_seen_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getFailedScheduledMessages() {
  const sb = createServerClient()
  const { data, error } = await sb
    .from('scheduled_messages')
    .select(
      `id, lead_id, template_key, channel, scheduled_for, state,
       error_message, attempts, last_attempt_at,
       leads(full_name)`
    )
    .in('state', ['failed'])
    .order('last_attempt_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return data ?? []
}

export async function getDailyReports({ page = 1 } = {}) {
  const sb = createServerClient()
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  const { data, error, count } = await sb
    .from('daily_reports')
    .select('*', { count: 'exact' })
    .order('report_date', { ascending: false })
    .range(from, to)
  if (error) throw error
  return { reports: data ?? [], total: count ?? 0, pageSize: PAGE_SIZE }
}

export async function getBusinessCalendar() {
  const sb = createServerClient()
  const { data, error } = await sb
    .from('business_calendar')
    .select('*')
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getExceptionStats() {
  const sb = createServerClient()
  const { data, error } = await sb
    .from('operations_exceptions')
    .select('severity, state')
    .in('state', ['open', 'acknowledged'])
  if (error) throw error
  const stats = { low: 0, medium: 0, high: 0 }
  for (const row of data ?? []) {
    stats[row.severity] = (stats[row.severity] ?? 0) + 1
  }
  return stats
}

// ─── Templates ────────────────────────────────────────────────────────────────

export async function getTemplates() {
  const sb = createServerClient()
  const { data, error } = await sb
    .from('message_templates')
    .select('id, template_key, version, channel, body, task_title, is_active, approved, notes')
    .order('template_key')
    .order('version', { ascending: false })
  if (error) throw error
  // Keep only the latest version per key
  const seen = new Set()
  return (data ?? []).filter(t => {
    if (seen.has(t.template_key)) return false
    seen.add(t.template_key)
    return true
  })
}

export async function getTemplate(key) {
  const sb = createServerClient()
  const { data, error } = await sb
    .from('message_templates')
    .select('*')
    .eq('template_key', key)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getTemplateHistory(key) {
  const sb = createServerClient()
  const { data, error } = await sb
    .from('message_templates')
    .select('id, version, channel, body, task_title, is_active, approved, notes')
    .eq('template_key', key)
    .order('version', { ascending: false })
  if (error) throw error
  return data ?? []
}

// ─── Cadence ──────────────────────────────────────────────────────────────────

export async function getCadenceSteps(journeyType) {
  const sb = createServerClient()
  let q = sb
    .from('cadence_steps')
    .select('id, journey_type, trigger_event, track, template_key, channel, offset_value, offset_unit, offset_from, cap_before_expiry_days, enabled, sort_order, notes, updated_at, updated_by')
    .order('trigger_event')
    .order('sort_order', { ascending: true })
  if (journeyType) q = q.eq('journey_type', journeyType)
  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

export async function getActiveJourneyCountByType() {
  const sb = createServerClient()
  const { data, error } = await sb
    .from('journeys')
    .select('journey_type')
    .not('state', 'in', '("completed","cancelled")')
  if (error) return {}
  const counts = {}
  for (const row of data ?? []) {
    counts[row.journey_type] = (counts[row.journey_type] ?? 0) + 1
  }
  return counts
}

// ─── Audit ────────────────────────────────────────────────────────────────────

export async function getAuditLogs({ page = 1, tableName = '', actor = '' } = {}) {
  const sb = createServerClient()
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  try {
    let q = sb
      .from('dashboard_audit')
      .select('*', { count: 'exact' })
      .order('occurred_at', { ascending: false })
      .range(from, to)
    if (tableName) q = q.eq('table_name', tableName)
    if (actor) q = q.eq('actor', actor)
    const { data, error, count } = await q
    if (error) throw error
    return { logs: data ?? [], total: count ?? 0, pageSize: PAGE_SIZE }
  } catch {
    return { logs: [], total: 0, pageSize: PAGE_SIZE, missing: true }
  }
}

export async function getLeadAuditLogs(leadId) {
  const sb = createServerClient()
  try {
    const { data, error } = await sb
      .from('dashboard_audit')
      .select('*')
      .or(`row_id.eq.${leadId},note.ilike.%${leadId}%`)
      .order('occurred_at', { ascending: false })
    if (error) throw error
    return data ?? []
  } catch {
    return []
  }
}
