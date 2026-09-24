import { getLeads } from '@/lib/queries'
import LeadsTable from './LeadsTable'

export const dynamic = 'force-dynamic'

export default async function LeadsPage({ searchParams }) {
  const params = await searchParams
  const page = parseInt(params?.page ?? '1', 10)
  const search = params?.search ?? ''
  const journeyType = params?.journey_type ?? ''
  const showTest = params?.show_test === '1'
  const hasException = params?.has_exception === '1'
  const dateFrom = params?.date_from ?? ''
  const dateTo = params?.date_to ?? ''

  let result = { leads: [], total: 0, pageSize: 50 }
  let fetchError = null

  try {
    result = await getLeads({ page, search, journeyType, showTest, hasException, dateFrom, dateTo })
  } catch (e) {
    fetchError = e.message
  }

  return (
    <LeadsTable
      initialLeads={result.leads}
      total={result.total}
      pageSize={result.pageSize}
      currentPage={page}
      currentFilters={{ search, journeyType, showTest, hasException, dateFrom, dateTo }}
      fetchError={fetchError}
    />
  )
}
