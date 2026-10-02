import {
  getOpenExceptions,
  getFailedScheduledMessages,
  getDailyReports,
  getBusinessCalendar,
  getExceptionStats,
  safePage,
} from '@/lib/queries'
import Link from 'next/link'
import Badge from '@/components/Badge'
import Timestamp from '@/components/Timestamp'
import EmptyState from '@/components/EmptyState'
import ExceptionActions from './ExceptionActions'
import RetryButton from './RetryButton'
import { formatDate, templateLabel, formatDetail, stageLabel } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Operations' }

// working_days is an integer[] of ISO weekdays (1 = Monday ... 7 = Sunday).
const WEEKDAY_NAMES = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' }

function formatWorkingDays(days) {
  if (!Array.isArray(days) || days.length === 0) return 'None'
  return days
    .map(Number)
    .sort((a, b) => a - b)
    .map((d) => WEEKDAY_NAMES[d] ?? d)
    .join(', ')
}

// Severity is a text column, so the database sorts it alphabetically
// (medium, low, high). Rank it explicitly so high always comes first.
const SEVERITY_RANK = { high: 0, medium: 1, low: 2 }

function Section({ title, count, aside, children }) {
  return (
    <section className="surface overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: 'var(--rule-faint)' }}>
        <h2 className="text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>
          {title}
          {count != null && (
            <span className="tabular ml-2 font-normal" style={{ color: 'var(--ink-faint)' }}>{count}</span>
          )}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

// Severity summary: one strip, not three hoverable tiles. A count only takes
// colour when it is non-zero, so attention goes to what needs it.
function SeverityStrip({ stats }) {
  const items = [
    { key: 'high', label: 'High', tone: 'neg' },
    { key: 'medium', label: 'Medium', tone: 'warn' },
    { key: 'low', label: 'Low', tone: 'info' },
  ]
  return (
    <div className="surface grid grid-cols-3 divide-x divide-[var(--rule-faint)]">
      {items.map(({ key, label, tone }) => {
        const n = stats[key] ?? 0
        return (
          <div key={key} className="px-5 py-4">
            <div className="flex items-center gap-1.5 text-[12.5px]" style={{ color: 'var(--ink-muted)' }}>
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: n > 0 ? `var(--signal-${tone})` : 'var(--rule-strong)' }}
                aria-hidden="true"
              />
              {label} severity
            </div>
            <div
              className="stat-figure mt-1.5"
              style={{ color: n > 0 ? `var(--tone-${tone}-ink)` : 'var(--ink-faint)' }}
            >
              {n}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default async function OpsPage({ searchParams }) {
  const params = await searchParams
  const reportPage = safePage(params?.report_page)

  let exceptions = [], failedScheduled = [], reportsResult = { reports: [], total: 0, pageSize: 50 }
  let calendar = null, stats = { low: 0, medium: 0, high: 0 }
  let fetchError = null

  try {
    ;[exceptions, failedScheduled, reportsResult, calendar, stats] = await Promise.all([
      getOpenExceptions(),
      getFailedScheduledMessages(),
      getDailyReports({ page: reportPage }),
      getBusinessCalendar(),
      getExceptionStats(),
    ])
  } catch (e) {
    fetchError = e.message
  }

  const sortedExceptions = [...exceptions].sort(
    (a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9)
  )
  const needsAttention = exceptions.length + failedScheduled.length

  return (
    <div className="page rise" style={{ gap: '1.25rem' }}>
      <header className="page-head">
        <div>
          <h1 className="page-title">Operations</h1>
          <p className="page-lede">Exceptions, delivery failures and system health.</p>
        </div>
        <p className="pb-0.5 text-[12.5px]" style={{ color: needsAttention ? 'var(--ink-muted)' : 'var(--tone-pos-ink)' }}>
          {needsAttention ? (
            <>
              <span className="tabular font-semibold" style={{ color: 'var(--ink)' }}>{needsAttention}</span> item
              {needsAttention !== 1 ? 's' : ''} need attention
            </>
          ) : (
            'All clear'
          )}
        </p>
      </header>

      {fetchError && (
        <div
          className="rounded-[var(--radius)] border px-3.5 py-2.5 text-[12.5px]"
          style={{ borderColor: 'var(--signal-neg-rule)', background: 'var(--signal-neg-soft)', color: 'var(--tone-neg-ink)' }}
        >
          {fetchError}
        </div>
      )}

      <SeverityStrip stats={stats} />

      {/* ── Open exceptions ─────────────────────────────────────────────── */}
      <Section title="Open exceptions" count={exceptions.length}>
        {exceptions.length === 0 ? (
          <EmptyState title="No open exceptions" description="Everything is running clean." />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-180">
              <thead>
                <tr>
                  <th>Exception</th>
                  <th className="w-44">Lead</th>
                  <th className="w-28">Severity</th>
                  <th className="hidden w-44 lg:table-cell">First seen</th>
                  <th className="w-48 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedExceptions.map((exc) => (
                  <tr key={exc.id}>
                    <td className="max-w-md">
                      <div className="flex flex-wrap items-center gap-x-2">
                        <span className="text-[13px] font-medium" style={{ color: 'var(--ink)' }} title={exc.exception_type}>
                          {stageLabel(exc.exception_type)}
                        </span>
                        {exc.seen_count > 1 && (
                          <span className="tabular text-[12px]" style={{ color: 'var(--ink-faint)' }}>
                            seen {exc.seen_count}×
                          </span>
                        )}
                      </div>
                      {exc.summary && (
                        <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-relaxed" style={{ color: 'var(--ink-muted)' }} title={exc.summary}>
                          {exc.summary}
                        </p>
                      )}
                    </td>
                    <td>
                      {exc.lead_id ? (
                        <Link href={`/leads/${exc.lead_id}`} className="link-subtle">
                          {exc.leads?.full_name || 'Unnamed lead'}
                        </Link>
                      ) : (
                        <span style={{ color: 'var(--ink-faint)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <Badge label={stageLabel(exc.severity)} status={exc.severity} />
                      {exc.state === 'acknowledged' && (
                        <div className="mt-1 text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>Acknowledged</div>
                      )}
                    </td>
                    <td className="hidden lg:table-cell">
                      <Timestamp iso={exc.first_seen_at} />
                    </td>
                    <td>
                      <ExceptionActions id={exc.id} state={exc.state} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* ── Failed scheduled messages ───────────────────────────────────── */}
      <Section title="Failed messages" count={failedScheduled.length}>
        {failedScheduled.length === 0 ? (
          <EmptyState title="No failed messages" description="All scheduled messages are healthy." />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-180">
              <thead>
                <tr>
                  <th className="w-44">Lead</th>
                  <th>Message</th>
                  <th className="w-24">Attempts</th>
                  <th className="hidden w-44 lg:table-cell">Last attempt</th>
                  <th className="w-24 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {failedScheduled.map((m) => (
                  <tr key={m.id}>
                    <td>
                      {m.lead_id ? (
                        <Link href={`/leads/${m.lead_id}`} className="link-subtle">
                          {m.leads?.full_name || 'Unnamed lead'}
                        </Link>
                      ) : (
                        <span style={{ color: 'var(--ink-faint)' }}>—</span>
                      )}
                    </td>
                    <td className="max-w-md">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px]" style={{ color: 'var(--ink)' }} title={m.template_key}>
                          {templateLabel(m.template_key)}
                        </span>
                        <span className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>
                          {m.channel === 'sms' ? 'SMS' : stageLabel(m.channel)}
                        </span>
                      </div>
                      {m.error_message && (
                        <p className="mono mt-0.5 truncate text-[11.5px]" style={{ color: 'var(--tone-neg-ink)' }} title={m.error_message}>
                          {m.error_message}
                        </p>
                      )}
                    </td>
                    <td className="tabular text-[12.5px]" style={{ color: 'var(--ink-muted)' }}>
                      {m.attempts}
                    </td>
                    <td className="hidden lg:table-cell">
                      <Timestamp iso={m.last_attempt_at} />
                    </td>
                    <td className="text-right">
                      <RetryButton id={m.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* ── Daily reports ───────────────────────────────────────────────── */}
        <Section title="Daily reports" count={reportsResult.total}>
          {reportsResult.reports.length === 0 ? (
            <EmptyState title="No reports yet" description="Daily reports appear here once they are generated." />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-28">Date</th>
                    <th>Report</th>
                    <th className="w-28">Status</th>
                    <th className="w-16 text-right">Items</th>
                  </tr>
                </thead>
                <tbody>
                  {reportsResult.reports.map((r, i) => (
                    <tr key={i}>
                      <td className="tabular whitespace-nowrap text-[12.5px]" style={{ color: 'var(--ink)' }}>
                        {r.report_date}
                      </td>
                      <td className="max-w-md">
                        <span className="text-[13px]" style={{ color: 'var(--ink-secondary)' }} title={r.report_type}>
                          {stageLabel(r.report_type)}
                        </span>
                        {formatDetail(r.detail) && (
                          <p className="truncate text-[12px]" style={{ color: 'var(--ink-faint)' }} title={formatDetail(r.detail)}>
                            {formatDetail(r.detail)}
                          </p>
                        )}
                      </td>
                      <td>
                        <Badge label={stageLabel(r.status)} status={r.status} />
                      </td>
                      <td className="tabular text-right text-[12.5px]" style={{ color: 'var(--ink-muted)' }}>
                        {r.item_count ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* ── Business calendar: a read-out, edited in Settings ───────────── */}
        {calendar && (
          <Section
            title="Business calendar"
            aside={<Link href="/settings" className="link text-[12.5px]">Edit</Link>}
          >
            <dl className="px-4 py-2.5">
              {[
                ['Timezone', calendar.timezone],
                ['Hours', `${String(calendar.open_time).slice(0, 5)} – ${String(calendar.close_time).slice(0, 5)}`],
                ['Working days', formatWorkingDays(calendar.working_days)],
                ['Quote validity', `${calendar.quote_validity_days} days`],
                ['SMS redirect', calendar.sms_redirect_to || 'Off'],
                ['Cadence live from', calendar.cadence_live_from ? formatDate(calendar.cadence_live_from) : '—'],
              ].map(([label, value]) => (
                <div key={label} className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 py-1.5">
                  <dt className="text-[12px]" style={{ color: 'var(--ink-muted)' }}>{label}</dt>
                  <dd className="text-[13px]" style={{ color: 'var(--ink)' }}>{value}</dd>
                </div>
              ))}
            </dl>
          </Section>
        )}
      </div>
    </div>
  )
}
