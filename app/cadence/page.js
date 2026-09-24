import { getCadenceSteps, getActiveJourneyCountByType, getBusinessCalendar } from '@/lib/queries'
import CadenceEditor from './CadenceEditor'

export const dynamic = 'force-dynamic'

const JOURNEYS = ['retrofit', 'new_construction', 'service']

export default async function CadencePage({ searchParams }) {
  const params = await searchParams
  const journeyType = params?.journey ?? 'retrofit'

  const [steps, journeyCounts, calendar] = await Promise.all([
    getCadenceSteps(journeyType),
    getActiveJourneyCountByType().catch(() => ({})),
    getBusinessCalendar().catch(() => null),
  ])

  return (
    <CadenceEditor
      steps={steps}
      journeyType={journeyType}
      journeys={JOURNEYS}
      journeyCounts={journeyCounts}
      quoteValidityDays={calendar?.quote_validity_days ?? 30}
    />
  )
}
