import Badge from '@/components/Badge'
import { formatDate, journeyTypeLabel } from '@/lib/utils'

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{children ?? <span className="text-slate-400">—</span>}</dd>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
        {title}
      </div>
      <dl className="divide-y divide-slate-50">
        <div className="px-4 py-3 grid grid-cols-1 gap-3">{children}</div>
      </dl>
    </div>
  )
}

export default function LeadSidebar({ lead, journeys, conversations, exceptions, ncOrders }) {
  const openExceptions = exceptions.filter((e) => e.state === 'open')
  const primaryJourney = journeys[0]
  const conv = conversations[0]

  return (
    <aside className="space-y-4">
      {/* Contact */}
      <Section title="Contact">
        <Field label="Name">{lead.full_name}</Field>
        <Field label="Email">
          {lead.email ? (
            <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline">
              {lead.email}
            </a>
          ) : null}
        </Field>
        <Field label="Phone">
          {lead.phone ? (
            <span className="font-mono">{lead.phone}</span>
          ) : null}
        </Field>
        <Field label="Address">
          {[lead.street, lead.city, lead.province, lead.postal_code].filter(Boolean).join(', ') || null}
        </Field>
        {lead.external_web_uri && (
          <Field label="Jobber">
            <a
              href={lead.external_web_uri}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm"
            >
              Open in Jobber ↗
            </a>
          </Field>
        )}
      </Section>

      {/* Consent & flags */}
      <Section title="Consent & flags">
        <div className="flex flex-wrap gap-1.5">
          {lead.sms_allowed && <Badge label="SMS allowed" status="sent" />}
          {!lead.sms_allowed && <Badge label="SMS blocked" status="failed" />}
          {lead.receives_follow_ups && <Badge label="Follow-ups on" status="sent" />}
          {lead.receives_quote_follow_ups && <Badge label="Quote follow-ups" status="sent" />}
          {lead.receives_reminders && <Badge label="Reminders on" status="sent" />}
          {lead.is_test_record && <Badge label="Test record" status="test" />}
          {lead.is_archived && <Badge label="Archived" status="cancelled" />}
          {lead.needs_manual_routing && <Badge label="Manual routing" status="medium" />}
        </div>
      </Section>

      {/* Journey */}
      {primaryJourney && (
        <Section title="Journey">
          <Field label="Type">{journeyTypeLabel(primaryJourney.journey_type)}</Field>
          <Field label="State">
            <Badge label={primaryJourney.state} status={primaryJourney.state} />
          </Field>
          <Field label="Stage">{primaryJourney.current_stage}</Field>
          {primaryJourney.paused_reason && (
            <Field label="Paused">{primaryJourney.paused_reason}</Field>
          )}
          {primaryJourney.consultant_name && (
            <Field label="Consultant">{primaryJourney.consultant_name}</Field>
          )}
          {primaryJourney.quote_link && (
            <Field label="Quote">
              <a
                href={primaryJourney.quote_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                #{primaryJourney.quote_number} ↗
              </a>
              {' '}
              {primaryJourney.quote_status && (
                <Badge label={primaryJourney.quote_status} status={primaryJourney.quote_status} />
              )}
            </Field>
          )}
          {primaryJourney.quote_sent_at && (
            <Field label="Quote sent">{formatDate(primaryJourney.quote_sent_at)}</Field>
          )}
          {primaryJourney.assessment_start_at && (
            <Field label="Assessment">{formatDate(primaryJourney.assessment_start_at)}</Field>
          )}
          {primaryJourney.service_install_date && (
            <Field label="Install date">{formatDate(primaryJourney.service_install_date)}</Field>
          )}
        </Section>
      )}

      {/* SMS conversation */}
      {conv && (
        <Section title="SMS Conversation">
          <Field label="State">
            <Badge label={conv.human_state} status={conv.human_state === 'human_takeover' ? 'high' : conv.human_state === 'closed' ? 'cancelled' : 'sent'} />
          </Field>
          {conv.opted_out && (
            <Field label="Opted out">
              <Badge label="Opted out" status="failed" />
              {conv.opted_out_at && <span className="text-slate-400 ml-1.5 text-xs">{formatDate(conv.opted_out_at)}</span>}
            </Field>
          )}
          <Field label="Messages">{conv.message_count}</Field>
          {conv.last_inbound_at && (
            <Field label="Last inbound">{formatDate(conv.last_inbound_at)}</Field>
          )}
          {conv.last_outbound_at && (
            <Field label="Last outbound">{formatDate(conv.last_outbound_at)}</Field>
          )}
        </Section>
      )}

      {/* NC Orders */}
      {ncOrders.length > 0 && (
        <Section title="Orders">
          {ncOrders.map((o) => (
            <div key={o.id} className="text-sm">
              <div className="font-medium text-slate-700">{o.order_type} — {o.order_number}</div>
              <div className="text-slate-400 text-xs">{o.supplier} · {formatDate(o.first_seen_at)}</div>
            </div>
          ))}
        </Section>
      )}

      {/* Open exceptions */}
      {openExceptions.length > 0 && (
        <Section title="Open exceptions">
          {openExceptions.map((exc) => (
            <div key={exc.id} className="text-sm space-y-1">
              <div className="flex items-center gap-2">
                <Badge label={exc.severity} status={exc.severity} />
                <span className="font-medium text-slate-700">{exc.exception_type}</span>
              </div>
              <p className="text-slate-500 text-xs">{exc.summary}</p>
            </div>
          ))}
        </Section>
      )}

      {/* Ingested */}
      <div className="text-xs text-slate-400 px-1">
        Ingested {formatDate(lead.ingested_at)} · Source: {lead.source_channel ?? lead.source_system ?? '—'}
      </div>
    </aside>
  )
}
