'use client'
import Badge from '@/components/Badge'
import EmptyState from '@/components/EmptyState'
import { formatDayHeading, formatTime, formatDayFull, relativeTime, templateLabel } from '@/lib/utils'

// ─── Build the SMS thread ─────────────────────────────────────────────────────
//
// The timeline answers "what happened to this lead". This answers the narrower
// question an operator actually asks when a customer calls: "what did we send
// them, and what did they say back?" So it carries only SMS — nothing else.

function humanizeTemplateKey(key) {
  return key ? templateLabel(key) : 'Scheduled message'
}

function buildThread({ messages, scheduledMessages, templateLabels = {} }) {
  // Scheduled rows that already went out carry the richer label (template /
  // task title), so they own their messages row and the raw row is dropped.
  const messageById = new Map(messages.map(m => [m.id, m]))
  const claimedMsgIds = new Set()

  for (const sm of scheduledMessages) {
    if (sm.state === 'sent' && sm.message_id && messageById.has(sm.message_id)) {
      claimedMsgIds.add(sm.message_id)
      sm._mergedMsg = messageById.get(sm.message_id)
    }
  }

  // Same 90s fuzzy match the timeline uses for rows written before message_id
  // was backfilled.
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

  const sent = []
  const upcoming = []

  for (const m of messages) {
    if (claimedMsgIds.has(m.id)) continue

    const inbound = m.direction === 'inbound'
    const redirected = m.is_test || !!(m.error_message?.startsWith('REDIRECTED'))
    const failed = m.delivery_status === 'failed'

    sent.push({
      id: `msg-${m.id}`,
      ts: m.sent_at,
      inbound,
      title: inbound ? 'Customer reply' : 'SMS',
      body: m.body ?? '',
      status: redirected ? 'redirected' : failed ? 'failed' : (m.delivery_status ?? 'sent'),
      redirected,
      failed,
      error: failed ? (m.error_message ?? 'Delivery failed') : null,
      channel: 'sms',
    })
  }

  for (const sm of scheduledMessages) {
    if (sm.channel && sm.channel !== 'sms') continue

    const tpl = templateLabels[sm.template_key]
    const title = tpl?.task_title || humanizeTemplateKey(sm.template_key)

    if (sm.state === 'pending' || sm.state === 'claimed') {
      upcoming.push({
        id: `sched-${sm.id}`,
        ts: sm.scheduled_for,
        title,
        status: sm.state,
        demoMode: sm.context?.demo === true,
        productionDue: sm.context?.production_due ?? null,
      })
      continue
    }

    const merged = sm._mergedMsg
    const isSent = sm.state === 'sent'
    const failed = sm.state === 'failed'
    const redirected = !!(merged && (merged.is_test || merged.error_message?.startsWith('REDIRECTED')))

    // Suppressed and cancelled rows never reached the customer; they belong in
    // the timeline's record, not in a thread of what was actually said.
    if (!isSent && !failed) continue

    sent.push({
      id: `sched-${sm.id}`,
      ts: sm.last_attempt_at ?? sm.scheduled_for,
      inbound: false,
      title,
      body: merged?.body ?? '',
      status: redirected ? 'redirected' : sm.state,
      redirected,
      failed,
      error: failed ? (sm.error_message ?? 'Delivery failed') : null,
      channel: 'sms',
    })
  }

  sent.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
  upcoming.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())

  return { sent, upcoming }
}

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

// ─── Bubble ───────────────────────────────────────────────────────────────────

