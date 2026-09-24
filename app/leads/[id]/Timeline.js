import TimelineEntry from './TimelineEntry'
import { formatDayHeading } from '@/lib/utils'

// ─── Human labels ──────────────────────────────────────────────────────────────

const EVENT_LABELS = {
  lead_ingested:           'Lead received from Jobber',
  brief_written:           'Sales brief written to Jobber',
  note_written:            'Sales brief written to Jobber',
  service_request_received:'Service request assessed',
  journey_started:         'Follow-up journey started',
  journey_held:            'Follow-up held',
  task_created:            'Task created in Jobber',
  quote_sent:              'Quote sent',
  quote_approved:          'Quote approved',
  assessment_booked:       'Assessment booked',
  assessment_completed:    'Assessment completed',
  nc_order_recorded:       'Order number recorded',
  quote_revised:           'Quote revised',
}

function humanEventLabel(key) {
  return EVENT_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function humanizeTemplateKey(key) {
  if (!key) return 'Scheduled message'
  const journeyPrefixes = new Set(['retrofit', 'new_construction', 'service', 'post_sale'])
  const parts = key.split('.')
  const relevant = journeyPrefixes.has(parts[0]) ? parts.slice(1) : parts
  return relevant
    .map(p => p
      .replace(/_/g, ' ')
      .replace(/([a-zA-Z])(\d+)/, '$1 $2')
      .replace(/\b\w/g, c => c.toUpperCase())
    )
    .join(', ')
}

// ─── Type rank (higher = shown earlier when timestamps tie) ────────────────────

function typeRank(item) {
  if (item.type === 'exception') return 60
  if (item.type === 'nc_order') return 50
  if (item.type === 'glasshouse_promotion') return 48
  if (item.type === 'glasshouse') return 45
  if (item.type === 'message' || item.type === 'scheduled_past') return 30
  if (item.type === 'journey_event') {
    if (item.rawKey === 'task_created') return 28
    if (item.rawKey === 'journey_started' || item.rawKey === 'journey_held') return 22
    if (item.rawKey === 'brief_written' || item.rawKey === 'note_written') return 15
    if (item.rawKey === 'lead_ingested') return 8
    return 20
  }
  if (item.type === 'lead_event') {
    if (item.rawKey === 'brief_written' || item.rawKey === 'note_written') return 14
    if (item.rawKey === 'lead_ingested') return 7
    return 12
  }
  return 15
}

function sortDesc(items) {
  return [...items].sort((a, b) => {
    const tsDiff = new Date(b.ts).getTime() - new Date(a.ts).getTime()
    if (tsDiff !== 0) return tsDiff
    return typeRank(b) - typeRank(a)
  })
}

function sortAsc(items) {
  return [...items].sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
}

// ─── Group sorted-DESC items by calendar day ───────────────────────────────────

function groupByDay(items) {
  const groups = []
  let currentKey = null
  for (const item of items) {
    const key = formatDayHeading(item.ts)
    if (key !== currentKey) {
      currentKey = key
      groups.push({ key, items: [] })
    }
    groups[groups.length - 1].items.push(item)
  }
  return groups
}

// ─── Build the unified, deduped event list ────────────────────────────────────

function buildTimeline({
  messages, scheduledMessages, journeyEvents, leadEvents,
  exceptions, ghEvents, ghPromotion, ncOrders, templateLabels = {},
}) {
  const items = []

  // ── Dedup 1: sent scheduled_messages ↔ messages ──────────────────────────────
  // Index messages by id for fast lookup
  const messageById = new Map(messages.map(m => [m.id, m]))

  // For each sent scheduled message, claim its messages row by message_id
  const claimedMsgIds = new Set()
  for (const sm of scheduledMessages) {
    if (sm.state === 'sent' && sm.message_id && messageById.has(sm.message_id)) {
      claimedMsgIds.add(sm.message_id)
      sm._mergedMsg = messageById.get(sm.message_id)
    }
  }

  // Fuzzy fallback: outbound messages within 90s of last_attempt_at, unclaimed
  const outboundUnclaimed = messages.filter(
    m => m.direction === 'outbound' && !claimedMsgIds.has(m.id)
  )
  for (const sm of scheduledMessages) {
    if (sm.state === 'sent' && !sm.message_id) {
      const smTs = new Date(sm.last_attempt_at ?? sm.scheduled_for).getTime()
      const match = outboundUnclaimed.find(
        m => !claimedMsgIds.has(m.id) && Math.abs(new Date(m.sent_at).getTime() - smTs) < 90_000
      )
      if (match) {
        claimedMsgIds.add(match.id)
        sm._mergedMsg = match
      }
    }
  }

  // ── Dedup 2: lead_events that mirror journey_events ───────────────────────────
  const journeyEventBuckets = new Set(
    journeyEvents.map(e => `${e.event_type}:${Math.floor(new Date(e.occurred_at).getTime() / 10_000)}`)
  )

  // ── Add journey events ─────────────────────────────────────────────────────────
  for (const e of journeyEvents) {
    let icon = '◆', iconColor = 'text-blue-500'
    if (e.event_type === 'journey_held') { icon = '⏸'; iconColor = 'text-amber-500' }
    if (e.event_type === 'journey_started') { icon = '▶'; iconColor = 'text-blue-500' }
    if (e.event_type === 'lead_ingested') { icon = '●'; iconColor = 'text-slate-400' }
    if (e.event_type === 'brief_written' || e.event_type === 'note_written') { icon = '✍'; iconColor = 'text-slate-500' }
    if (e.event_type === 'task_created') { icon = '☑'; iconColor = 'text-indigo-500' }

    const p = e.payload ?? {}
    let summary = null
    if (e.event_type === 'journey_held') summary = p.reason ?? p.block_reason ?? null
    if (e.event_type === 'task_created') summary = p.assigned_to ? `Assigned to: ${p.assigned_to}` : null
    if (e.event_type === 'brief_written' || e.event_type === 'note_written') {
      const errs = [...(p.graphql_errors ?? []), ...(p.user_errors ?? [])].map(err => err?.message).filter(Boolean)
      summary = errs.length ? `Failed: ${errs[0]}` : 'Note saved to Jobber'
    }
    if (e.event_type === 'service_request_received') summary = p.service_type ?? null
    if (e.event_type === 'quote_sent') summary = p.quote_number ? `Quote #${p.quote_number}` : null

    items.push({
      id: `je-${e.id}`, ts: e.occurred_at, upcoming: false,
      type: 'journey_event', rawKey: e.event_type,
      icon, iconColor,
      title: humanEventLabel(e.event_type),
      summary,
      payload: e.payload,
    })
  }

  // ── Add lead events (skip duplicates of journey events) ───────────────────────
  for (const e of leadEvents) {
    const bucket = Math.floor(new Date(e.occurred_at).getTime() / 10_000)
    if (journeyEventBuckets.has(`${e.event_type}:${bucket}`)) continue

    items.push({
      id: `le-${e.id}`, ts: e.occurred_at, upcoming: false,
      type: 'lead_event', rawKey: e.event_type,
      icon: '◆', iconColor: 'text-slate-400',
      title: humanEventLabel(e.event_type),
      summary: e.payload?.reason ?? null,
      payload: e.payload,
    })
  }

  // ── Add standalone messages (not claimed by a scheduled message) ──────────────
  for (const m of messages) {
    if (claimedMsgIds.has(m.id)) continue

    const isInbound = m.direction === 'inbound'
    const isRedirected = m.is_test || !!(m.error_message?.startsWith('REDIRECTED'))
    const isFailed = m.delivery_status === 'failed'
    const body = m.body ?? ''

    let summary
    if (isRedirected) summary = 'Redirected to test number — customer did not receive this'
    else if (isFailed) summary = m.error_message ?? 'Delivery failed'
    else summary = body ? body.slice(0, 80) + (body.length > 80 ? '…' : '') : null

    items.push({
      id: `msg-${m.id}`, ts: m.sent_at, upcoming: false,
      type: 'message', rawKey: m.purpose ?? m.direction,
      icon: isInbound ? '←' : '→',
      iconColor: isInbound ? 'text-violet-500' : isFailed ? 'text-red-400' : 'text-sky-500',
      title: isInbound ? 'Customer replied' : 'SMS sent',
      summary,
      body: isInbound || (!isRedirected && !isFailed) ? body : null,
      status: isRedirected ? 'redirected' : isFailed ? 'failed' : (m.delivery_status ?? undefined),
      redirected: isRedirected,
      payload: null,
    })
  }

  // ── Add scheduled messages ────────────────────────────────────────────────────
  const upcomingStates = new Set(['pending', 'claimed'])

  for (const sm of scheduledMessages) {
    const tpl = templateLabels[sm.template_key]
    const title = tpl?.task_title || humanizeTemplateKey(sm.template_key)
    const mergedMsg = sm._mergedMsg
    const body = mergedMsg?.body ?? ''

    if (upcomingStates.has(sm.state)) {
      const isDemo = sm.context?.demo === true
      const productionDue = sm.context?.production_due ?? null
      items.push({
        id: `sched-${sm.id}`, ts: sm.scheduled_for, upcoming: true,
        type: 'scheduled_upcoming', rawKey: sm.template_key,
        icon: '◷', iconColor: isDemo ? 'text-violet-400' : 'text-blue-400',
        title,
        summary: sm.channel === 'sms' ? 'Scheduled SMS' : `Scheduled ${sm.channel}`,
        status: sm.state,
        demoMode: isDemo,
        productionDue,
      })
      continue
    }

    const isSent = sm.state === 'sent'
    const isFailed = sm.state === 'failed'
    const isSuppressed = sm.state === 'suppressed' || (!isSent && !isFailed && !upcomingStates.has(sm.state) && !!sm.suppression_reason)
    const isCancelled = sm.state === 'cancelled'
    const isRedirected = mergedMsg && (mergedMsg.is_test || !!(mergedMsg.error_message?.startsWith('REDIRECTED')))

    let icon = '–', iconColor = 'text-slate-400'
    if (isSent && !isRedirected) { icon = '✓'; iconColor = 'text-green-500' }
    if (isSent && isRedirected) { icon = '→'; iconColor = 'text-amber-500' }
    if (isFailed) { icon = '✕'; iconColor = 'text-red-500' }

    let entryTitle = title
    if (isSuppressed) entryTitle = `Suppressed: ${title}`
    else if (isCancelled) entryTitle = `Cancelled: ${title}`

    let summary = null
    if (sm.suppression_reason) summary = sm.suppression_reason
    else if (isRedirected) summary = 'Redirected to test number — customer did not receive this'
    else if (isFailed) summary = sm.error_message ?? 'Delivery failed'
    else if (isSent && body) summary = body.slice(0, 80) + (body.length > 80 ? '…' : '')

    items.push({
      id: `sched-${sm.id}`,
      ts: sm.last_attempt_at ?? sm.scheduled_for,
      upcoming: false,
      type: 'scheduled_past', rawKey: sm.template_key,
      icon, iconColor,
      title: entryTitle,
      summary,
      body: isSent && !isRedirected ? body : null,
      status: isRedirected ? 'redirected' : sm.state,
      redirected: !!isRedirected,
      payload: null,
    })
  }

  // ── Exceptions ────────────────────────────────────────────────────────────────
  for (const e of exceptions) {
    items.push({
      id: `exc-${e.id}`, ts: e.first_seen_at, upcoming: false,
      type: 'exception', rawKey: e.exception_type,
      icon: '!',
      iconColor: e.severity === 'high' ? 'text-red-600' : e.severity === 'medium' ? 'text-amber-600' : 'text-blue-600',
      title: `Exception: ${e.exception_type.replace(/_/g, ' ')}`,
      summary: e.summary,
      status: e.severity,
      payload: null,
    })
  }

  // ── GlassHouse events ─────────────────────────────────────────────────────────
  for (const e of ghEvents) {
    const conv = e.payload?.conversation ?? []
    const lastMsg = conv[conv.length - 1]
    items.push({
      id: `gh-${e.id}`, ts: e.occurred_at, upcoming: false,
      type: 'glasshouse', rawKey: e.event_type ?? 'glasshouse',
      icon: '◉', iconColor: 'text-emerald-500',
      title: `GlassHouse: ${(e.event_type ?? 'event').replace(/_/g, ' ')}`,
      summary: lastMsg?.displayContent ? lastMsg.displayContent.slice(0, 80) : null,
      ghConversation: conv,
      payload: e.payload,
    })
  }

  if (ghPromotion) {
    items.push({
      id: `ghp-${ghPromotion.id}`, ts: ghPromotion.created_at, upcoming: false,
      type: 'glasshouse_promotion', rawKey: 'glasshouse_promotion',
      icon: '◉', iconColor: 'text-emerald-600',
      title: `GlassHouse promotion`,
      summary: `Status: ${ghPromotion.status} · Jobber request: ${ghPromotion.jobber_request_id ?? '—'}`,
      status: ghPromotion.status,
      payload: null,
    })
  }

  // ── NC orders ─────────────────────────────────────────────────────────────────
  for (const o of ncOrders) {
    items.push({
      id: `nco-${o.id}`, ts: o.first_seen_at, upcoming: false,
      type: 'nc_order', rawKey: 'nc_order',
      icon: '▣', iconColor: 'text-indigo-500',
      title: `Order placed: ${o.order_type}`,
      summary: `#${o.order_number} · ${o.supplier}`,
    })
  }

  return items
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Timeline(props) {
  const all = buildTimeline(props)
  const upcoming = sortAsc(all.filter(i => i.upcoming))
  const past = sortDesc(all.filter(i => !i.upcoming))
  const dayGroups = groupByDay(past)

  return (
    <div className="space-y-6">
      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 shadow-sm overflow-hidden">
          <div className="border-b border-blue-100 px-4 py-2.5 text-xs font-semibold text-blue-700 uppercase tracking-wide">
            Upcoming ({upcoming.length})
          </div>
          <div className="px-4 py-2 divide-y divide-blue-100">
            {upcoming.map(item => (
              <TimelineEntry key={item.id} item={item} showDate />
            ))}
          </div>
        </div>
      )}

      {/* Past timeline grouped by day */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Timeline{past.length > 0 ? ` (${past.length})` : ''}
        </div>
        {past.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No activity yet.</p>
        ) : (
          dayGroups.map(({ key, items: dayItems }) => (
            <div key={key}>
              <div className="bg-slate-50 border-y border-slate-100 px-4 py-1.5">
                <span className="text-xs font-semibold text-slate-400">{key}</span>
              </div>
              <div className="px-4 py-2 relative">
                <div className="absolute left-7 top-0 bottom-0 w-px bg-slate-100" />
                {dayItems.map(item => (
                  <TimelineEntry key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
