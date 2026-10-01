'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import Badge from '@/components/Badge'
import Timestamp from '@/components/Timestamp'
import Pagination from '@/components/Pagination'
import EmptyState from '@/components/EmptyState'
import { journeyTypeLabel } from '@/lib/utils'

export default function LeadsTable({
  initialLeads,
  total,
  pageSize,
  currentPage,
  currentFilters,
  fetchError,
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()

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

  const hasUpcoming = (lead) =>
    lead.scheduled_messages?.some((m) => m.state === 'pending') ?? false

  const field = 'h-8 rounded border border-slate-200 bg-white px-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-slate-400'
  const th = 'px-3 py-1.5 text-left font-medium'
  const td = 'px-3 py-1.5'

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-slate-200 bg-white">
      {/* Toolbar */}
      <form
        onSubmit={handleSearch}
        className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2"
      >
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email or phone…"
          aria-label="Search"
          className={`${field} min-w-44 flex-1 sm:max-w-xs`}
        />
        <select
          value={journeyType}
          onChange={(e) => { setJourneyType(e.target.value); applyFilters({ journeyType: e.target.value }) }}
          aria-label="Journey type"
          className={field}
        >
          <option value="">All types</option>
          <option value="retrofit">Retrofit</option>
          <option value="new_construction">New Construction</option>
          <option value="service">Service</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); applyFilters({ dateFrom: e.target.value }) }}
          aria-label="From date"
          title="From"
          className={field}
        />
        <span className="text-slate-400">–</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); applyFilters({ dateTo: e.target.value }) }}
          aria-label="To date"
          title="To"
          className={field}
        />
        <button type="submit" className="h-8 rounded bg-slate-800 px-3 text-[13px] font-medium text-white hover:bg-slate-700">
          Search
        </button>
        <label className="flex cursor-pointer items-center gap-1.5 text-[13px] text-slate-600">
          <input
            type="checkbox"
            checked={hasException}
            onChange={(e) => { setHasException(e.target.checked); applyFilters({ hasException: e.target.checked }) }}
          />
          Exceptions
        </label>
        <label className="flex cursor-pointer items-center gap-1.5 text-[13px] text-slate-600">
          <input
            type="checkbox"
            checked={showTest}
            onChange={(e) => { setShowTest(e.target.checked); applyFilters({ showTest: e.target.checked }) }}
          />
          Test records
        </label>
        <span className="ml-auto text-xs tabular-nums text-slate-500">
          {total} lead{total !== 1 ? 's' : ''}
        </span>
      </form>

      {fetchError && (
        <div className="shrink-0 border-b border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {fetchError}
        </div>
      )}

      {/* Scrollable table body, sticky header */}
      <div className="min-h-0 flex-1 overflow-auto">
        {initialLeads.length === 0 ? (
          <EmptyState title="No leads found" description="Try adjusting your filters or search." />
        ) : (
          <table className="w-full min-w-[560px] text-[13px]">
            <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 shadow-[inset_0_-1px_0] shadow-slate-200">
              <tr>
                <th className={th}>Lead</th>
                <th className={`${th} hidden md:table-cell`}>Phone</th>
                <th className={`${th} hidden sm:table-cell`}>Type</th>
                <th className={`${th} hidden lg:table-cell`}>Stage</th>
                <th className={`${th} hidden xl:table-cell`}>Last activity</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {initialLeads.map((lead) => {
                const journey = latestJourney(lead)
                const exc = activeExceptions(lead)
                return (
                  <tr key={lead.id} className="hover:bg-slate-50">
                    <td className={td}>
                      <div className="flex flex-wrap items-center gap-1">
                        <Link
                          href={`/leads/${lead.id}`}
                          className="font-medium text-slate-800 hover:text-blue-600"
                        >
                          {lead.full_name || '—'}
                        </Link>
                        {lead.is_test_record && <Badge label="test" status="test" />}
                        {lead.needs_manual_routing && <Badge label="manual" status="medium" />}
                        {exc > 0 && <Badge label={`${exc} exc`} status="high" />}
                      </div>
                    </td>
                    <td className={`${td} hidden font-mono text-xs text-slate-500 md:table-cell`}>{lead.phone ?? '—'}</td>
                    <td className={`${td} hidden sm:table-cell`}>
                      {lead.journey_type ? (
                        <Badge label={journeyTypeLabel(lead.journey_type)} status="pending" />
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className={`${td} hidden text-slate-700 lg:table-cell`}>
                      {journey ? (journey.current_stage ?? journey.state) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className={`${td} hidden xl:table-cell`}>
                      <Timestamp iso={journey?.updated_at ?? lead.ingested_at} inline />
                    </td>
                    <td className={td}>
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
