import { getPipeline } from '@/lib/queries'
import Link from 'next/link'
import EmptyState from '@/components/EmptyState'
import { journeyTypeLabel, ageInDays, stageLabel } from '@/lib/utils'

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
// stage for three weeks should be visible without reading the number. Fresh
// journeys get no colour at all, so the stale ones are the only thing that lights up.
function ageTone(days) {
  if (days >= 21) return 'neg'
  if (days >= 10) return 'warn'
  return null
}

function AgeLabel({ days, className = '' }) {
  const tone = ageTone(days)
  return (
    <span
      className={`tabular shrink-0 text-[11.5px] ${tone ? 'font-semibold' : ''} ${className}`}
      style={{ color: tone ? `var(--tone-${tone}-ink)` : 'var(--ink-faint)' }}
    >
      {days}d
    </span>
  )
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
          <p className="page-lede">Active journeys by stage. Leads idle 10+ days turn amber, 21+ red.</p>
        </div>
        {journeys.length > 0 && (
          <p className="text-[12.5px]" style={{ color: 'var(--ink-muted)' }}>
            <span className="tabular font-semibold" style={{ color: 'var(--ink)' }}>{journeys.length}</span> active journeys
          </p>
        )}
      </header>

      {fetchError && (
        <div
          className="rounded-[var(--radius)] border px-3.5 py-2.5 text-[12.5px]"
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
        const stale = typeJourneys.filter((j) => (ageInDays(j.started_at) ?? 0) >= 21).length

        return (
          <section key={type} className="space-y-3">
            <div className="flex items-baseline gap-2.5">
              <h2 className="text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>
                {journeyTypeLabel(type)}
              </h2>
              <span className="tabular text-[12.5px]" style={{ color: 'var(--ink-muted)' }}>
                {typeJourneys.length} active
              </span>
              {stale > 0 && (
                <span className="text-[12.5px]" style={{ color: 'var(--tone-neg-ink)' }}>
                  · {stale} over 3 weeks
                </span>
              )}
            </div>

            {/* A board: one column per stage, scrolling sideways rather than wrapping
                so stages keep their left-to-right order. */}
            <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
              {Object.entries(byStage).map(([stage, stageJourneys]) => {
                const avgAge = Math.round(
                  stageJourneys.reduce((sum, j) => sum + (ageInDays(j.started_at) ?? 0), 0) /
                    stageJourneys.length
                )
                const sorted = [...stageJourneys].sort(
                  (a, b) => (ageInDays(b.started_at) ?? 0) - (ageInDays(a.started_at) ?? 0)
                )
                const label = stage === 'unknown' ? 'No stage' : stageLabel(stage)

                return (
                  <article
                    key={stage}
                    className="flex w-64 shrink-0 flex-col rounded-[var(--radius-lg)] border"
                    style={{ borderColor: 'var(--rule-faint)', background: 'var(--paper-sunken)' }}
                  >
                    <header className="flex items-center justify-between gap-2 px-3.5 pb-2 pt-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-[13px] font-semibold" style={{ color: 'var(--ink)' }} title={label}>
                          {label}
                        </span>
                        <span className="tabular text-[12px]" style={{ color: 'var(--ink-faint)' }}>
                          {stageJourneys.length}
                        </span>
                      </div>
                      <span className="shrink-0 text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>
                        avg <AgeLabel days={avgAge} />
                      </span>
                    </header>

                    <ul className="max-h-[22rem] space-y-1.5 overflow-y-auto px-2 pb-2">
                      {sorted.map((j) => (
                        <li key={j.id}>
                          <Link
                            href={`/leads/${j.leads?.id}`}
                            className="group flex items-center justify-between gap-2 rounded-[var(--radius)] border px-3 py-2 transition-[border-color,box-shadow] hover:border-[var(--rule-strong)]"
                            style={{ background: 'var(--paper-raised)', borderColor: 'var(--rule-faint)', boxShadow: 'var(--lift-flat)' }}
                          >
                            <span
                              className="min-w-0 truncate text-[13px] transition-colors group-hover:text-[var(--accent)]"
                              style={{ color: 'var(--ink)' }}
                            >
                              {j.leads?.full_name || 'Unnamed lead'}
                            </span>
                            <AgeLabel days={ageInDays(j.started_at) ?? 0} />
                          </Link>
                        </li>
                      ))}
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
