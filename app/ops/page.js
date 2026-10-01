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
import { formatDate, templateLabel, formatDetail } from '@/lib/utils'

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

function SectionHeader({ title, count }) {
  return (
    <div className="section-head">
      <span className="eyebrow">{title}</span>
      {count != null && <span className="counter">{count}</span>}
    </div>
  )
}

// Severity tiles. The figure is the hero, set in the display face; the label
// sits beneath in small caps — a printed-report convention rather than a
// coloured stat box. A zero greys out so attention goes to what is non-zero.
function StatTile({ severity, count, tone }) {
  return (
    <div className="surface card-interactive relative overflow-hidden px-5 py-5">
      <span
        className="absolute inset-y-0 left-0 w-0.75"
        style={{ background: count > 0 ? `var(--signal-${tone})` : 'var(--rule)' }}
        aria-hidden="true"
      />
      <div
        className="stat-figure"
        style={{ color: count > 0 ? `var(--tone-${tone}-ink)` : 'var(--ink-faint)' }}
      >
        {count}
      </div>
      <div className="eyebrow mt-1.5">{severity} severity</div>
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

  const isTestMode = !!(calendar?.sms_redirect_to || calendar?.test_only)

  return (
    <div className="page rise">
      <header className="page-head">
        <div>
          <h1 className="page-title">Operations</h1>
          <p className="page-lede">Exceptions, delivery failures and system health.</p>
        </div>
      </header>

      {fetchError && (
        <div
          className="rounded-[7px] border px-3.5 py-2.5 text-[12.5px]"
          style={{
            borderColor: 'var(--signal-neg-rule)',
            background: 'var(--signal-neg-soft)',
            color: 'var(--tone-neg-ink)',
          }}
        >
          {fetchError}
        </div>
      )}

      {isTestMode && (
        <div
          className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[7px] border px-3.5 py-2.5 text-[12.5px]"
          style={{
            borderColor: 'var(--signal-warn-rule)',
            background: 'var(--signal-warn-soft)',
            color: 'var(--tone-warn-ink)',
          }}
        >
          <strong className="font-semibold">Test mode is active.</strong>
          {calendar.sms_redirect_to && (
            <span>
              All SMS redirected to <code className="mono text-[11.5px]">{calendar.sms_redirect_to}</code>.
            </span>
          )}
          {calendar.test_only && (
            <span>
              <code className="mono text-[11.5px]">test_only</code> flag is set.
            </span>
          )}
        </div>
      )}

      {/* ── Exception severity ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile severity="High" count={stats.high} tone="neg" />
        <StatTile severity="Medium" count={stats.medium} tone="warn" />
        <StatTile severity="Low" count={stats.low} tone="info" />
      </div>

      {/* ── Open exceptions ─────────────────────────────────────────────── */}
      <section className="surface overflow-hidden">
        <SectionHeader title="Open exceptions" count={exceptions.length} />
        {exceptions.length === 0 ? (
          <EmptyState title="No open exceptions" description="Everything is running clean." />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Lead</th>
                  <th>Severity</th>
                  <th>Summary</th>
                  <th>State</th>
                  <th>First seen</th>
                  <th>Seen</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {exceptions.map((exc) => (
                  <tr key={exc.id}>
                    <td className="mono text-[11.5px]" style={{ color: 'var(--ink-muted)' }}>
                      {exc.exception_type}
                    </td>
                    <td>
                      {exc.lead_id ? (
                        <Link href={`/leads/${exc.lead_id}`} className="link mono text-[11.5px]">
                          {exc.lead_id.slice(0, 8)}
                        </Link>
                      ) : (
                        <span style={{ color: 'var(--ink-faint)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <Badge label={exc.severity} status={exc.severity} />
                    </td>
                    <td className="max-w-sm">
                      <p className="truncate text-[12.5px]" title={exc.summary}>
                        {exc.summary}
                      </p>
                    </td>
                    <td>
                      <Badge
                        label={exc.state}
                        status={exc.state === 'acknowledged' ? 'acknowledged' : 'open'}
                      />
                    </td>
                    <td>
                      <Timestamp iso={exc.first_seen_at} />
                    </td>
                    <td className="tabular text-[12px]" style={{ color: 'var(--ink-muted)' }}>
                      {exc.seen_count}×
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
      </section>

      {/* ── Failed scheduled messages ───────────────────────────────────── */}
      <section className="surface overflow-hidden">
        <SectionHeader title="Failed scheduled messages" count={failedScheduled.length} />
        {failedScheduled.length === 0 ? (
          <EmptyState title="No failed messages" description="All scheduled messages are healthy." />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Template</th>
                  <th>Channel</th>
                  <th>Error</th>
                  <th>Attempts</th>
                  <th>Last attempt</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {failedScheduled.map((m) => (
                  <tr key={m.id}>
                    <td>
                      {m.lead_id ? (
                        <Link href={`/leads/${m.lead_id}`} className="link-subtle">
                          {m.leads?.full_name || m.lead_id.slice(0, 8)}
                        </Link>
                      ) : (
                        <span style={{ color: 'var(--ink-faint)' }}>—</span>
                      )}
                    </td>
                    <td className="text-[12.5px]" title={m.template_key}>
                      {templateLabel(m.template_key)}
                    </td>
                    <td>
                      <Badge label={m.channel} status={m.channel} />
                    </td>
                    <td className="max-w-xs">
                      <p
                        className="mono truncate text-[11.5px]"
                        style={{ color: 'var(--signal-neg)' }}
                        title={m.error_message}
                      >
                        {m.error_message || '—'}
                      </p>
                    </td>
                    <td className="tabular text-[12px]" style={{ color: 'var(--ink-muted)' }}>
                      {m.attempts}
                    </td>
                    <td>
                      <Timestamp iso={m.last_attempt_at} />
                    </td>
                    <td>
                      <RetryButton id={m.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Business calendar ───────────────────────────────────────────── */}
      {calendar && (
        <section className="surface overflow-hidden">
          <SectionHeader title="Business calendar" />
          <dl className="grid grid-cols-2 gap-x-8 gap-y-6 px-5 py-5 sm:grid-cols-3">
            {[
              ['Timezone', calendar.timezone],
              ['Hours', `${calendar.open_time} – ${calendar.close_time}`],
              ['Working days', formatWorkingDays(calendar.working_days)],
              ['Cadence live from', formatDate(calendar.cadence_live_from)],
              ['SMS redirect', calendar.sms_redirect_to || 'none'],
              ['Quote validity', `${calendar.quote_validity_days} days`],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="eyebrow">{label}</dt>
                <dd className="mt-1 text-[13px]" style={{ color: 'var(--ink)' }}>
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* ── Daily reports ───────────────────────────────────────────────── */}
      <section className="surface overflow-hidden">
        <SectionHeader title="Daily reports" count={reportsResult.total} />
        {reportsResult.reports.length === 0 ? (
          <EmptyState title="No reports yet" description="Daily reports appear here once they are generated." />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Items</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {reportsResult.reports.map((r, i) => (
                  <tr key={i}>
                    <td className="tabular text-[12.5px]" style={{ color: 'var(--ink)' }}>
                      {r.report_date}
                    </td>
                    <td className="mono text-[11.5px]" style={{ color: 'var(--ink-muted)' }}>
                      {r.report_type}
                    </td>
                    <td>
                      <Badge label={r.status} status={r.status} />
                    </td>
                    <td className="tabular text-[12.5px]" style={{ color: 'var(--ink-muted)' }}>
                      {r.item_count ?? '—'}
                    </td>
                    <td className="max-w-xs">
                      <p
                        className="truncate text-[12px]"
                        style={{ color: 'var(--ink-muted)' }}
                        title={formatDetail(r.detail)}
                      >
                        {formatDetail(r.detail) || '—'}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
