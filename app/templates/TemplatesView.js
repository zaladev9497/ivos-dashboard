'use client'
import { useState } from 'react'
import Link from 'next/link'
import Badge from '@/components/Badge'
import EmptyState from '@/components/EmptyState'
import FilterToggle from '@/components/FilterToggle'
import { templateLabel, friendlyBody } from '@/lib/utils'

const JOURNEY_ORDER = ['retrofit', 'nc', 'service', 'post_sale']
const JOURNEY_LABELS = {
  retrofit: 'Retrofit',
  nc: 'New Construction',
  service: 'Service',
  post_sale: 'Post Sale',
  other: 'Other',
}

export function journeyGroup(key) {
  const prefix = key.split('.')[0]
  return JOURNEY_ORDER.includes(prefix) ? prefix : 'other'
}

/* One status instead of two pill columns. Live is the normal case and stays
   quiet; only templates that will not send get colour. */
function TemplateStatus({ t }) {
  if (!t.is_active) {
    return <span className="text-[12.5px]" style={{ color: 'var(--ink-faint)' }}>Inactive</span>
  }
  if (!t.approved) return <Badge label="Needs approval" status="medium" />
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px]" style={{ color: 'var(--ink-secondary)' }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--signal-pos)' }} aria-hidden="true" />
      Live
    </span>
  )
}

export default function TemplatesView({ templates, fetchError }) {
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [needsApproval, setNeedsApproval] = useState(false)

  const pendingCount = templates.filter((t) => t.is_active && !t.approved).length

  // Filters run on the client: the whole table is already here and small.
  const q = query.trim().toLowerCase()
  const filtered = templates.filter((t) => {
    if (needsApproval && (t.approved || !t.is_active)) return false
    if (!q) return true
    return (
      t.template_key.toLowerCase().includes(q) ||
      templateLabel(t.template_key).toLowerCase().includes(q) ||
      (t.body ?? '').toLowerCase().includes(q)
    )
  })

  const grouped = {}
  for (const t of filtered) {
    const g = journeyGroup(t.template_key)
    if (!grouped[g]) grouped[g] = []
    grouped[g].push(t)
  }

  // Tab counts come from the full set, so the strip stays still while searching.
  const totals = {}
  for (const t of templates) {
    const g = journeyGroup(t.template_key)
    totals[g] = (totals[g] ?? 0) + 1
  }
  const presentGroups = [...JOURNEY_ORDER, 'other'].filter((g) => totals[g])
  const tabs = [
    { key: 'all', label: 'All', count: templates.length },
    ...presentGroups.map((g) => ({ key: g, label: JOURNEY_LABELS[g] ?? g, count: totals[g] })),
  ]

  // "All" keeps the labelled bands, since the list is long and mixed. A single
  // journey needs no band — the tab already says which one you are in.
  const visibleGroups = tab === 'all' ? presentGroups : [tab]
  const showBands = tab === 'all'
  const visibleCount = visibleGroups.reduce((n, g) => n + (grouped[g]?.length ?? 0), 0)
  const filtering = !!q || needsApproval

  return (
    <div className="rise flex min-h-0 flex-1 flex-col gap-4">
      {/* ── Page head ───────────────────────────────────────────────────── */}
      <header className="shrink-0 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <div>
            <h1 className="page-title">Templates</h1>
            <p className="page-lede">
              The texts each journey sends. Editing creates a new version that needs approval before it goes out.
            </p>
          </div>
          <p className="pb-0.5 text-[12.5px]" style={{ color: 'var(--ink-muted)' }}>
            <span className="tabular font-semibold" style={{ color: 'var(--ink)' }}>{templates.length}</span> templates
            {pendingCount > 0 && (
              <span style={{ color: 'var(--tone-warn-ink)' }}> · {pendingCount} awaiting approval</span>
            )}
          </p>
        </div>

        {tabs.length > 1 && (
          <div className="tabs overflow-x-auto" role="tablist" aria-label="Journey type">
            {tabs.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className="whitespace-nowrap"
              >
                {t.label}
                <span className="tabular text-[12px] font-normal" style={{ color: 'var(--ink-faint)' }}>{t.count}</span>
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="surface flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* ── Toolbar ───────────────────────────────────────────────────── */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-3" style={{ borderColor: 'var(--rule-faint)' }}>
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
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, key or wording…"
              aria-label="Search templates"
              className="field w-full pl-8"
            />
          </div>
          {pendingCount > 0 && (
            <FilterToggle checked={needsApproval} onChange={(e) => setNeedsApproval(e.target.checked)}>
              Needs approval
            </FilterToggle>
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

        <div className="min-h-0 flex-1 overflow-auto">
          {visibleCount === 0 && !fetchError ? (
            <EmptyState
              title={filtering ? 'No matching templates' : 'No templates'}
              description={
                filtering
                  ? 'Nothing here matches the search or filter.'
                  : tab === 'all'
                    ? 'The message_templates table is empty.'
                    : 'No templates are keyed to this journey yet.'
              }
              action={
                filtering ? (
                  <button type="button" onClick={() => { setQuery(''); setNeedsApproval(false) }} className="btn btn-quiet">
                    Clear filters
                  </button>
                ) : null
              }
            />
          ) : (
            <table className="data-table min-w-155">
              <thead>
                <tr>
                  <th>Template</th>
                  <th className="hidden lg:table-cell">Wording</th>
                  <th className="hidden w-20 sm:table-cell">Channel</th>
                  <th className="hidden w-16 sm:table-cell">Ver.</th>
                  <th className="w-36">Status</th>
                </tr>
              </thead>
              {visibleGroups.map((group) => {
                const items = grouped[group]
                if (!items?.length) return null
                return (
                  <tbody key={group}>
                    {showBands && (
                      <tr>
                        <td colSpan={5} className="py-2!" style={{ background: 'var(--paper-sunken)' }}>
                          <span className="text-[12px] font-semibold" style={{ color: 'var(--ink-secondary)' }}>
                            {JOURNEY_LABELS[group] ?? group}
                          </span>
                          <span className="tabular ml-2 text-[12px]" style={{ color: 'var(--ink-faint)' }}>{items.length}</span>
                        </td>
                      </tr>
                    )}
                    {items.map((t) => (
                      <tr key={t.id}>
                        <td>
                          <Link
                            href={`/templates/${encodeURIComponent(t.template_key)}`}
                            className="link-subtle font-medium"
                            title={t.template_key}
                          >
                            {templateLabel(t.template_key)}
                          </Link>
                          <div className="mono mt-0.5 text-[11px]" style={{ color: 'var(--ink-faint)' }}>
                            {t.template_key}
                          </div>
                        </td>
                        <td className="hidden max-w-md lg:table-cell">
                          <p className="line-clamp-2 text-[12.5px] leading-relaxed" style={{ color: 'var(--ink-muted)' }} title={t.body}>
                            {friendlyBody(t.body)}
                          </p>
                        </td>
                        <td className="hidden text-[12.5px] sm:table-cell" style={{ color: 'var(--ink-muted)' }}>
                          {t.channel === 'sms' ? 'SMS' : t.channel}
                        </td>
                        <td className="tabular hidden text-[12.5px] sm:table-cell" style={{ color: 'var(--ink-muted)' }}>
                          v{t.version}
                        </td>
                        <td><TemplateStatus t={t} /></td>
                      </tr>
                    ))}
                  </tbody>
                )
              })}
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
