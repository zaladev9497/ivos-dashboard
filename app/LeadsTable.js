'use client'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import Badge from '@/components/Badge'
import Timestamp from '@/components/Timestamp'
import Pagination from '@/components/Pagination'
import EmptyState from '@/components/EmptyState'
import FilterToggle from '@/components/FilterToggle'
import { journeyTypeLabel, stageLabel } from '@/lib/utils'

const JOURNEY_TYPES = [
  { value: '', label: 'All types' },
  { value: 'retrofit', label: 'Retrofit' },
  { value: 'new_construction', label: 'New Construction' },
  { value: 'service', label: 'Service' },
]

/* An applied filter, shown as a dismissible token so the active query is always legible. */
function FilterToken({ label, value, onClear }) {
  return (
    <span
      className="inline-flex h-6.5 items-center gap-1.5 rounded-full border pl-2.5 pr-1 text-[12px]"
      style={{ borderColor: 'var(--rule)', background: 'var(--paper-sunken)', color: 'var(--ink-secondary)' }}
    >
      <span style={{ color: 'var(--ink-faint)' }}>{label}</span>
      <span className="font-medium">{value}</span>
      <button
        type="button"
        onClick={onClear}
        aria-label={`Clear ${label} filter`}
        className="flex h-4.5 w-4.5 items-center justify-center rounded-full transition-colors hover:bg-[var(--paper-hover)]"
        style={{ color: 'var(--ink-faint)' }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="h-2.5 w-2.5" aria-hidden="true">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </span>
  )
}

/* Lead-level flags. One row of small marks beneath the name rather than a wall of
   coloured pills beside it — the name stays the thing you scan. */
function LeadFlags({ manual, exceptions }) {
  if (!manual && !exceptions) return null
  return (
    <span className="mt-0.5 flex items-center gap-2.5 text-[11.5px]">
      {exceptions > 0 && (
        <span className="inline-flex items-center gap-1" style={{ color: 'var(--tone-neg-ink)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3 w-3" aria-hidden="true">
            <path d="M12 8v5M12 16.5v.01" />
            <circle cx="12" cy="12" r="9" />
          </svg>
          {exceptions} exception{exceptions > 1 ? 's' : ''}
        </span>
      )}
      {manual && (
        <span className="inline-flex items-center gap-1" style={{ color: 'var(--ink-muted)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden="true">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
          </svg>
          Manual routing
        </span>
      )}
    </span>
  )
}

export default function LeadsTable({
  initialLeads,
  total,
  pageSize,
  currentPage,
  currentFilters,
  fetchError,
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState(currentFilters.search)
  const [journeyType, setJourneyType] = useState(currentFilters.journeyType)
  const [showTest, setShowTest] = useState(currentFilters.showTest)
  const [hasException, setHasException] = useState(currentFilters.hasException)
  const [dateFrom, setDateFrom] = useState(currentFilters.dateFrom)
  const [dateTo, setDateTo] = useState(currentFilters.dateTo)

  // The date range is the least-used control, so it stays folded away until wanted.
  const [dateOpen, setDateOpen] = useState(!!(currentFilters.dateFrom || currentFilters.dateTo))

  function buildUrl(overrides = {}) {
    const p = new URLSearchParams()
    const s = { search, journeyType, showTest, hasException, dateFrom, dateTo, page: currentPage, ...overrides }
    if (s.search) p.set('search', s.search)
    if (s.journeyType) p.set('journey_type', s.journeyType)
    if (!s.showTest) p.set('show_test', '0')
    if (s.hasException) p.set('has_exception', '1')
    if (s.dateFrom) p.set('date_from', s.dateFrom)
    if (s.dateTo) p.set('date_to', s.dateTo)
    if (s.page > 1) p.set('page', String(s.page))
    return `/?${p.toString()}`
  }

  function applyFilters(overrides = {}) {
    startTransition(() => router.push(buildUrl({ ...overrides, page: 1 })))
  }

  function handleSearch(e) {
    e.preventDefault()
    applyFilters({ search })
  }

  function clearAll() {
    setSearch(''); setJourneyType(''); setHasException(false); setDateFrom(''); setDateTo('')
    setDateOpen(false)
    applyFilters({ search: '', journeyType: '', hasException: false, dateFrom: '', dateTo: '' })
  }

  const activeExceptions = (lead) =>
    lead.operations_exceptions?.filter((x) => x.state === 'open').length ?? 0

  const latestJourney = (lead) =>
    lead.journeys?.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0]

  // Applied filters, as tokens. `showTest` is a default-on view option, not a query.
  const tokens = []
  if (currentFilters.search) tokens.push({ key: 'search', label: 'Matching', value: `“${currentFilters.search}”`, clear: () => { setSearch(''); applyFilters({ search: '' }) } })
  if (currentFilters.journeyType) tokens.push({ key: 'type', label: 'Type', value: journeyTypeLabel(currentFilters.journeyType), clear: () => { setJourneyType(''); applyFilters({ journeyType: '' }) } })
  if (currentFilters.hasException) tokens.push({ key: 'exc', label: '', value: 'With exceptions', clear: () => { setHasException(false); applyFilters({ hasException: false }) } })
  if (currentFilters.dateFrom || currentFilters.dateTo) {
    tokens.push({
      key: 'date',
      label: 'Received',
      value: `${currentFilters.dateFrom || '…'} → ${currentFilters.dateTo || '…'}`,
      clear: () => { setDateFrom(''); setDateTo(''); setDateOpen(false); applyFilters({ dateFrom: '', dateTo: '' }) },
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* ── Page head ───────────────────────────────────────────────────── */}
      <header className="flex shrink-0 flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div>
          <h1 className="page-title">Leads</h1>
          <p className="page-lede">
            Every inbound request, newest first.
          </p>
        </div>
        <p className="pb-0.5 text-[12.5px]" style={{ color: 'var(--ink-muted)' }}>
          <span className="tabular font-semibold" style={{ color: 'var(--ink)' }}>
            {total.toLocaleString()}
          </span>
          {' '}lead{total !== 1 ? 's' : ''}{tokens.length > 0 ? ' matched' : ''}
        </p>
      </header>

      <div className="surface flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* ── Toolbar ───────────────────────────────────────────────────── */}
        <form
          onSubmit={handleSearch}
          className="flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-3"
          style={{ borderColor: 'var(--rule-faint)' }}
        >
          <div className="relative min-w-56 flex-1 sm:max-w-sm">
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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email or phone…"
              aria-label="Search leads"
              className="field w-full pl-8"
            />
          </div>

          <button type="submit" className="btn btn-primary">Search</button>

          {/* Separator: query controls to the left, view options to the right. */}
          <span className="mx-0.5 hidden h-5 w-px sm:block" style={{ background: 'var(--rule)' }} aria-hidden="true" />

          <select
            value={journeyType}
            onChange={(e) => { setJourneyType(e.target.value); applyFilters({ journeyType: e.target.value }) }}
            aria-label="Journey type"
            className="field"
          >
            {JOURNEY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          <FilterToggle
            checked={hasException}
            onChange={(e) => { setHasException(e.target.checked); applyFilters({ hasException: e.target.checked }) }}
          >
            Exceptions
          </FilterToggle>
          <FilterToggle
            checked={showTest}
            onChange={(e) => { setShowTest(e.target.checked); applyFilters({ showTest: e.target.checked }) }}
          >
            Test records
          </FilterToggle>

          <button
            type="button"
            onClick={() => setDateOpen((v) => !v)}
            aria-expanded={dateOpen}
            className="btn btn-quiet h-8 px-2.5 text-[12.5px]"
            style={dateOpen ? { color: 'var(--accent-ink)', borderColor: 'var(--accent-rule)', background: 'var(--accent-soft)' } : undefined}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M3 10h18M8 3v4M16 3v4" />
            </svg>
            Date range
          </button>

          {isPending && (
            <span
              className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-transparent"
              style={{ borderTopColor: 'var(--accent)', borderRightColor: 'var(--accent)' }}
              role="status"
              aria-label="Loading"
            />
          )}
        </form>

        {/* ── Date range, folded away until asked for ───────────────────── */}
        {dateOpen && (
          <div
            className="flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-2.5"
            style={{ borderColor: 'var(--rule-faint)', background: 'var(--paper-sunken)' }}
          >
            <span className="eyebrow">Received between</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); applyFilters({ dateFrom: e.target.value }) }}
              aria-label="From date"
              className="field h-8 text-[12.5px]"
            />
            <span className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>→</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); applyFilters({ dateTo: e.target.value }) }}
              aria-label="To date"
              className="field h-8 text-[12.5px]"
            />
          </div>
        )}

        {/* ── Applied filters ───────────────────────────────────────────── */}
        {tokens.length > 0 && (
          <div
            className="flex shrink-0 flex-wrap items-center gap-1.5 border-b px-4 py-2.5"
            style={{ borderColor: 'var(--rule-faint)' }}
          >
            {tokens.map((t) => (
              <FilterToken key={t.key} label={t.label} value={t.value} onClear={t.clear} />
            ))}
            <button type="button" onClick={clearAll} className="link ml-1 text-[12px]">
              Clear all
            </button>
          </div>
        )}

        {fetchError && (
          <div
            className="shrink-0 border-b px-4 py-3 text-[12.5px]"
            style={{ borderColor: 'var(--signal-neg-rule)', background: 'var(--signal-neg-soft)', color: 'var(--tone-neg-ink)' }}
          >
            {fetchError}
          </div>
        )}

        {/* ── Table ─────────────────────────────────────────────────────── */}
        <div className="min-h-0 flex-1 overflow-auto">
          {initialLeads.length === 0 ? (
            <EmptyState
              title="No leads found"
              description={
                tokens.length > 0
                  ? 'No lead matches the filters above. Try widening the search.'
                  : 'New requests will appear here as they arrive.'
              }
              action={
                tokens.length > 0 ? (
                  <button type="button" onClick={clearAll} className="btn btn-quiet">Clear filters</button>
                ) : null
              }
            />
          ) : (
            <table className="data-table min-w-155">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th className="hidden md:table-cell">Phone</th>
                  <th className="hidden sm:table-cell">Type</th>
                  <th className="hidden lg:table-cell">Stage</th>
                  <th className="hidden xl:table-cell">Last activity</th>
                  <th className="text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {initialLeads.map((lead) => {
                  const journey = latestJourney(lead)
                  const exc = activeExceptions(lead)
                  const stage = stageLabel(journey?.current_stage ?? journey?.state)
                  return (
                    <tr key={lead.id}>
                      <td>
                        <div className="flex flex-col">
                          <span className="flex items-center gap-1.5">
                            <Link href={`/leads/${lead.id}`} className="link-subtle font-medium">
                              {lead.full_name || 'Unnamed lead'}
                            </Link>
                            {lead.is_test_record && <Badge label="Test" status="test" dot={false} />}
                          </span>
                          <LeadFlags manual={lead.needs_manual_routing} exceptions={exc} />
                        </div>
                      </td>
                      <td className="mono hidden whitespace-nowrap text-[12px] md:table-cell" style={{ color: 'var(--ink-muted)' }}>
                        {lead.phone ?? '—'}
                      </td>
                      <td className="hidden sm:table-cell">
                        {lead.journey_type ? (
                          <span className="text-[12.5px]" style={{ color: 'var(--ink-secondary)' }}>
                            {journeyTypeLabel(lead.journey_type)}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--ink-faint)' }}>—</span>
                        )}
                      </td>
                      <td className="hidden lg:table-cell">
                        {stage ? (
                          <span className="text-[12.5px]" style={{ color: 'var(--ink-secondary)' }}>{stage}</span>
                        ) : (
                          <span style={{ color: 'var(--ink-faint)' }}>—</span>
                        )}
                      </td>
                      <td className="hidden xl:table-cell">
                        <Timestamp iso={journey?.updated_at ?? lead.ingested_at} inline />
                      </td>
                      <td className="text-right">
                        <Badge label={stageLabel(lead.request_status) ?? 'Unknown'} status={lead.request_status} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <Pagination
          page={currentPage}
          total={total}
          pageSize={pageSize}
          onPage={(p) => startTransition(() => router.push(buildUrl({ page: p })))}
        />
      </div>
    </div>
  )
}
