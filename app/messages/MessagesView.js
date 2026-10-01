'use client'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
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

  // Free-text filters update the box instantly but only query the database once typing pauses.
  const debounceRef = useRef(null)
  function setFilterDebounced(key, value) {
    const next = { ...localFilters, [key]: value }
    setLocalFilters(next)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      startTransition(() => router.push(buildUrl({ ...next, page: 1 })))
    }, 400)
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
  const field = 'field'

  return (
    <div className="rise flex min-h-0 flex-1 flex-col gap-4">
      {!isSent && demoMode && <AdvanceButton pollIntervalSeconds={demoPollInterval} />}

      <div className="surface flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Toolbar */}
        <div
          className="flex shrink-0 flex-wrap items-center gap-2.5 border-b px-5 py-3.5"
          style={{ borderColor: 'var(--rule-faint)' }}
        >
          {/* Segmented control — the raised pill marks the live tab. */}
          <div
            className="flex gap-0.5 rounded-[6px] p-[3px]"
            style={{ background: 'var(--paper-sunken)', border: '1px solid var(--rule-faint)' }}
          >
            {['sent', 'scheduled'].map((t) => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                aria-pressed={tab === t}
                className="rounded-[4px] px-3 py-[3px] text-[12.5px] font-medium capitalize transition-colors"
                style={
                  tab === t
                    ? { background: 'var(--paper-raised)', color: 'var(--ink)', boxShadow: 'var(--lift-flat)' }
                    : { color: 'var(--ink-muted)' }
                }
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
                onChange={(e) => setFilterDebounced('purpose', e.target.value)}
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
          <label
            className="btn h-8 cursor-pointer select-none px-2.5"
            style={{
              background: localFilters.showTest ? 'var(--accent-soft)' : 'var(--paper-raised)',
              border: `1px solid ${localFilters.showTest ? 'var(--accent-rule)' : 'var(--rule)'}`,
              color: localFilters.showTest ? 'var(--accent-ink)' : 'var(--ink-muted)',
              boxShadow: 'var(--lift-flat)',
            }}
          >
            <input
              type="checkbox"
              checked={localFilters.showTest}
              onChange={(e) => setFilter('showTest', e.target.checked)}
              className="sr-only"
            />
            <span
              className="flex h-3.5 w-3.5 items-center justify-center rounded-[4px] border transition-colors"
              style={{
                borderColor: localFilters.showTest ? 'var(--accent)' : 'var(--rule-strong)',
                background: localFilters.showTest ? 'var(--accent)' : 'transparent',
              }}
              aria-hidden="true"
            >
              {localFilters.showTest && (
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--paper-raised)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </span>
            Test records
          </label>
          <span className="eyebrow ml-auto">
            <span className="tabular" style={{ color: 'var(--ink-secondary)' }}>{result.total.toLocaleString()}</span>
            {' '}message{result.total !== 1 ? 's' : ''}
          </span>
        </div>

        {fetchError && (
          <div
            className="shrink-0 border-b px-5 py-3 text-[12.5px]"
            style={{ borderColor: 'var(--signal-neg-rule)', background: 'var(--signal-neg-soft)', color: 'var(--tone-neg-ink)' }}
          >
            {fetchError}
          </div>
        )}

        {/* Scrollable table grouped by lead, sticky header */}
        <div className="min-h-0 flex-1 overflow-auto">
          {messages.length === 0 ? (
            <EmptyState title="No messages" description="Try adjusting your filters." />
          ) : (
            <table className="data-table min-w-155">
              <thead>
                {isSent ? (
                  <tr>
                    <th className="w-24">Direction</th>
                    <th>Body</th>
                    <th className="w-40">Status</th>
                    <th className="hidden w-52 lg:table-cell">Last sent</th>
                  </tr>
                ) : (
                  <tr>
                    <th>Template</th>
                    <th className="hidden w-24 sm:table-cell">Channel</th>
                    <th className="w-28">State</th>
                    <th className="hidden lg:table-cell">Reason</th>
                    <th className="hidden w-52 md:table-cell">Scheduled for</th>
                  </tr>
                )}
              </thead>
              {groups.map((g) => {
                const open = expanded.has(g.key)
                const cols = isSent ? 4 : 5
                return (
                  <tbody key={g.key}>
                    <tr
                      onClick={() => toggleGroup(g.key)}
                      className="cursor-pointer select-none"
                      style={{ background: 'var(--paper-sunken)' }}
                    >
                      <td colSpan={cols - 1}>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleGroup(g.key) }}
                            aria-label={open ? 'Collapse' : 'Expand'}
                            aria-expanded={open}
                            className="btn btn-ghost -ml-1 h-5 w-5 p-0!"
                          >
                            <svg
                              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                              strokeLinecap="round" strokeLinejoin="round"
                              className={`h-3.5 w-3.5 transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
                              aria-hidden="true"
                            >
                              <path d="M9 6l6 6-6 6" />
                            </svg>
                          </button>
                          {g.leadId ? (
                            <Link
                              href={`/leads/${g.leadId}`}
                              onClick={(e) => e.stopPropagation()}
                              className="link-subtle"
                            >
                              {g.name}
                            </Link>
                          ) : (
                            <span className="font-semibold" style={{ color: 'var(--ink-muted)' }}>{g.name}</span>
                          )}
                          <span className="counter">{g.items.length}</span>
                        </div>
                      </td>
                      <td className={isSent ? 'hidden lg:table-cell' : 'hidden md:table-cell'} style={{ background: 'var(--paper-sunken)' }}>
                        <Timestamp iso={isSent ? g.items[0].sent_at : g.items[0].scheduled_for} inline />
                      </td>
                    </tr>

                    {open && isSent && g.items.map((m) => (
                      <tr key={m.id}>
                        <td className="pl-9!">
                          <div className="flex items-center gap-1.5">
                            <Badge label={m.direction} status={m.direction} />
                            {m.is_test && <Badge label="test" status="test" />}
                          </div>
                        </td>
                        <td className="max-w-md">
                          <p className="truncate text-[12.5px]" title={m.body}>{m.body}</p>
                          {m.purpose && (
                            <span className="mono text-[10.5px]" style={{ color: 'var(--ink-faint)' }}>{m.purpose}</span>
                          )}
                        </td>
                        <td>
                          <Badge label={m.delivery_status ?? '—'} status={m.delivery_status} />
                          {m.error_message && (
                            <p className="mono mt-0.5 max-w-xs truncate text-[10.5px]" style={{ color: 'var(--signal-neg)' }} title={m.error_message}>
                              {m.error_message}
                            </p>
                          )}
                        </td>
                        <td className="hidden lg:table-cell">
                          <Timestamp iso={m.sent_at} inline />
                        </td>
                      </tr>
                    ))}

                    {open && !isSent && g.items.map((m) => (
                      <tr key={m.id}>
                        <td className="pl-9!">
                          <span className="text-[12.5px]" title={m.template_key}>{templateLabel(m.template_key)}</span>
                          {m.is_test && <Badge label="test" status="test" className="ml-1.5" />}
                        </td>
                        <td className="hidden sm:table-cell">
                          <Badge label={m.channel} status={m.channel} />
                        </td>
                        <td>
                          <Badge label={m.state} status={m.state} />
                        </td>
                        <td className="hidden max-w-xs lg:table-cell">
                          <p className="truncate text-[12px]" style={{ color: 'var(--ink-muted)' }}>
                            {m.suppression_reason || m.error_message || '—'}
                          </p>
                        </td>
                        <td className="hidden md:table-cell">
                          {m.context?.demo ? (
                            <div className="leading-tight">
                              <span className="block text-[12px] font-medium" style={{ color: 'var(--signal-alt)' }}>
                                {relativeTime(m.scheduled_for)}
                              </span>
                              {m.context.production_due && (
                                <span className="block text-[10px]" style={{ color: 'var(--ink-faint)' }}>
                                  Prod: {formatDayFull(m.context.production_due)}
                                </span>
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
