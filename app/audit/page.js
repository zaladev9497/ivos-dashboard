import Link from 'next/link'
import { getAuditLogs, safePage } from '@/lib/queries'
import Timestamp from '@/components/Timestamp'
import EmptyState from '@/components/EmptyState'
import { stageLabel } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Audit' }

// Audit rows are keyed by database table. Show them by the screen people know.
const AREAS = [
  { table: '', label: 'All' },
  { table: 'cadence_steps', label: 'Cadence' },
  { table: 'message_templates', label: 'Templates' },
  { table: 'business_calendar', label: 'Settings' },
  { table: 'journeys', label: 'Journeys' },
  { table: 'scheduled_messages', label: 'Messages' },
  { table: 'operations_exceptions', label: 'Exceptions' },
]
const AREA_LABEL = Object.fromEntries(AREAS.filter((a) => a.table).map((a) => [a.table, a.label]))

const Chevron = ({ d }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
    <path d={d} />
  </svg>
)

export default async function AuditPage({ searchParams }) {
  const params = await searchParams
  const page = safePage(params?.page)
  const tableName = params?.table ?? ''
  const actor = params?.actor ?? ''

  const { logs, total, pageSize, missing } = await getAuditLogs({ page, tableName, actor })
  const totalPages = Math.ceil(total / pageSize)

  function buildUrl(overrides) {
    const p = new URLSearchParams({ page: '1', ...(tableName && { table: tableName }), ...(actor && { actor }) })
    Object.entries(overrides).forEach(([k, v]) => { if (v) p.set(k, v); else p.delete(k) })
    if (p.get('page') === '1') p.delete('page')
    return `/audit?${p.toString()}`
  }

  return (
    <div className="rise flex min-h-0 flex-1 flex-col gap-4">
      {/* ── Page head ───────────────────────────────────────────────────── */}
      <header className="shrink-0 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <div>
            <h1 className="page-title">Audit log</h1>
            <p className="page-lede">Every change made from this dashboard: who, what and when.</p>
          </div>
          <p className="pb-0.5 text-[12.5px]" style={{ color: 'var(--ink-muted)' }}>
            <span className="tabular font-semibold" style={{ color: 'var(--ink)' }}>{total.toLocaleString()}</span>
            {' '}entr{total === 1 ? 'y' : 'ies'}
          </p>
        </div>

        <nav className="tabs overflow-x-auto" aria-label="Filter by area">
          {AREAS.map((a) => (
            /* Links styled as tabs: each filter is a shareable URL. */
            <Link
              key={a.table || 'all'}
              href={buildUrl({ table: a.table, page: '' })}
              aria-current={tableName === a.table ? 'page' : undefined}
              className="whitespace-nowrap"
            >
              {a.label}
            </Link>
          ))}
        </nav>
      </header>

      <div className="surface flex min-h-0 flex-1 flex-col overflow-hidden">
        {actor && (
          <div className="flex shrink-0 items-center gap-2 border-b px-4 py-2.5" style={{ borderColor: 'var(--rule-faint)' }}>
            <span
              className="inline-flex h-6.5 items-center gap-1.5 rounded-full border pl-2.5 pr-1 text-[12px]"
              style={{ borderColor: 'var(--rule)', background: 'var(--paper-sunken)', color: 'var(--ink-secondary)' }}
            >
              <span style={{ color: 'var(--ink-faint)' }}>By</span>
              <span className="font-medium">{actor}</span>
              <Link
                href={buildUrl({ actor: '' })}
                aria-label="Clear person filter"
                className="flex h-4.5 w-4.5 items-center justify-center rounded-full transition-colors hover:bg-[var(--paper-hover)]"
                style={{ color: 'var(--ink-faint)' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="h-2.5 w-2.5" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </Link>
            </span>
          </div>
        )}

        {missing && (
          <div
            className="shrink-0 border-b px-4 py-3 text-[12.5px]"
            style={{ borderColor: 'var(--signal-warn-rule)', background: 'var(--signal-warn-soft)', color: 'var(--tone-warn-ink)' }}
          >
            The <code className="mono text-[11.5px]">dashboard_audit</code> table does not exist yet. Run the
            migration to enable audit logging.
          </div>
        )}

        {/* ── Log ───────────────────────────────────────────────────────── */}
        <div className="min-h-0 flex-1 overflow-auto">
          {logs.length === 0 && !missing ? (
            <EmptyState
              title="No changes recorded"
              description={actor || tableName ? 'Nothing matches this filter.' : 'Changes appear here as people edit settings, templates and journeys.'}
            />
          ) : (
            <table className="data-table min-w-155">
              <thead>
                <tr>
                  <th className="w-48">When</th>
                  <th className="w-44">Who</th>
                  <th>What changed</th>
                  <th className="hidden w-28 text-right md:table-cell">Record</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const area = AREA_LABEL[log.table_name] ?? (log.table_name ? stageLabel(log.table_name) : null)
                  const leadLink = log.row_id && (log.table_name === 'journeys' || log.table_name === 'leads')
                  return (
                    <tr key={log.id}>
                      <td><Timestamp iso={log.occurred_at} inline /></td>
                      <td>
                        <Link href={buildUrl({ actor: log.actor, page: '' })} className="link-subtle text-[13px]" title={`Show changes by ${log.actor}`}>
                          {log.actor}
                        </Link>
                      </td>
                      <td className="max-w-xl">
                        <div className="flex flex-wrap items-center gap-x-2">
                          <span className="text-[13px] font-medium" style={{ color: 'var(--ink)' }} title={log.action}>
                            {stageLabel(log.action)}
                          </span>
                          {area && (
                            <span className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>in {area}</span>
                          )}
                        </div>
                        {log.note && (
                          <p className="mt-0.5 line-clamp-2 text-[12.5px]" style={{ color: 'var(--ink-muted)' }} title={log.note}>
                            {log.note}
                          </p>
                        )}
                      </td>
                      <td className="hidden text-right md:table-cell">
                        {leadLink ? (
                          <Link href={`/leads/${log.row_id}`} className="link text-[12.5px]">Open lead</Link>
                        ) : log.row_id ? (
                          <span className="mono text-[11px]" style={{ color: 'var(--ink-faint)' }} title={String(log.row_id)}>
                            {String(log.row_id).slice(0, 8)}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--ink-faint)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Same footer as the shared Pagination, but with links so pages are URLs. */}
        {totalPages > 1 && (
          <div
            className="flex shrink-0 items-center justify-between gap-3 border-t px-4 py-2.5"
            style={{ borderColor: 'var(--rule-faint)', background: 'var(--paper-sunken)' }}
          >
            <p className="text-[12px]" style={{ color: 'var(--ink-muted)' }}>
              <span className="tabular font-medium" style={{ color: 'var(--ink-secondary)' }}>
                {((page - 1) * pageSize + 1).toLocaleString()}–{Math.min(page * pageSize, total).toLocaleString()}
              </span>
              {' of '}
              <span className="tabular font-medium" style={{ color: 'var(--ink-secondary)' }}>{total.toLocaleString()}</span>
            </p>
            <div className="flex items-center gap-1.5">
              <span className="tabular mr-1 hidden text-[12px] sm:inline" style={{ color: 'var(--ink-faint)' }}>
                Page {page} of {totalPages}
              </span>
              {page > 1 ? (
                <Link href={buildUrl({ page: String(page - 1) })} className="btn btn-quiet h-7 px-2.5" aria-label="Previous page">
                  <Chevron d="M15 18l-6-6 6-6" /> Prev
                </Link>
              ) : (
                <span className="btn btn-quiet h-7 px-2.5 opacity-45" aria-disabled="true"><Chevron d="M15 18l-6-6 6-6" /> Prev</span>
              )}
              {page < totalPages ? (
                <Link href={buildUrl({ page: String(page + 1) })} className="btn btn-quiet h-7 px-2.5" aria-label="Next page">
                  Next <Chevron d="M9 18l6-6-6-6" />
                </Link>
              ) : (
                <span className="btn btn-quiet h-7 px-2.5 opacity-45" aria-disabled="true">Next <Chevron d="M9 18l6-6-6-6" /></span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
