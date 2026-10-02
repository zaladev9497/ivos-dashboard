'use client'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import Badge from '@/components/Badge'
import Timestamp from '@/components/Timestamp'
import Pagination from '@/components/Pagination'
import EmptyState from '@/components/EmptyState'
import AdvanceButton from '@/components/AdvanceButton'
import FilterToggle from '@/components/FilterToggle'
import { formatDayFull, relativeTime, templateLabel, stageLabel } from '@/lib/utils'

const TABS = [
  { key: 'sent', label: 'Sent & received' },
  { key: 'scheduled', label: 'Scheduled' },
]

/* Direction as a small arrow + word. Inbound is the one worth noticing (a
   customer wrote back), so it takes the colour; outbound stays quiet. */
function Direction({ value }) {
  const inbound = value === 'inbound'
  return (
    <span
      className="inline-flex items-center gap-1 text-[12px] font-medium"
      style={{ color: inbound ? 'var(--tone-alt-ink)' : 'var(--ink-muted)' }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
        {inbound ? <path d="M17 7L7 17M15 17H7V9" /> : <path d="M7 17L17 7M9 7h8v8" />}
      </svg>
      {inbound ? 'In' : 'Out'}
    </span>
  )
}

function Chevron({ open }) {
  return (
    <svg
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round"
      className={`h-3.5 w-3.5 shrink-0 transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
      style={{ color: 'var(--ink-faint)' }}
      aria-hidden="true"
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

export default function MessagesView({ tab, sentResult, scheduledResult, page, filters, fetchError, demoMode, demoPollInterval }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [localFilters, setLocalFilters] = useState(filters)
  const [expanded, setExpanded] = useState(() => new Set())

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

  function toggleGroup(key) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const isSent = tab === 'sent'
  const result = isSent ? sentResult : scheduledResult
  const messages = result.messages

  // Group the current page of entries by lead, keeping the newest-activity-first order.
  const groups = []
  {
    const byKey = new Map()
    for (const m of messages) {
      const key = m.lead_id ?? 'none'
      let g = byKey.get(key)
      if (!g) {
        g = { key, leadId: m.lead_id, name: m.leads?.full_name || 'Unnamed lead', hasTest: false, items: [] }
        byKey.set(key, g)
        groups.push(g)
      }
      if (m.is_test) g.hasTest = true
      g.items.push(m)
    }
  }

  const cols = isSent ? 4 : 5

  return (
    <div className="rise flex min-h-0 flex-1 flex-col gap-4">
      {/* ── Page head ───────────────────────────────────────────────────── */}
      <header className="shrink-0 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <div>
            <h1 className="page-title">Messages</h1>
            <p className="page-lede">Every text sent and received, grouped by lead.</p>
          </div>
          <p className="pb-0.5 text-[12.5px]" style={{ color: 'var(--ink-muted)' }}>
            <span className="tabular font-semibold" style={{ color: 'var(--ink)' }}>
              {result.total.toLocaleString()}
            </span>
            {' '}message{result.total !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="tabs" role="tablist" aria-label="Message view">
          {TABS.map((t) => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => switchTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {!isSent && demoMode && <AdvanceButton pollIntervalSeconds={demoPollInterval} />}

      <div className="surface flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* ── Toolbar ───────────────────────────────────────────────────── */}
        <div
          className="flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-3"
          style={{ borderColor: 'var(--rule-faint)' }}
        >
          {isSent ? (
            <>
              <div className="relative min-w-52 flex-1 sm:max-w-xs">
                <svg
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2"
                  style={{ color: 'var(--ink-faint)' }}
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" />
                </svg>
                <input
                  type="search"
                  value={localFilters.purpose}
                  onChange={(e) => setFilterDebounced('purpose', e.target.value)}
                  placeholder="Filter by purpose…"
                  aria-label="Purpose"
                  className="field w-full pl-8"
                />
              </div>
              <select value={localFilters.direction} onChange={(e) => setFilter('direction', e.target.value)} aria-label="Direction" className="field">
                <option value="">Any direction</option>
                <option value="inbound">Inbound</option>
                <option value="outbound">Outbound</option>
              </select>
              <select value={localFilters.deliveryStatus} onChange={(e) => setFilter('deliveryStatus', e.target.value)} aria-label="Delivery status" className="field">
                <option value="">Any status</option>
                <option value="delivered">Delivered</option>
                <option value="sent">Sent</option>
                <option value="undelivered">Undelivered</option>
                <option value="failed">Failed</option>
              </select>
            </>
          ) : (
            <>
              <select value={localFilters.state} onChange={(e) => setFilter('state', e.target.value)} aria-label="State" className="field">
                <option value="">Any state</option>
                <option value="pending">Pending</option>
                <option value="sent">Sent</option>
                <option value="cancelled">Cancelled</option>
                <option value="suppressed">Suppressed</option>
                <option value="failed">Failed</option>
                <option value="skipped">Skipped</option>
              </select>
              <select value={localFilters.channel} onChange={(e) => setFilter('channel', e.target.value)} aria-label="Channel" className="field">
                <option value="">Any channel</option>
                <option value="sms">SMS</option>
                <option value="task">Task</option>
                <option value="internal">Internal</option>
              </select>
            </>
          )}

          <FilterToggle checked={localFilters.showTest} onChange={(e) => setFilter('showTest', e.target.checked)}>
            Test records
          </FilterToggle>

          {isPending && (
            <span
              className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-transparent"
              style={{ borderTopColor: 'var(--accent)', borderRightColor: 'var(--accent)' }}
              role="status"
              aria-label="Loading"
            />
          )}

          {groups.length > 1 && (
            <button
              type="button"
              onClick={() => setExpanded(expanded.size ? new Set() : new Set(groups.map((g) => g.key)))}
              className="btn btn-ghost ml-auto h-8 px-2.5 text-[12.5px]"
            >
              {expanded.size ? 'Collapse all' : 'Expand all'}
            </button>
          )}
        </div>

        {fetchError && (
          <div
            className="shrink-0 border-b px-4 py-3 text-[12.5px]"
            style={{ borderColor: 'var(--signal-neg-rule)', background: 'var(--signal-neg-soft)', color: 'var(--tone-neg-ink)' }}
          >
            {fetchError}
          </div>
        )}

        {/* ── Table grouped by lead ─────────────────────────────────────── */}
        <div className="min-h-0 flex-1 overflow-auto">
          {messages.length === 0 ? (
            <EmptyState
              title={isSent ? 'No messages' : 'Nothing scheduled'}
              description="Try adjusting the filters above."
            />
          ) : (
            <table className="data-table min-w-155">
              <thead>
                {isSent ? (
                  <tr>
                    <th>Lead / message</th>
                    <th className="w-20">Direction</th>
                    <th className="w-36">Status</th>
                    <th className="hidden w-48 lg:table-cell">Sent</th>
                  </tr>
                ) : (
                  <tr>
                    <th>Lead / template</th>
                    <th className="hidden w-24 sm:table-cell">Channel</th>
                    <th className="w-28">State</th>
                    <th className="hidden lg:table-cell">Reason</th>
                    <th className="hidden w-48 md:table-cell">Scheduled for</th>
                  </tr>
                )}
              </thead>

              {groups.map((g) => {
                const open = expanded.has(g.key)
                const latest = g.items[0]
                // A preview of the newest item, so a collapsed row still says something.
                const preview = isSent ? latest.body : templateLabel(latest.template_key)

                return (
                  <tbody key={g.key}>
                    <tr onClick={() => toggleGroup(g.key)} className="cursor-pointer">
                      <td colSpan={cols - 1}>
                        <div className="flex min-w-0 items-center gap-2.5">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleGroup(g.key) }}
                            aria-label={open ? `Collapse ${g.name}` : `Expand ${g.name}`}
                            aria-expanded={open}
                            className="-ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded"
                          >
                            <Chevron open={open} />
                          </button>
                          {g.leadId ? (
                            <Link
                              href={`/leads/${g.leadId}`}
                              onClick={(e) => e.stopPropagation()}
                              className="link-subtle shrink-0 font-medium"
                            >
                              {g.name}
                            </Link>
                          ) : (
                            <span className="shrink-0 font-medium" style={{ color: 'var(--ink-muted)' }}>{g.name}</span>
                          )}
                          {g.hasTest && <Badge label="Test" status="test" dot={false} />}
                          <span className="tabular shrink-0 text-[12px]" style={{ color: 'var(--ink-faint)' }}>
                            {g.items.length}
                          </span>
                          {!open && preview && (
                            <span className="min-w-0 truncate text-[12.5px]" style={{ color: 'var(--ink-muted)' }}>
                              {preview}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={isSent ? 'hidden lg:table-cell' : 'hidden md:table-cell'}>
                        <Timestamp iso={isSent ? latest.sent_at : latest.scheduled_for} inline />
                      </td>
                    </tr>

                    {open && isSent && g.items.map((m) => (
                      <tr key={m.id} style={{ background: 'var(--paper-sunken)' }}>
                        <td className="pl-11!">
                          <p className="line-clamp-2 max-w-xl text-[12.5px] leading-relaxed" style={{ color: 'var(--ink-secondary)' }} title={m.body}>
                            {m.body}
                          </p>
                          {m.purpose && (
                            <span className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>{stageLabel(m.purpose)}</span>
                          )}
                        </td>
                        <td><Direction value={m.direction} /></td>
                        <td>
                          <Badge label={stageLabel(m.delivery_status) ?? '—'} status={m.delivery_status} />
                          {m.error_message && (
                            <p className="mt-0.5 max-w-xs truncate text-[11px]" style={{ color: 'var(--tone-neg-ink)' }} title={m.error_message}>
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
                      <tr key={m.id} style={{ background: 'var(--paper-sunken)' }}>
                        <td className="pl-11!">
                          <span className="text-[12.5px]" style={{ color: 'var(--ink-secondary)' }} title={m.template_key}>
                            {templateLabel(m.template_key)}
                          </span>
                        </td>
                        <td className="hidden sm:table-cell">
                          <span className="text-[12px]" style={{ color: 'var(--ink-muted)' }}>
                            {m.channel === 'sms' ? 'SMS' : stageLabel(m.channel)}
                          </span>
                        </td>
                        <td>
                          <Badge label={stageLabel(m.state)} status={m.state} />
                        </td>
                        <td className="hidden max-w-xs lg:table-cell">
                          <p className="truncate text-[12px]" style={{ color: 'var(--ink-muted)' }}>
                            {m.suppression_reason ? stageLabel(m.suppression_reason) : m.error_message || '—'}
                          </p>
                        </td>
                        <td className="hidden md:table-cell">
                          {m.context?.demo ? (
                            <div className="leading-tight">
                              <span className="block text-[12px] font-medium" style={{ color: 'var(--signal-alt)' }}>
                                {relativeTime(m.scheduled_for)}
                              </span>
                              {m.context.production_due && (
                                <span className="block text-[10.5px]" style={{ color: 'var(--ink-faint)' }}>
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
