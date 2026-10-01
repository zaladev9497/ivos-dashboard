'use client'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import Badge from '@/components/Badge'
import Timestamp from '@/components/Timestamp'
import Pagination from '@/components/Pagination'
import EmptyState from '@/components/EmptyState'
import { journeyTypeLabel } from '@/lib/utils'

// A filter that reads as a toggle chip rather than a loose browser checkbox.
function FilterChip({ checked, onChange, children }) {
  return (
    <label
      className="btn h-8 cursor-pointer select-none px-2.5"
      style={{
        background: checked ? 'var(--accent-soft)' : 'var(--paper-raised)',
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: checked ? 'var(--accent-rule)' : 'var(--rule)',
        color: checked ? 'var(--accent-ink)' : 'var(--ink-muted)',
        boxShadow: 'var(--lift-flat)',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span
        className="flex h-3.5 w-3.5 items-center justify-center rounded-[4px] border transition-colors"
        style={{
          borderColor: checked ? 'var(--accent)' : 'var(--rule-strong)',
          background: checked ? 'var(--accent)' : 'transparent',
        }}
        aria-hidden="true"
      >
        {checked && (
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--paper-raised)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        )}
      </span>
      {children}
    </label>
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

  const activeExceptions = (lead) =>
    lead.operations_exceptions?.filter((x) => x.state === 'open').length ?? 0

  const latestJourney = (lead) =>
    lead.journeys?.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0]

  return (
    <div className="surface flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <form
        onSubmit={handleSearch}
        className="flex shrink-0 flex-wrap items-center gap-2.5 border-b px-5 py-3.5"
        style={{ borderColor: 'var(--rule-faint)' }}
      >
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email or phone…"
            aria-label="Search leads"
            className="field w-full pl-8"
          />
        </div>

        <select
          value={journeyType}
          onChange={(e) => { setJourneyType(e.target.value); applyFilters({ journeyType: e.target.value }) }}
          aria-label="Journey type"
          className="field"
        >
          <option value="">All types</option>
          <option value="retrofit">Retrofit</option>
          <option value="new_construction">New Construction</option>
          <option value="service">Service</option>
        </select>

        {/* Date range reads as one control, not two stray inputs. */}
        <div
          className="flex items-center overflow-hidden rounded-[5px] border"
          style={{ borderColor: 'var(--rule)', background: 'var(--paper-raised)', boxShadow: 'var(--lift-flat)' }}
        >
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); applyFilters({ dateFrom: e.target.value }) }}
            aria-label="From date"
            title="From"
            className="h-8 border-0 bg-transparent px-2 text-[12.5px] focus:outline-none"
            style={{ color: 'var(--ink)' }}
          />
          <span className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>→</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); applyFilters({ dateTo: e.target.value }) }}
            aria-label="To date"
            title="To"
            className="h-8 border-0 bg-transparent px-2 text-[12.5px] focus:outline-none"
            style={{ color: 'var(--ink)' }}
          />
        </div>

        <button type="submit" className="btn btn-primary">Search</button>

        <FilterChip
          checked={hasException}
          onChange={(e) => { setHasException(e.target.checked); applyFilters({ hasException: e.target.checked }) }}
        >
          Exceptions
        </FilterChip>
        <FilterChip
          checked={showTest}
          onChange={(e) => { setShowTest(e.target.checked); applyFilters({ showTest: e.target.checked }) }}
        >
          Test records
        </FilterChip>

        <span className="ml-auto flex items-center gap-2">
          {isPending && (
            <span
              className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-transparent"
              style={{ borderTopColor: 'var(--accent)', borderRightColor: 'var(--accent)' }}
              aria-hidden="true"
            />
          )}
          <span className="eyebrow">
            <span className="tabular" style={{ color: 'var(--ink-secondary)' }}>{total.toLocaleString()}</span>
            {' '}lead{total !== 1 ? 's' : ''}
          </span>
        </span>
      </form>

      {fetchError && (
        <div
          className="shrink-0 border-b px-5 py-3 text-[12.5px]"
          style={{ borderColor: 'var(--signal-neg-rule)', background: 'var(--signal-neg-soft)', color: 'var(--tone-neg-ink)' }}
        >
          {fetchError}
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-auto">
        {initialLeads.length === 0 ? (
          <EmptyState title="No leads found" description="Try adjusting your filters or search terms." />
        ) : (
          <table className="data-table min-w-155">
            <thead>
              <tr>
                <th>Lead</th>
                <th className="hidden md:table-cell">Phone</th>
                <th className="hidden sm:table-cell">Type</th>
                <th className="hidden lg:table-cell">Stage</th>
                <th className="hidden xl:table-cell">Last activity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {initialLeads.map((lead) => {
                const journey = latestJourney(lead)
                const exc = activeExceptions(lead)
                return (
                  <tr key={lead.id}>
                    <td>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Link href={`/leads/${lead.id}`} className="link-subtle">
                          {lead.full_name || '—'}
                        </Link>
                        {lead.is_test_record && <Badge label="Test" status="test" />}
                        {lead.needs_manual_routing && <Badge label="Manual" status="medium" />}
                        {exc > 0 && <Badge label={`${exc} exception${exc > 1 ? 's' : ''}`} status="high" />}
                      </div>
                    </td>
                    <td className="mono hidden text-[12px] md:table-cell" style={{ color: 'var(--ink-muted)' }}>
                      {lead.phone ?? '—'}
                    </td>
                    <td className="hidden sm:table-cell">
                      {lead.journey_type ? (
                        <Badge label={journeyTypeLabel(lead.journey_type)} status="neutral" dot={false} />
                      ) : (
                        <span style={{ color: 'var(--ink-faint)' }}>—</span>
                      )}
                    </td>
                    <td className="hidden lg:table-cell">
                      {journey ? (
                        journey.current_stage ?? journey.state
                      ) : (
                        <span style={{ color: 'var(--ink-faint)' }}>—</span>
                      )}
                    </td>
                    <td className="hidden xl:table-cell">
                      <Timestamp iso={journey?.updated_at ?? lead.ingested_at} inline />
                    </td>
                    <td>
                      <Badge label={lead.request_status ?? 'unknown'} status={lead.request_status} />
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
  )
}
