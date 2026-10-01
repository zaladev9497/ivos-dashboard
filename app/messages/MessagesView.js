'use client'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import Badge from '@/components/Badge'
import Timestamp from '@/components/Timestamp'
import Pagination from '@/components/Pagination'
import EmptyState from '@/components/EmptyState'
import AdvanceButton from '@/components/AdvanceButton'
import { formatDayFull, relativeTime, templateLabel } from '@/lib/utils'

export default function MessagesView({ tab, sentResult, scheduledResult, page, filters, fetchError, demoMode, demoPollInterval }) {
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


  // Group the current page of entries by lead, keeping the newest-activity-first order
  const groups = []
  {
    const byKey = new Map()
    for (const m of messages) {
      const key = m.lead_id ?? 'none'
      let g = byKey.get(key)
      if (!g) {
        g = { key, leadId: m.lead_id, name: m.leads?.full_name || m.lead_id || 'No lead', hasTest: false, items: [] }
        byKey.set(key, g)
        groups.push(g)
      }
      if (m.is_test) g.hasTest = true
      g.items.push(m)
    }
  }
  const [expanded, setExpanded] = useState(() => new Set())
  function toggleGroup(key) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }
  const field = 'h-8 rounded border border-slate-200 bg-white px-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-slate-400'
  const th = 'px-3 py-1.5 text-left font-medium'
  const td = 'px-3 py-1.5'
  const thead = 'sticky top-0 z-10 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 shadow-[inset_0_-1px_0] shadow-slate-200'

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5">
      {!isSent && demoMode && <AdvanceButton pollIntervalSeconds={demoPollInterval} />}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-slate-200 bg-white">
        {/* Toolbar */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2">
          <div className="flex rounded bg-slate-100 p-0.5">
            {['sent', 'scheduled'].map((t) => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                className={`rounded px-3 py-1 text-[13px] font-medium capitalize transition-colors ${
                  tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {isSent ? (
            <>
              <select value={localFilters.direction} onChange={(e) => setFilter('direction', e.target.value)} aria-label="Direction" className={field}>
                <option value="">All directions</option>
                <option value="inbound">Inbound</option>
                <option value="outbound">Outbound</option>
              </select>
              <select value={localFilters.deliveryStatus} onChange={(e) => setFilter('deliveryStatus', e.target.value)} aria-label="Delivery status" className={field}>
                <option value="">All statuses</option>
                <option value="delivered">Delivered</option>
                <option value="failed">Failed</option>
                <option value="sent">Sent</option>
                <option value="undelivered">Undelivered</option>
              </select>
              <input
                type="text"
                value={localFilters.purpose}
                onChange={(e) => setFilter('purpose', e.target.value)}
                placeholder="Purpose, e.g. quote_follow_up"
                aria-label="Purpose"
                className={`${field} w-52`}
              />
            </>
          ) : (
            <>
              <select value={localFilters.state} onChange={(e) => setFilter('state', e.target.value)} aria-label="State" className={field}>
                <option value="">All states</option>
                <option value="pending">Pending</option>
                <option value="sent">Sent</option>
                <option value="cancelled">Cancelled</option>
                <option value="suppressed">Suppressed</option>
                <option value="failed">Failed</option>
                <option value="skipped">Skipped</option>
              </select>
              <select value={localFilters.channel} onChange={(e) => setFilter('channel', e.target.value)} aria-label="Channel" className={field}>
                <option value="">All channels</option>
                <option value="sms">SMS</option>
                <option value="task">Task</option>
                <option value="internal">Internal</option>
              </select>
            </>
          )}
          <label className="flex cursor-pointer items-center gap-1.5 text-[13px] text-slate-600">
            <input
              type="checkbox"
              checked={localFilters.showTest}
              onChange={(e) => setFilter('showTest', e.target.checked)}
            />
            Test records
          </label>
          <span className="ml-auto text-xs tabular-nums text-slate-500">
            {result.total} message{result.total !== 1 ? 's' : ''}
          </span>
        </div>

        {fetchError && (
          <div className="shrink-0 border-b border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{fetchError}</div>
        )}

        {/* Scrollable table grouped by lead, sticky header */}
        <div className="min-h-0 flex-1 overflow-auto">
          {messages.length === 0 ? (
            <EmptyState title="No messages" description="Try adjusting your filters." />
          ) : (
            <table className="w-full min-w-[560px] text-[13px]">
              <thead className={thead}>
                {isSent ? (
                  <tr>
                    <th className={`${th} w-24`}>Direction</th>
                    <th className={th}>Body</th>
                    <th className={`${th} w-40`}>Status</th>
                    <th className={`${th} hidden w-52 lg:table-cell`}>Last sent</th>
                  </tr>
                ) : (
                  <tr>
                    <th className={th}>Template</th>
                    <th className={`${th} hidden w-24 sm:table-cell`}>Channel</th>
                    <th className={`${th} w-28`}>State</th>
                    <th className={`${th} hidden lg:table-cell`}>Reason</th>
                    <th className={`${th} hidden w-52 md:table-cell`}>Scheduled for</th>
                  </tr>
                )}
              </thead>
              {groups.map((g) => {
                const open = expanded.has(g.key)
                const cols = isSent ? 4 : 5
                return (
                  <tbody key={g.key} className="border-b border-slate-200">
                    <tr
                      onClick={() => toggleGroup(g.key)}
                      className="cursor-pointer select-none bg-slate-50 hover:bg-slate-100"
                    >
                      <td colSpan={cols - 1} className="px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleGroup(g.key) }}
                            aria-label={open ? 'Collapse' : 'Expand'}
                            aria-expanded={open}
                            className="-ml-1 rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                          >
                            <svg
                              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                              strokeLinecap="round" strokeLinejoin="round"
                              className={`h-3 w-3 transition-transform ${open ? 'rotate-90' : ''}`}
                              aria-hidden="true"
                            >
                              <path d="M9 6l6 6-6 6" />
                            </svg>
                          </button>
                          {g.leadId ? (
                            <Link
                              href={`/leads/${g.leadId}`}
                              onClick={(e) => e.stopPropagation()}
                              className="font-semibold text-slate-800 hover:text-blue-600"
                            >
                              {g.name}
                            </Link>
                          ) : (
                            <span className="font-semibold text-slate-500">{g.name}</span>
                          )}
                          <span className="rounded-full bg-slate-200 px-1.5 text-[11px] font-medium tabular-nums text-slate-600">
                            {g.items.length}
                          </span>
                        </div>
                      </td>
                      <td className={`${td} ${isSent ? "hidden lg:table-cell" : "hidden md:table-cell"}`}>
                        <Timestamp iso={isSent ? g.items[0].sent_at : g.items[0].scheduled_for} inline />
                      </td>
                    </tr>

                    {open && isSent && g.items.map((m) => (
                      <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className={`${td} pl-8`}>
                          <div className="flex items-center gap-1">
                            <Badge label={m.direction} status={m.direction} />
                            {m.is_test && <Badge label="test" status="test" />}
                          </div>
                        </td>
                        <td className={`${td} max-w-md`}>
                          <p className="truncate text-slate-700" title={m.body}>{m.body}</p>
                          {m.purpose && <span className="text-[11px] text-slate-400">{m.purpose}</span>}
                        </td>
                        <td className={td}>
                          <Badge label={m.delivery_status ?? '—'} status={m.delivery_status} />
                          {m.error_message && (
                            <p className="mt-0.5 max-w-xs truncate text-[11px] text-red-500" title={m.error_message}>
                              {m.error_message}
                            </p>
                          )}
                        </td>
                        <td className={`${td} hidden lg:table-cell`}>
                          <Timestamp iso={m.sent_at} inline />
                        </td>
                      </tr>
                    ))}

                    {open && !isSent && g.items.map((m) => (
                      <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className={`${td} pl-8`}>
                          <span className="text-[13px] text-slate-700" title={m.template_key}>{templateLabel(m.template_key)}</span>
                          {m.is_test && <Badge label="test" status="test" className="ml-1.5" />}
                        </td>
                        <td className={`${td} hidden sm:table-cell`}>
                          <Badge label={m.channel} status={m.channel} />
                        </td>
                        <td className={td}>
                          <Badge label={m.state} status={m.state} />
                        </td>
                        <td className={`${td} hidden max-w-xs text-xs text-slate-500 lg:table-cell`}>
                          <p className="truncate">{m.suppression_reason || m.error_message || '—'}</p>
                        </td>
                        <td className={`${td} hidden md:table-cell`}>
                          {m.context?.demo ? (
                            <div className="leading-tight">
                              <span className="block text-xs font-medium text-violet-600">{relativeTime(m.scheduled_for)}</span>
                              {m.context.production_due && (
                                <span className="block text-[10px] text-slate-400">Prod: {formatDayFull(m.context.production_due)}</span>
                              )}
                            </div>
                          ) : (
                            <Timestamp iso={m.scheduled_for} inline />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                )
              })}
            </table>
          )}
        </div>

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
