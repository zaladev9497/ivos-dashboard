import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  getLead,
  getLeadJourneys,
  getLeadMessages,
  getLeadScheduledMessages,
  getLeadJourneyEvents,
  getLeadEvents,
  getLeadExceptions,
  getLeadConversation,
  getLeadGlasshouseEvents,
  getLeadGlasshousePromotion,
  getLeadNcOrders,
  getTemplates,
  getBusinessCalendar,
} from '@/lib/queries'
import LeadSidebar from './LeadSidebar'
import Timeline from './Timeline'
import LeadMessages from './LeadMessages'
import LeadTabs from './LeadTabs'
import LeadActions from './LeadActions'
import AdvanceButton from '@/components/AdvanceButton'
import Badge from '@/components/Badge'
import { formatDateShort, journeyTypeLabel, stageLabel } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Lead' }

export default async function LeadDetailPage({ params }) {
  const { id } = await params

  let lead
  try {
    lead = await getLead(id)
  } catch {
    notFound()
  }
  if (!lead) notFound()

  const safe = (p, fallback) => p.catch(() => fallback)

  const [
    journeys,
    messages,
    scheduledMessages,
    journeyEvents,
    leadEvents,
    exceptions,
    conversations,
    ghEvents,
    ghPromotion,
    ncOrders,
    allTemplates,
    calendar,
  ] = await Promise.all([
    safe(getLeadJourneys(id), []),
    safe(getLeadMessages(id), []),
    safe(getLeadScheduledMessages(id), []),
    safe(getLeadJourneyEvents(id), []),
    safe(getLeadEvents(id), []),
    safe(getLeadExceptions(id), []),
    safe(getLeadConversation(id), []),
    safe(getLeadGlasshouseEvents(id), []),
    safe(getLeadGlasshousePromotion(id), null),
    safe(getLeadNcOrders(id), []),
    safe(getTemplates(), []),
    safe(getBusinessCalendar(), null),
  ])

  const demoMode = !!(calendar?.demo_mode)
  const demoPollInterval = calendar?.demo_poll_interval_seconds ?? 10

  const templateLabels = {}
  for (const t of allTemplates) templateLabels[t.template_key] = t

  // Tab badge: texts that actually moved, plus anything still queued to go.
  const messageCount =
    messages.length +
    scheduledMessages.filter(sm => sm.state === 'pending' || sm.state === 'claimed').length

  const primaryJourney = journeys[0]
  const openExceptions = exceptions.filter((e) => e.state === 'open')
  const stage = stageLabel(primaryJourney?.current_stage)

  // One quiet line of the facts you open a record to check.
  const facts = [
    lead.journey_type && journeyTypeLabel(lead.journey_type),
    stage,
    lead.phone && <span key="phone" className="mono text-[12px]">{lead.phone}</span>,
    lead.ingested_at && `Received ${formatDateShort(lead.ingested_at)}`,
  ].filter(Boolean)

  return (
    <div className="page rise" style={{ gap: '1.25rem' }}>
      {/* Record header: who, where they are, and the way out to Jobber. */}
      <header className="space-y-2.5">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-[12px] transition-colors hover:text-[var(--accent)]"
          style={{ color: 'var(--ink-muted)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Leads
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="page-title" style={{ fontSize: '1.5rem', lineHeight: 1.2 }}>
                {lead.full_name || 'Unnamed lead'}
              </h1>
              {lead.request_status && <Badge label={stageLabel(lead.request_status)} status={lead.request_status} />}
              {lead.is_test_record && <Badge label="Test" status="test" dot={false} />}
              {lead.needs_manual_routing && <Badge label="Manual routing" status="medium" dot={false} />}
              {lead.is_archived && <Badge label="Archived" status="archived" dot={false} />}
            </div>
            {facts.length > 0 && (
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[13px]" style={{ color: 'var(--ink-muted)' }}>
                {facts.map((f, i) => (
                  <span key={i} className="inline-flex items-center gap-2">
                    {i > 0 && <span aria-hidden="true" style={{ color: 'var(--ink-faint)' }}>·</span>}
                    {f}
                  </span>
                ))}
              </p>
            )}
          </div>

          {lead.external_web_uri && (
            <a
              href={lead.external_web_uri}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-quiet"
            >
              Open in Jobber
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="M7 17L17 7M9 7h8v8" />
              </svg>
            </a>
          )}
        </div>
      </header>

      {/* Open exceptions are the one thing that needs a human — say so first,
          not at the bottom of the sidebar. */}
      {openExceptions.length > 0 && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-[var(--radius-lg)] border px-4 py-3"
          style={{ borderColor: 'var(--tone-neg-rule)', background: 'var(--tone-neg-soft)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--tone-neg-ink)' }} aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16.5v.01" />
          </svg>
          <div className="min-w-0 flex-1 space-y-1.5">
            {openExceptions.map((exc) => (
              <div key={exc.id}>
                <p className="text-[13px] font-semibold" style={{ color: 'var(--tone-neg-ink)' }}>
                  {stageLabel(exc.exception_type)}
                  <span className="ml-2 text-[11.5px] font-medium opacity-80">{exc.severity} severity</span>
                </p>
                {exc.summary && (
                  <p className="mt-0.5 text-[12.5px] leading-relaxed" style={{ color: 'var(--ink-secondary)' }}>
                    {exc.summary}
                  </p>
                )}
              </div>
            ))}
          </div>
          <Link href="/ops" className="link shrink-0 text-[12.5px]">Review in Operations</Link>
        </div>
      )}

      {demoMode && <AdvanceButton pollIntervalSeconds={demoPollInterval} />}

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Timeline (everything that happened) and Messages (only what was
            texted), behind a tab switch so the record stays one column. */}
        <LeadTabs
          messageCount={messageCount}
          timeline={
            <Timeline
              lead={lead}
              journeys={journeys}
              messages={messages}
              scheduledMessages={scheduledMessages}
              journeyEvents={journeyEvents}
              leadEvents={leadEvents}
              exceptions={exceptions}
              ghEvents={ghEvents}
              ghPromotion={ghPromotion}
              ncOrders={ncOrders}
              templateLabels={templateLabels}
            />
          }
          messages={
            <LeadMessages
              messages={messages}
              scheduledMessages={scheduledMessages}
              templateLabels={templateLabels}
            />
          }
        />

        {/* Sidebar */}
        <div className="space-y-4">
          <LeadActions
            journeys={journeys}
            scheduledMessages={scheduledMessages}
            conversations={conversations}
            leadId={id}
            demoMode={demoMode}
          />
          <LeadSidebar
            lead={lead}
            journeys={journeys}
            conversations={conversations}
            ncOrders={ncOrders}
          />
        </div>
      </div>
    </div>
  )
}
