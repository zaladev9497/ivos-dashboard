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
} from '@/lib/queries'
import LeadSidebar from './LeadSidebar'
import Timeline from './Timeline'

export const dynamic = 'force-dynamic'

export default async function LeadDetailPage({ params }) {
  const { id } = await params

  let lead
  try {
    lead = await getLead(id)
  } catch {
    notFound()
  }
  if (!lead) notFound()

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
  ] = await Promise.all([
    getLeadJourneys(id),
    getLeadMessages(id),
    getLeadScheduledMessages(id),
    getLeadJourneyEvents(id),
    getLeadEvents(id),
    getLeadExceptions(id),
    getLeadConversation(id),
    getLeadGlasshouseEvents(id),
    getLeadGlasshousePromotion(id),
    getLeadNcOrders(id),
  ])

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-800">Leads</Link>
        <span>/</span>
        <span className="text-slate-800 font-medium">{lead.full_name || lead.id}</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
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
        />

        {/* Sidebar */}
        <LeadSidebar
          lead={lead}
          journeys={journeys}
          conversations={conversations}
          exceptions={exceptions}
          ncOrders={ncOrders}
        />
      </div>
    </div>
  )
}
