'use client'
import EmptyState from '@/components/EmptyState'
import { formatDayHeading, formatTime, formatDayFull, relativeTime, templateLabel, stageLabel } from '@/lib/utils'

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
        color: 'var(--ink)',
        [inbound ? 'borderBottomLeftRadius' : 'borderBottomRightRadius']: 4,
      }
    : {
        background: 'var(--accent)',
        color: 'var(--on-signal)',
        borderBottomRightRadius: 4,
      }

  // Delivery note, only when something went wrong.
  const note = item.error
    ? { text: item.error, tone: 'neg' }
    : item.redirected
      ? { text: 'Redirected to the test number. The customer did not get this.', tone: 'warn' }
      : null

  return (
    <div className={`flex flex-col ${inbound ? 'items-start' : 'items-end'} gap-1`}>
      <div className="max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[13px]" style={bubbleStyle}>
        {item.body ? (
          <p className="leading-relaxed whitespace-pre-wrap wrap-break-word">{item.body}</p>
        ) : (
          <p className="italic leading-relaxed opacity-70">No message body stored.</p>
        )}
      </div>

      {/* One meta line: which message, when, and its state if not plain "sent". */}
      <p className="flex max-w-[78%] flex-wrap items-center gap-x-1.5 px-1 text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>
        {!inbound && <span style={{ color: 'var(--ink-muted)' }}>{item.title}</span>}
        {!inbound && <span aria-hidden="true">·</span>}
        <time dateTime={item.ts} className="tabular">{formatTime(item.ts)}</time>
        {item.status && !['sent', 'delivered', 'received'].includes(item.status) && (
          <>
            <span aria-hidden="true">·</span>
            <span style={{ color: tone ? `var(--tone-${tone}-ink)` : 'var(--ink-muted)' }}>{stageLabel(item.status)}</span>
          </>
        )}
      </p>

      {note && (
        <p className="max-w-[78%] px-1 text-[11.5px]" style={{ color: `var(--tone-${note.tone}-ink)` }}>
          {note.text}
        </p>
      )}
    </div>
  )
}

// ─── View ─────────────────────────────────────────────────────────────────────

export default function LeadMessages(props) {
  const { sent, upcoming } = buildThread(props)
  const dayGroups = groupByDay(sent)

  return (
    <div className="space-y-4">
      {/* Queued sends, above the thread: they are the next thing that will
          happen, not part of what was said. */}
      {upcoming.length > 0 && (
        <section className="surface overflow-hidden">
          <div className="section-head">
            <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>
              Up next
              <span className="tabular ml-2 font-normal" style={{ color: 'var(--ink-faint)' }}>{upcoming.length}</span>
            </span>
          </div>
          <ul className="divide-y divide-[var(--rule-faint)]">
            {upcoming.map(item => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--tone-info-ink)' }} aria-hidden="true">
                    <circle cx="12" cy="12" r="8.5" />
                    <path d="M12 7.5V12l3 2" />
                  </svg>
                  <span className="truncate text-[13px]" style={{ color: 'var(--ink)' }}>{item.title}</span>
                  {item.status === 'claimed' && (
                    <span className="text-[12px]" style={{ color: 'var(--tone-info-ink)' }}>Sending</span>
                  )}
                </div>
                <time dateTime={item.ts} className="shrink-0 text-right leading-tight">
                  {item.demoMode ? (
                    <>
                      <span className="block text-[12px] font-medium" style={{ color: 'var(--signal-alt)' }}>
                        {relativeTime(item.ts)}
                      </span>
                      {item.productionDue && (
                        <span className="block text-[10.5px]" style={{ color: 'var(--ink-faint)' }}>
                          Prod: {formatDayFull(item.productionDue)}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="tabular block text-[12px]" style={{ color: 'var(--ink-secondary)' }}>
                        {formatDayFull(item.ts)}
                      </span>
                      <span className="block text-[11px]" style={{ color: 'var(--ink-faint)' }}>
                        {relativeTime(item.ts)}
                      </span>
                    </>
                  )}
                </time>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* The tab already names this panel, so it opens straight on the thread. */}
      <section className="surface overflow-hidden" aria-label="Conversation">
        {sent.length === 0 ? (
          <EmptyState
            title="No messages yet"
            description="Sent texts and customer replies appear here as the journey runs."
          />
        ) : (
          <div className="space-y-5 px-5 py-5">
            {dayGroups.map(({ key, items }) => (
              <div key={key} className="space-y-3.5">
                {/* Centred day divider, as in any messaging app. */}
                <div className="flex items-center gap-3" role="separator" aria-label={key}>
                  <span className="h-px flex-1" style={{ background: 'var(--rule-faint)' }} />
                  <span className="text-[11.5px] font-medium" style={{ color: 'var(--ink-faint)' }}>{key}</span>
                  <span className="h-px flex-1" style={{ background: 'var(--rule-faint)' }} />
                </div>
                {items.map(item => (
                  <Bubble key={item.id} item={item} />
                ))}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
