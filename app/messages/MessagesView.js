'use client'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import Badge from '@/components/Badge'
import Timestamp from '@/components/Timestamp'
import Pagination from '@/components/Pagination'
import EmptyState from '@/components/EmptyState'

export default function MessagesView({ tab, sentResult, scheduledResult, page, filters, fetchError }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [localFilters, setLocalFilters] = useState(filters)

  function buildUrl(overrides = {}) {
    const p = new URLSearchParams()
    const s = { ...localFilters, tab, page, ...overrides }
    if (s.tab !== 'sent') p.set('tab', s.tab)
    if (s.direction) p.set('direction', s.direction)
    if (s.deliveryStatus) p.set('delivery_status', s.deliveryStatus)
    if (s.purpose) p.set('purpose', s.purpose)
    if (s.showTest) p.set('show_test', '1')
    if (s.state) p.set('state', s.state)
    if (s.channel) p.set('channel', s.channel)
    if (s.page > 1) p.set('page', String(s.page))
    return `/messages?${p.toString()}`
  }

  function setFilter(key, value) {
    const next = { ...localFilters, [key]: value }
    setLocalFilters(next)
    startTransition(() => router.push(buildUrl({ ...next, page: 1 })))
  }

  function switchTab(t) {
    startTransition(() => router.push(buildUrl({ tab: t, page: 1 })))
  }

  const isSent = tab === 'sent'
  const result = isSent ? sentResult : scheduledResult
  const messages = result.messages

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-slate-800">Messages</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {['sent', 'scheduled'].map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-slate-800 text-slate-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm flex flex-wrap gap-3 items-end">
        {isSent ? (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Direction</label>
              <select
                value={localFilters.direction}
                onChange={(e) => setFilter('direction', e.target.value)}
                className="rounded border border-slate-200 px-2.5 py-1.5 text-sm"
              >
                <option value="">All</option>
                <option value="inbound">Inbound</option>
                <option value="outbound">Outbound</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Delivery status</label>
              <select
                value={localFilters.deliveryStatus}
                onChange={(e) => setFilter('deliveryStatus', e.target.value)}
                className="rounded border border-slate-200 px-2.5 py-1.5 text-sm"
              >
                <option value="">All</option>
                <option value="delivered">Delivered</option>
                <option value="failed">Failed</option>
                <option value="sent">Sent</option>
                <option value="undelivered">Undelivered</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Purpose</label>
              <input
                type="text"
                value={localFilters.purpose}
                onChange={(e) => setFilter('purpose', e.target.value)}
                placeholder="e.g. quote_follow_up"
                className="rounded border border-slate-200 px-2.5 py-1.5 text-sm w-48"
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">State</label>
              <select
                value={localFilters.state}
                onChange={(e) => setFilter('state', e.target.value)}
                className="rounded border border-slate-200 px-2.5 py-1.5 text-sm"
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="sent">Sent</option>
                <option value="cancelled">Cancelled</option>
                <option value="suppressed">Suppressed</option>
                <option value="failed">Failed</option>
                <option value="skipped">Skipped</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Channel</label>
              <select
                value={localFilters.channel}
                onChange={(e) => setFilter('channel', e.target.value)}
                className="rounded border border-slate-200 px-2.5 py-1.5 text-sm"
              >
                <option value="">All</option>
                <option value="sms">SMS</option>
                <option value="task">Task</option>
                <option value="internal">Internal</option>
              </select>
            </div>
          </>
        )}
        <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer self-end pb-1.5">
          <input
            type="checkbox"
            checked={localFilters.showTest}
            onChange={(e) => setFilter('showTest', e.target.checked)}
          />
          Show test
        </label>
      </div>

      {fetchError && (
        <div className="rounded bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {fetchError}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100 text-sm text-slate-500">
          {result.total} message{result.total !== 1 ? 's' : ''}
        </div>

        {messages.length === 0 ? (
          <EmptyState title="No messages" description="Try adjusting your filters." />
        ) : isSent ? (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2 text-left">Lead</th>
                <th className="px-4 py-2 text-left">Direction</th>
                <th className="px-4 py-2 text-left">Body</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Sent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {messages.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    {m.lead_id ? (
                      <Link href={`/leads/${m.lead_id}`} className="text-blue-600 hover:underline">
                        {m.leads?.full_name || m.lead_id}
                      </Link>
                    ) : '—'}
                    {m.is_test && <Badge label="test" status="test" className="ml-1.5" />}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge label={m.direction} status={m.direction} />
                  </td>
                  <td className="px-4 py-2.5 max-w-xs">
                    <p className="truncate text-slate-700" title={m.body}>{m.body}</p>
                    {m.purpose && <span className="text-xs text-slate-400">{m.purpose}</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge label={m.delivery_status ?? '—'} status={m.delivery_status} />
                    {m.error_message && (
                      <p className="text-xs text-red-500 mt-0.5 max-w-xs truncate" title={m.error_message}>
                        {m.error_message}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <Timestamp iso={m.sent_at} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2 text-left">Lead</th>
                <th className="px-4 py-2 text-left">Template</th>
                <th className="px-4 py-2 text-left">Channel</th>
                <th className="px-4 py-2 text-left">State</th>
                <th className="px-4 py-2 text-left">Reason</th>
                <th className="px-4 py-2 text-left">Scheduled for</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {messages.map((m) => (
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
                  <td className="px-4 py-2.5">
                    <Badge label={m.state} status={m.state} />
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 max-w-xs">
                    {m.suppression_reason || m.error_message || '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <Timestamp iso={m.scheduled_for} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination
          page={page}
          total={result.total}
          pageSize={result.pageSize}
          onPage={(p) => startTransition(() => router.push(buildUrl({ page: p })))}
        />
      </div>
    </div>
  )
}
