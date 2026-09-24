import { getPipeline } from '@/lib/queries'
import Link from 'next/link'
import Badge from '@/components/Badge'
import EmptyState from '@/components/EmptyState'
import { journeyTypeLabel, ageInDays } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key] ?? 'unknown'
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {})
}

export default async function PipelinePage() {
  let journeys = []
  let fetchError = null

  try {
    journeys = await getPipeline()
  } catch (e) {
    fetchError = e.message
  }

  const byType = groupBy(journeys, 'journey_type')

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-800">Pipeline</h1>

      {fetchError && (
        <div className="rounded bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {fetchError}
        </div>
      )}

      {journeys.length === 0 && !fetchError && (
        <EmptyState
          title="No active journeys"
          description="All journeys are completed or cancelled."
        />
      )}

      {Object.entries(byType).map(([type, typeJourneys]) => {
        const byStage = groupBy(typeJourneys, 'current_stage')

        return (
          <div key={type} className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
              {journeyTypeLabel(type)} ({typeJourneys.length})
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {Object.entries(byStage).map(([stage, stageJourneys]) => {
                const avgAge = stageJourneys.reduce((sum, j) => sum + (ageInDays(j.started_at) ?? 0), 0) / stageJourneys.length

                return (
                  <div key={stage} className="rounded-lg border border-slate-200 bg-white shadow-sm p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-600 truncate" title={stage}>
                        {stage ?? 'No stage'}
                      </span>
                      <span className="text-xs font-bold text-slate-800 ml-1">{stageJourneys.length}</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-2">avg {Math.round(avgAge)}d</p>
                    <ul className="space-y-1 max-h-40 overflow-y-auto">
                      {stageJourneys.map((j) => (
                        <li key={j.id}>
                          <Link
                            href={`/leads/${j.leads?.id}`}
                            className="text-xs text-blue-600 hover:underline block truncate"
                          >
                            {j.leads?.full_name || j.leads?.id || '—'}
                          </Link>
                          <span className="text-xs text-slate-400">{ageInDays(j.started_at)}d</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
