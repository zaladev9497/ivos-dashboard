import Badge from '@/components/Badge'
import { formatDate, journeyTypeLabel, stageLabel } from '@/lib/utils'

/* Label left, value right: a record reads as a ledger, and each fact costs one
   line instead of two. */
function Row({ label, children }) {
  return (
    <div className="grid grid-cols-[104px_minmax(0,1fr)] items-baseline gap-3 py-1.5">
      <dt className="text-[12px]" style={{ color: 'var(--ink-muted)' }}>{label}</dt>
      <dd className="min-w-0 wrap-break-word text-[13px]" style={{ color: 'var(--ink)' }}>
        {children ?? <span style={{ color: 'var(--ink-faint)' }}>—</span>}
      </dd>
    </div>
  )
}

/* Groups share one surface and are split by a hairline — no card per topic. */
function Group({ title, children }) {
  return (
    <section className="border-t px-5 py-3.5 first:border-t-0" style={{ borderColor: 'var(--rule-faint)' }}>
      <h2 className="eyebrow mb-1.5">{title}</h2>
      <dl>{children}</dl>
    </section>
  )
}

/* A setting that is either on or off. Off is the case worth noticing, so it
   gets the colour; on stays quiet. */
function Setting({ label, on, onText = 'On', offText = 'Off' }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <dt className="text-[12px]" style={{ color: 'var(--ink-muted)' }}>{label}</dt>
      <dd className="inline-flex items-center gap-1.5 text-[12.5px]" style={{ color: on ? 'var(--ink-secondary)' : 'var(--tone-neg-ink)' }}>
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: on ? 'var(--signal-pos)' : 'var(--signal-neg)' }}
          aria-hidden="true"
        />
        {on ? onText : offText}
      </dd>
    </div>
  )
}

const ExternalIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-0.5 inline h-3 w-3 align-[-1px]" aria-hidden="true">
    <path d="M7 17L17 7M9 7h8v8" />
  </svg>
)

const CONV_STATE_TONE = { human_takeover: 'high', closed: 'cancelled' }

export default function LeadSidebar({ lead, journeys, conversations, ncOrders }) {
  const journey = journeys[0]
  const conv = conversations[0]
  const address = [lead.street, lead.city, lead.province, lead.postal_code].filter(Boolean).join(', ')

  return (
    <aside className="surface overflow-hidden">
      <Group title="Contact">
        <Row label="Email">
          {lead.email ? <a href={`mailto:${lead.email}`} className="link">{lead.email}</a> : null}
        </Row>
        <Row label="Phone">
          {lead.phone ? <span className="mono text-[12.5px]">{lead.phone}</span> : null}
        </Row>
        <Row label="Address">{address || null}</Row>
      </Group>

      {journey && (
        <Group title="Journey">
          <Row label="Type">{journeyTypeLabel(journey.journey_type)}</Row>
          <Row label="State">
            <Badge label={stageLabel(journey.state)} status={journey.state} />
          </Row>
          <Row label="Stage">{stageLabel(journey.current_stage)}</Row>
          {journey.paused_reason && <Row label="Paused">{journey.paused_reason}</Row>}
          {journey.consultant_name && <Row label="Consultant">{journey.consultant_name}</Row>}
          {journey.quote_link && (
            <Row label="Quote">
              <a href={journey.quote_link} target="_blank" rel="noopener noreferrer" className="link">
                #{journey.quote_number}{ExternalIcon}
              </a>
              {journey.quote_status && (
                <span className="ml-2 text-[12px]" style={{ color: 'var(--ink-muted)' }}>
                  {stageLabel(journey.quote_status)}
                </span>
              )}
            </Row>
          )}
          {journey.quote_sent_at && <Row label="Quote sent">{formatDate(journey.quote_sent_at)}</Row>}
          {journey.assessment_start_at && <Row label="Assessment">{formatDate(journey.assessment_start_at)}</Row>}
          {journey.service_install_date && <Row label="Install">{formatDate(journey.service_install_date)}</Row>}
        </Group>
      )}

      {conv && (
        <Group title="SMS conversation">
          <Row label="Handled by">
            <Badge
              label={conv.human_state === 'human_takeover' ? 'Human' : stageLabel(conv.human_state)}
              status={CONV_STATE_TONE[conv.human_state] ?? 'sent'}
            />
          </Row>
          <Row label="Messages"><span className="tabular">{conv.message_count}</span></Row>
          {conv.last_inbound_at && <Row label="Last inbound">{formatDate(conv.last_inbound_at)}</Row>}
          {conv.last_outbound_at && <Row label="Last outbound">{formatDate(conv.last_outbound_at)}</Row>}
          {conv.opted_out && (
            <Row label="Opted out">
              <span style={{ color: 'var(--tone-neg-ink)' }}>
                {conv.opted_out_at ? formatDate(conv.opted_out_at) : 'Yes'}
              </span>
            </Row>
          )}
        </Group>
      )}

      {ncOrders.length > 0 && (
        <Group title="Orders">
          {ncOrders.map((o) => (
            <Row key={o.id} label={o.order_type}>
              <span className="mono text-[12.5px]">{o.order_number}</span>
              <span className="block text-[11.5px]" style={{ color: 'var(--ink-muted)' }}>
                {o.supplier} · {formatDate(o.first_seen_at)}
              </span>
            </Row>
          ))}
        </Group>
      )}

      <Group title="Messaging preferences">
        <Setting label="SMS" on={!!lead.sms_allowed} onText="Allowed" offText="Blocked" />
        <Setting label="Follow-ups" on={!!lead.receives_follow_ups} />
        <Setting label="Quote follow-ups" on={!!lead.receives_quote_follow_ups} />
        <Setting label="Reminders" on={!!lead.receives_reminders} />
      </Group>

      <Group title="Record">
        <Row label="Received">{lead.ingested_at ? formatDate(lead.ingested_at) : null}</Row>
        <Row label="Source">{lead.source_channel ?? lead.source_system ?? null}</Row>
      </Group>
    </aside>
  )
}
