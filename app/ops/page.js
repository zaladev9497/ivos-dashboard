import {
  getOpenExceptions,
  getFailedScheduledMessages,
  getDailyReports,
  getBusinessCalendar,
  getExceptionStats,
} from '@/lib/queries'
import Link from 'next/link'
import Badge from '@/components/Badge'
import Timestamp from '@/components/Timestamp'
import EmptyState from '@/components/EmptyState'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function SectionHeader({ title, count }) {
  return (
    <div className="border-b border-slate-100 px-4 py-2.5 flex items-center justify-between">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</span>
      {count != null && (
        <span className="text-xs font-bold text-slate-700">{count}</span>
      )}
    </div>
  )
}

export default async function OpsPage({ searchParams }) {
  const params = await searchParams
  const reportPage = parseInt(params?.report_page ?? '1', 10)

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
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-800">Operations</h1>

      {fetchError && (
        <div className="rounded bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {fetchError}
        </div>
      )}

      {/* Test mode banner */}
      {isTestMode && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Test mode is active.</strong>
          {calendar.sms_redirect_to && (
            <> All SMS redirected to <code className="font-mono">{calendar.sms_redirect_to}</code>.</>
          )}
          {calendar.test_only && <> <code className="font-mono">test_only</code> flag is set.</>}
        </div>
      )}

      {/* Exception stats */}
      <div className="grid grid-cols-3 gap-3">
        {[['high', stats.high], ['medium', stats.medium], ['low', stats.low]].map(([sev, count]) => (
          <div key={sev} className="rounded-lg border border-slate-200 bg-white shadow-sm px-4 py-3 text-center">
            <div className="text-2xl font-bold text-slate-800">{count}</div>
            <Badge label={sev} status={sev} className="mt-1" />
          </div>
        ))}
      </div>

      {/* Open exceptions */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        <SectionHeader title="Open exceptions" count={exceptions.length} />
        {exceptions.length === 0 ? (
          <EmptyState title="No open exceptions" description="Everything looks clean." />
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Lead</th>
                <th className="px-4 py-2 text-left">Severity</th>
                <th className="px-4 py-2 text-left">Summary</th>
                <th className="px-4 py-2 text-left">State</th>
                <th className="px-4 py-2 text-left">First seen</th>
                <th className="px-4 py-2 text-left">Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {exceptions.map((exc) => (
                <tr key={exc.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{exc.exception_type}</td>
                  <td className="px-4 py-2.5">
                    {exc.lead_id ? (
                      <Link href={`/leads/${exc.lead_id}`} className="text-blue-600 hover:underline text-xs">
                        {exc.lead_id}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge label={exc.severity} status={exc.severity} />
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 text-xs max-w-sm">
                    <p className="truncate" title={exc.summary}>{exc.summary}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge label={exc.state} status={exc.state === 'acknowledged' ? 'medium' : 'failed'} />
                  </td>
                  <td className="px-4 py-2.5">
                    <Timestamp iso={exc.first_seen_at} />
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 text-xs">{exc.seen_count}×</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Failed scheduled messages */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        <SectionHeader title="Failed scheduled messages" count={failedScheduled.length} />
        {failedScheduled.length === 0 ? (
          <EmptyState title="No failed messages" description="All scheduled messages are healthy." />
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2 text-left">Lead</th>
                <th className="px-4 py-2 text-left">Template</th>
                <th className="px-4 py-2 text-left">Channel</th>
                <th className="px-4 py-2 text-left">Error</th>
                <th className="px-4 py-2 text-left">Attempts</th>
                <th className="px-4 py-2 text-left">Last attempt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {failedScheduled.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    {m.lead_id ? (
                      <Link href={`/leads/${m.lead_id}`} className="text-blue-600 hover:underline">
                        {m.leads?.full_name || m.lead_id}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{m.template_key}</td>
                  <td className="px-4 py-2.5">
                    <Badge label={m.channel} status={m.channel} />
                  </td>
                  <td className="px-4 py-2.5 text-xs text-red-600 max-w-xs">
                    <p className="truncate" title={m.error_message}>{m.error_message || '—'}</p>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 text-xs">{m.attempts}</td>
                  <td className="px-4 py-2.5">
                    <Timestamp iso={m.last_attempt_at} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Business calendar */}
      {calendar && (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
          <SectionHeader title="Business calendar" />
          <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-xs text-slate-400">Timezone</dt>
              <dd className="text-slate-800">{calendar.timezone}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Hours</dt>
              <dd className="text-slate-800">{calendar.open_time} – {calendar.close_time}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Working days</dt>
              <dd className="text-slate-800">{(calendar.working_days ?? []).join(', ')}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Cadence live from</dt>
              <dd className="text-slate-800">{formatDate(calendar.cadence_live_from)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">SMS redirect</dt>
              <dd className="text-slate-800 font-mono text-xs">{calendar.sms_redirect_to || 'none'}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Quote validity</dt>
              <dd className="text-slate-800">{calendar.quote_validity_days} days</dd>
            </div>
          </div>
        </div>
      )}

      {/* Daily reports */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        <SectionHeader title="Daily reports" count={reportsResult.total} />
        {reportsResult.reports.length === 0 ? (
          <EmptyState title="No reports yet" description="Daily reports appear here once they're generated." />
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Items</th>
                <th className="px-4 py-2 text-left">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportsResult.reports.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-700">{r.report_date}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{r.report_type}</td>
                  <td className="px-4 py-2.5">
                    <Badge label={r.status} status={r.status} />
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{r.item_count ?? '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 max-w-xs">
                    <p className="truncate" title={r.detail}>{r.detail || '—'}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
