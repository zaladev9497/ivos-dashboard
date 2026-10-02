'use client'
import { useState } from 'react'
import Link from 'next/link'
import Badge from '@/components/Badge'
import EmptyState from '@/components/EmptyState'
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

export default function TemplatesView({ templates, fetchError }) {
  const [tab, setTab] = useState('all')

  const grouped = {}
  for (const t of templates) {
    const g = journeyGroup(t.template_key)
    if (!grouped[g]) grouped[g] = []
    grouped[g].push(t)
  }

  // Only offer a tab for a journey that actually has templates, so the strip
  // never advertises an empty room.
  const presentGroups = [...JOURNEY_ORDER, 'other'].filter(g => grouped[g]?.length)
  const tabs = [
    { key: 'all', label: 'All', count: templates.length },
    ...presentGroups.map(g => ({ key: g, label: JOURNEY_LABELS[g] ?? g, count: grouped[g].length })),
  ]

  // "All" keeps the labelled bands, since the list is long and mixed. A single
  // journey needs no band — the tab already says which one you are in.
  const visibleGroups = tab === 'all' ? presentGroups : [tab]
  const showBands = tab === 'all'
  const visibleCount = visibleGroups.reduce((n, g) => n + (grouped[g]?.length ?? 0), 0)

  return (
    <div className="surface rise flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className="flex shrink-0 flex-wrap items-baseline gap-x-4 gap-y-1.5 border-b px-5 py-4"
        style={{ borderColor: 'var(--rule-faint)' }}
      >
        <h1 className="page-title text-[15px]">Message templates</h1>
        <p className="text-[12px]" style={{ color: 'var(--ink-muted)' }}>
          Editing bumps the version and requires re-approval before messages send.
        </p>
        <span className="eyebrow ml-auto">
          <span className="tabular" style={{ color: 'var(--ink-secondary)' }}>{templates.length}</span>
          {' '}template{templates.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Journey tabs — the list is long enough that scrolling to find the
          New Construction band was the slow path. */}
      {tabs.length > 1 && (
        <div
          className="shrink-0 overflow-x-auto border-b px-5 py-3"
          style={{ borderColor: 'var(--rule-faint)' }}
        >
          <div className="segmented" role="tablist" aria-label="Journey type">
            {tabs.map(t => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className="whitespace-nowrap"
              >
                {t.label}
                <span className="counter" style={{ background: 'transparent' }}>{t.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {fetchError && (
        <div
          className="shrink-0 border-b px-5 py-3 text-[12.5px]"
          style={{
            borderColor: 'var(--signal-neg-rule)',
            background: 'var(--signal-neg-soft)',
            color: 'var(--tone-neg-ink)',
          }}
        >
          {fetchError}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto">
        {visibleCount === 0 && !fetchError ? (
          <EmptyState
            title={tab === 'all' ? 'No templates' : `No ${JOURNEY_LABELS[tab] ?? tab} templates`}
            description={
              tab === 'all'
                ? 'The message_templates table is empty.'
                : 'No templates are keyed to this journey yet.'
            }
          />
        ) : (
          <table className="data-table min-w-155">
            <thead>
              <tr>
                <th>Template</th>
                <th>Channel</th>
                <th className="hidden sm:table-cell">Version</th>
                <th>Approved</th>
                <th className="hidden md:table-cell">Active</th>
                <th className="hidden lg:table-cell">Preview</th>
              </tr>
            </thead>
            {visibleGroups.map((group) => {
              const items = grouped[group]
              if (!items?.length) return null
              return (
                <tbody key={group}>
                  {showBands && (
                    /* Group rule: a labelled band, so a long list stays navigable. */
                    <tr>
                      <td
                        colSpan={6}
                        className="py-1.5!"
                        style={{ background: 'var(--paper-sunken)', borderColor: 'var(--rule-faint)' }}
                      >
                        <span className="eyebrow">{JOURNEY_LABELS[group] ?? group}</span>
                        <span className="counter ml-2">{items.length}</span>
                      </td>
                    </tr>
                  )}
                  {items.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <Link
                          href={`/templates/${encodeURIComponent(t.template_key)}`}
                          className="link-subtle"
                          title={t.template_key}
                        >
                          {templateLabel(t.template_key)}
                        </Link>
                        <div className="mono mt-0.5 text-[10.5px]" style={{ color: 'var(--ink-faint)' }}>
                          {t.template_key}
                        </div>
                      </td>
                      <td>
                        <Badge label={t.channel} status={t.channel === 'sms' ? 'sent' : 'pending'} />
                      </td>
                      <td className="tabular hidden text-[12px] sm:table-cell" style={{ color: 'var(--ink-muted)' }}>
                        v{t.version}
                      </td>
                      <td>
                        {t.approved
                          ? <Badge label="Approved" status="sent" />
                          : <Badge label="Not approved" status="failed" />}
                      </td>
                      <td className="hidden md:table-cell">
                        {t.is_active
                          ? <Badge label="Active" status="active" />
                          : <Badge label="Inactive" status="cancelled" />}
                      </td>
                      <td className="hidden max-w-xs lg:table-cell">
                        <p className="truncate text-[12px]" style={{ color: 'var(--ink-muted)' }} title={t.body}>
                          {friendlyBody(t.body).substring(0, 90)}{t.body?.length > 90 ? '…' : ''}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              )
            })}
          </table>
        )}
      </div>
    </div>
  )
}
