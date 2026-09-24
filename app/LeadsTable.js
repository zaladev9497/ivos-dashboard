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
    if (s.showTest) p.set('show_test', '1')
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

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <label className="block text-xs font-medium text-slate-500 mb-1">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, email or phone…"
              className="w-full rounded border border-slate-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Journey type</label>
            <select
              value={journeyType}
              onChange={(e) => { setJourneyType(e.target.value); applyFilters({ journeyType: e.target.value }) }}
              className="rounded border border-slate-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value="">All types</option>
              <option value="retrofit">Retrofit</option>
              <option value="new_construction">New Construction</option>
              <option value="service">Service</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); applyFilters({ dateFrom: e.target.value }) }}
              className="rounded border border-slate-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); applyFilters({ dateTo: e.target.value }) }}
              className="rounded border border-slate-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
          <button
            type="submit"
            className="rounded bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            Search
          </button>
          <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer self-end pb-1.5">
            <input
              type="checkbox"
              checked={hasException}
              onChange={(e) => { setHasException(e.target.checked); applyFilters({ hasException: e.target.checked }) }}
            />
            Has exception
          </label>
          <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer self-end pb-1.5">
            <input
              type="checkbox"
              checked={showTest}
              onChange={(e) => { setShowTest(e.target.checked); applyFilters({ showTest: e.target.checked }) }}
            />
            Show test records
          </label>
        </form>
      </div>

      {/* Error */}
      {fetchError && (
        <div className="rounded bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {fetchError}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
          <span className="text-sm text-slate-500">{total} lead{total !== 1 ? 's' : ''}</span>
        </div>
        {initialLeads.length === 0 ? (
          <EmptyState title="No leads found" description="Try adjusting your filters or search." />
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2 text-left">Lead</th>
                <th className="px-4 py-2 text-left">Phone</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Stage</th>
                <th className="px-4 py-2 text-left">Last activity</th>
                <th className="px-4 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {initialLeads.map((lead) => {
                const journey = latestJourney(lead)
                const exc = activeExceptions(lead)
                return (
                  <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="font-medium text-slate-800 hover:text-blue-600"
                      >
                        {lead.full_name || '—'}
                      </Link>
                      {lead.is_test_record && (
                        <Badge label="test" status="test" className="ml-1.5" />
                      )}
                      {lead.needs_manual_routing && (
                        <Badge label="manual" status="medium" className="ml-1.5" />
                      )}
                      {exc > 0 && (
                        <Badge label={`${exc} exc`} status="high" className="ml-1.5" />
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 font-mono text-xs">{lead.phone ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      {lead.journey_type ? (
                        <Badge label={journeyTypeLabel(lead.journey_type)} status="pending" />
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {journey ? (
                        <span className="text-slate-700">{journey.current_stage ?? journey.state}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <Timestamp iso={journey?.updated_at ?? lead.ingested_at} />
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge
                        label={lead.request_status ?? 'unknown'}
                        status={lead.request_status}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
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
