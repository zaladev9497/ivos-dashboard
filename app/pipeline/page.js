import { getPipeline } from '@/lib/queries'
import Link from 'next/link'
import EmptyState from '@/components/EmptyState'
import { journeyTypeLabel, ageInDays } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Pipeline' }

function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key] ?? 'unknown'
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {})
}

// Age is the signal that matters in a pipeline view — something sitting in a
// stage for three weeks should be visible without reading the number.
function ageTone(days) {
  if (days >= 21) return 'neg'
  if (days >= 10) return 'warn'
  return 'pos'
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
    <div className="page rise">
      <header className="page-head">
        <div>
          <h1 className="page-title">Pipeline</h1>
          <p className="page-lede">Active journeys by stage, oldest first.</p>
        </div>
        {journeys.length > 0 && (
          <span className="eyebrow">
            <span className="tabular" style={{ color: 'var(--ink-secondary)' }}>{journeys.length}</span> active
          </span>
        )}
      </header>

      {fetchError && (
        <div
          className="rounded-[7px] border px-3.5 py-2.5 text-[12.5px]"
          style={{ borderColor: 'var(--signal-neg-rule)', background: 'var(--signal-neg-soft)', color: 'var(--tone-neg-ink)' }}
        >
          {fetchError}
        </div>
      )}

      {journeys.length === 0 && !fetchError && (
        <div className="surface">
          <EmptyState
            title="No active journeys"
            description="All journeys are completed or cancelled."
          />
        </div>
      )}

      {Object.entries(byType).map(([type, typeJourneys]) => {
        const byStage = groupBy(typeJourneys, 'current_stage')

        return (
          <section key={type} className="space-y-3.5">
            <div className="flex items-center gap-3">
              <h2 className="eyebrow" style={{ color: 'var(--ink-secondary)' }}>
                {journeyTypeLabel(type)}
              </h2>
              <span className="counter">{typeJourneys.length}</span>
              <div className="rule-fade flex-1" />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Object.entries(byStage).map(([stage, stageJourneys]) => {
                const avgAge = Math.round(
                  stageJourneys.reduce((sum, j) => sum + (ageInDays(j.started_at) ?? 0), 0) /
                    stageJourneys.length
                )
                const tone = ageTone(avgAge)
                const sorted = [...stageJourneys].sort(
                  (a, b) => (ageInDays(b.started_at) ?? 0) - (ageInDays(a.started_at) ?? 0)
                )

                return (
                  <article key={stage} className="surface card-interactive flex flex-col overflow-hidden">
                    <div className="section-head">
                      <span
                        className="truncate text-[12.5px] font-semibold"
                        style={{ color: 'var(--ink)' }}
                        title={stage ?? 'No stage'}
                      >
                        {stage ?? 'No stage'}
                      </span>
                      <span className="counter shrink-0">{stageJourneys.length}</span>
                    </div>

                    {/* Average age bar — a glanceable health read for the stage. */}
                    <div className="flex items-center gap-2.5 px-4 pt-3.5">
                      <span className="eyebrow shrink-0" style={{ color: 'var(--ink-faint)' }}>Avg age</span>
                      <div
                        className="h-1 flex-1 overflow-hidden rounded-full"
                        style={{ background: 'var(--paper-sunken)' }}
                        role="img"
                        aria-label={`Average age ${avgAge} days`}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, (avgAge / 30) * 100)}%`,
                            background: `var(--signal-${tone})`,
                          }}
                        />
                      </div>
                      <span
                        className="tabular shrink-0 text-[11.5px] font-semibold"
                        style={{ color: `var(--tone-${tone}-ink)` }}
                      >
                        {avgAge}d
                      </span>
                    </div>

                    <ul className="max-h-56 space-y-0.5 overflow-y-auto p-2.5">
                      {sorted.map((j) => {
                        const age = ageInDays(j.started_at)
                        return (
                          <li key={j.id}>
                            <Link
                              href={`/leads/${j.leads?.id}`}
                              className="group flex items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors hover:bg-[var(--paper-hover)]"
                            >
                              <span
                                className="h-1 w-1 shrink-0 rounded-full"
                                style={{ background: `var(--signal-${ageTone(age ?? 0)})` }}
                                aria-hidden="true"
                              />
                              <span
                                className="min-w-0 flex-1 truncate text-[12.5px] transition-colors group-hover:text-[var(--accent)]"
                                style={{ color: 'var(--ink-secondary)' }}
                              >
                                {j.leads?.full_name || j.leads?.id || '—'}
                              </span>
                              <span
                                className="tabular shrink-0 text-[11px]"
                                style={{ color: 'var(--ink-faint)' }}
                              >
                                {age}d
                              </span>
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  </article>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
