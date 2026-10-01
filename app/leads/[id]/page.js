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
import LeadActions from './LeadActions'
import AdvanceButton from '@/components/AdvanceButton'

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

  return (
    <div className="page rise">
      {/* Breadcrumb + title. The lead's name is the page heading, set in the
          display face — this is a record, and it should read like one. */}
      <header>
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11.5px]">
          <Link href="/" className="transition-colors hover:text-[var(--accent)]" style={{ color: 'var(--ink-muted)' }}>
            Leads
          </Link>
          <span style={{ color: 'var(--ink-faint)' }}>/</span>
          <span style={{ color: 'var(--ink-faint)' }}>Record</span>
        </nav>
        <h1 className="page-title mt-1">{lead.full_name || lead.id}</h1>
      </header>

      {demoMode && <AdvanceButton pollIntervalSeconds={demoPollInterval} />}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
        {/* Timeline */}
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
            exceptions={exceptions}
            ncOrders={ncOrders}
          />
        </div>
      </div>
    </div>
  )
}
