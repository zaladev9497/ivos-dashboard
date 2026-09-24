import TimelineEntry from './TimelineEntry'

// ─── Build a unified event list ────────────────────────────────────────────────

function buildTimeline({ lead, journeys, messages, scheduledMessages, journeyEvents, leadEvents, exceptions, ghEvents, ghPromotion, ncOrders }) {
  const items = []

  // Lead events
  for (const e of leadEvents) {
    items.push({
      id: `le-${e.id}`,
      ts: e.occurred_at,
      type: 'lead_event',
      icon: '◆',
      iconColor: 'text-slate-500',
      title: e.event_type,
      detail: e.actor ? `Actor: ${e.actor}` : null,
      payload: e.payload,
      source: 'lead',
      upcoming: false,
    })
  }

  // Journey events
  for (const e of journeyEvents) {
    items.push({
      id: `je-${e.id}`,
      ts: e.occurred_at,
      type: 'journey_event',
      icon: '▶',
      iconColor: 'text-blue-500',
      title: e.event_type,
      detail: e.source ? `Source: ${e.source}` : null,
      payload: e.payload,
      source: 'journey',
      upcoming: false,
    })
  }

  // Messages sent / received
  for (const m of messages) {
    const isInbound = m.direction === 'inbound'
    items.push({
      id: `msg-${m.id}`,
      ts: m.sent_at,
      type: 'message',
      icon: isInbound ? '←' : '→',
      iconColor: isInbound ? 'text-violet-500' : 'text-sky-500',
      title: `${isInbound ? 'Received' : 'Sent'} SMS${m.is_test ? ' (test)' : ''}`,
      body: m.body,
      detail: [
        m.delivery_status && `Status: ${m.delivery_status}`,
        m.purpose && `Purpose: ${m.purpose}`,
        m.error_message && `Error: ${m.error_message}`,
      ].filter(Boolean).join(' · '),
      status: m.is_test ? 'test' : (m.delivery_status ?? m.direction),
      source: m.provider ?? 'sms',
      upcoming: false,
    })
  }

  // Scheduled messages — upcoming (pending/claimed)
  const upcomingStates = new Set(['pending', 'claimed'])
  for (const m of scheduledMessages) {
    if (upcomingStates.has(m.state)) {
      items.push({
        id: `sched-${m.id}`,
        ts: m.scheduled_for,
        type: 'scheduled_upcoming',
        icon: '◷',
        iconColor: 'text-blue-400',
        title: `Scheduled: ${m.template_key}`,
        detail: `Channel: ${m.channel} · State: ${m.state}`,
        status: m.state,
        source: 'scheduler',
        upcoming: true,
      })
    }
  }

  // Scheduled messages — past / suppressed / failed
  for (const m of scheduledMessages) {
    if (!upcomingStates.has(m.state)) {
      items.push({
        id: `sched-${m.id}`,
        ts: m.last_attempt_at ?? m.scheduled_for,
        type: 'scheduled_past',
        icon: m.state === 'failed' ? '✕' : m.state === 'sent' ? '✓' : '–',
        iconColor:
          m.state === 'failed' ? 'text-red-500'
          : m.state === 'sent' ? 'text-green-500'
          : 'text-slate-400',
        title: `${m.template_key} (${m.state})`,
        detail: [
          m.channel && `Channel: ${m.channel}`,
          m.suppression_reason && `Suppressed: ${m.suppression_reason}`,
          m.error_message && `Error: ${m.error_message}`,
          m.attempts > 0 && `Attempts: ${m.attempts}`,
        ].filter(Boolean).join(' · '),
        status: m.state,
        source: 'scheduler',
        upcoming: false,
      })
    }
  }

  // Exceptions
  for (const e of exceptions) {
    items.push({
      id: `exc-${e.id}`,
      ts: e.first_seen_at,
      type: 'exception',
      icon: '!',
      iconColor: e.severity === 'high' ? 'text-red-600' : e.severity === 'medium' ? 'text-amber-600' : 'text-blue-600',
      title: `Exception: ${e.exception_type}`,
      detail: e.summary,
      status: e.severity,
      source: 'ops',
      upcoming: false,
    })
  }

  // GlassHouse events
  for (const e of ghEvents) {
    items.push({
      id: `gh-${e.id}`,
      ts: e.occurred_at,
      type: 'glasshouse',
      icon: '◉',
      iconColor: 'text-emerald-500',
      title: `GlassHouse: ${e.event_type ?? 'event'}`,
      ghConversation: e.payload?.conversation,
      payload: e.payload,
      source: 'glasshouse',
      upcoming: false,
    })
  }

  // GlassHouse promotion
  if (ghPromotion) {
    items.push({
      id: `ghp-${ghPromotion.id}`,
      ts: ghPromotion.created_at,
      type: 'glasshouse_promotion',
      icon: '◉',
      iconColor: 'text-emerald-600',
      title: `GlassHouse promotion — ${ghPromotion.status}`,
      detail: `Jobber request: ${ghPromotion.jobber_request_id ?? '—'}`,
      status: ghPromotion.status,
      source: 'glasshouse',
      upcoming: false,
    })
  }

  // NC orders
  for (const o of ncOrders) {
    items.push({
      id: `nco-${o.id}`,
      ts: o.first_seen_at,
      type: 'nc_order',
      icon: '▣',
      iconColor: 'text-indigo-500',
      title: `Order placed: ${o.order_type}`,
      detail: `#${o.order_number} · ${o.supplier}`,
      source: 'nc',
      upcoming: false,
    })
  }

  return items
}

// ─── Main Timeline component ───────────────────────────────────────────────────

export default function Timeline(props) {
  const items = buildTimeline(props)

  const upcoming = items.filter((i) => i.upcoming).sort((a, b) => new Date(a.ts) - new Date(b.ts))
  const past = items.filter((i) => !i.upcoming).sort((a, b) => new Date(b.ts) - new Date(a.ts))

  return (
    <div className="space-y-6">
      {/* Upcoming scheduled messages */}
      {upcoming.length > 0 && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 shadow-sm overflow-hidden">
          <div className="border-b border-blue-100 px-4 py-2.5 text-xs font-semibold text-blue-700 uppercase tracking-wide">
            Upcoming ({upcoming.length})
          </div>
          <div className="px-4 py-3 divide-y divide-blue-100">
            {upcoming.map((item) => (
              <TimelineEntry key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Main timeline */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Timeline{past.length > 0 ? ` (${past.length})` : ''}
        </div>
        <div className="px-4 py-3 relative">
          {/* Vertical line */}
          <div className="absolute left-[28px] top-3 bottom-3 w-px bg-slate-100" />

          {past.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No activity yet.</p>
          ) : (
            past.map((item) => <TimelineEntry key={item.id} item={item} />)
          )}
        </div>
      </div>
    </div>
  )
}