function Bubble({ item }) {
  const { inbound } = item

  // Outbound normally reads as "us" — accent fill. A redirected or failed send
  // is still ours but did not land, so it drops to a tinted outline instead of
  // claiming the confident accent.
  const plain = inbound || item.redirected || item.failed

  const tone = item.failed ? 'neg' : item.redirected ? 'warn' : null

  const bubbleStyle = plain
    ? {
        background: tone ? `var(--tone-${tone}-soft)` : 'var(--paper-sunken)',
        border: `1px solid ${tone ? `var(--tone-${tone}-rule)` : 'var(--rule-faint)'}`,
        color: 'var(--ink-secondary)',
        [inbound ? 'borderBottomLeftRadius' : 'borderBottomRightRadius']: 3,
      }
    : {
        background: 'var(--accent)',
        color: 'var(--on-signal)',
        borderBottomRightRadius: 3,
      }

  return (
    <div className={`flex flex-col ${inbound ? 'items-start' : 'items-end'} gap-1`}>
      {/* Who / which template, above the bubble so the body stays clean. */}
      <div className="flex max-w-[82%] flex-wrap items-center gap-1.5 px-0.5">
        <span className="text-[11.5px] font-semibold" style={{ color: 'var(--ink-muted)' }}>
          {item.title}
        </span>
        {item.status && item.status !== 'sent' && (
          <Badge label={item.status} status={item.status} />
        )}
      </div>

      <div className="max-w-[82%] rounded-[11px] px-3.5 py-2.5 text-[12.5px]" style={bubbleStyle}>
        {item.body ? (
          <p className="leading-relaxed whitespace-pre-wrap wrap-break-word">{item.body}</p>
        ) : (
          <p className="italic leading-relaxed opacity-70">No message body stored.</p>
        )}
      </div>

      {item.error && (
        <p className="max-w-[82%] px-0.5 text-[11.5px]" style={{ color: 'var(--tone-neg-ink)' }}>
          {item.error}
        </p>
      )}
      {item.redirected && !item.error && (
        <p className="max-w-[82%] px-0.5 text-[11.5px]" style={{ color: 'var(--tone-warn-ink)' }}>
          Redirected to test number — the customer did not receive this.
        </p>
      )}

      <time
        dateTime={item.ts}
        className="tabular px-0.5 text-[10.5px]"
        style={{ color: 'var(--ink-faint)' }}
      >
        {formatTime(item.ts)}
      </time>
    </div>
  )
}

// ─── View ─────────────────────────────────────────────────────────────────────

export default function LeadMessages(props) {
  const { sent, upcoming } = buildThread(props)
  const dayGroups = groupByDay(sent)

  return (
    <div className="space-y-4">
      {/* Queued sends, kept above the thread — they are the next thing that
          will happen, not part of what was said. */}
      {upcoming.length > 0 && (
        <section
          className="overflow-hidden rounded-[11px] border"
          style={{ borderColor: 'var(--signal-info-rule)', background: 'var(--signal-info-soft)' }}
        >
          <div
            className="flex items-center justify-between border-b px-5 py-3"
            style={{ borderColor: 'var(--signal-info-rule)' }}
          >
            <span className="eyebrow" style={{ color: 'var(--tone-info-ink)' }}>Queued to send</span>
            <span
              className="counter"
              style={{ background: 'transparent', borderColor: 'var(--signal-info-rule)', color: 'var(--tone-info-ink)' }}
            >
              {upcoming.length}
            </span>
          </div>
          <div className="divide-y px-5" style={{ borderColor: 'var(--signal-info-rule)' }}>
            {upcoming.map(item => (
              <div key={item.id} className="flex items-start justify-between gap-3 py-2.5">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <span className="text-[13px] font-semibold leading-snug" style={{ color: 'var(--ink)' }}>
                    {item.title}
                  </span>
                  <Badge label={item.status} status={item.status} />
                </div>
                <time dateTime={item.ts} className="shrink-0 text-right leading-tight">
                  {item.demoMode ? (
                    <>
                      <span className="block text-[11.5px] font-medium" style={{ color: 'var(--signal-alt)' }}>
                        {relativeTime(item.ts)}
                      </span>
                      {item.productionDue && (
                        <span className="block text-[10px]" style={{ color: 'var(--ink-faint)' }}>
                          Prod: {formatDayFull(item.productionDue)}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="tabular block text-[11.5px]" style={{ color: 'var(--ink-muted)' }}>
                        {formatDayFull(item.ts)}
                      </span>
                      <span className="block text-[10.5px]" style={{ color: 'var(--ink-faint)' }}>
                        {relativeTime(item.ts)}
                      </span>
                    </>
                  )}
                </time>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="surface overflow-hidden">
        <div className="section-head">
          <span className="eyebrow">Conversation</span>
          {sent.length > 0 && <span className="counter">{sent.length}</span>}
        </div>

        {sent.length === 0 ? (
          <EmptyState
            title="No messages yet"
            description="Sent texts and customer replies appear here as the journey runs."
          />
        ) : (
          dayGroups.map(({ key, items }) => (
            <div key={key}>
              <div
                className="sticky top-0 z-10 border-y px-5 py-2 backdrop-blur-sm"
                style={{
                  borderColor: 'var(--rule-faint)',
                  background: 'color-mix(in oklab, var(--paper-sunken) 88%, transparent)',
                }}
              >
                <span className="eyebrow">{key}</span>
              </div>
              <div className="space-y-3.5 px-5 py-4">
                {items.map(item => (
                  <Bubble key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  )
}
