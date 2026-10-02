'use client'
import { useState } from 'react'
import Badge from '@/components/Badge'
import TimelineIcon from './TimelineIcon'
import { formatDate, formatTime, formatDayFull, relativeTime, stageLabel } from '@/lib/utils'

function Chevron({ open }) {
  return (
    <svg
      className={`h-3.5 w-3.5 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
      style={{ color: 'var(--ink-faint)' }}
      viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"
    >
      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// A tinted note block — the shared shape for every expanded detail panel.
function Panel({ tone = 'neutral', children, className = '' }) {
  return (
    <div
      className={`mt-2 rounded-md border px-3 py-2 text-[12px] ${className}`}
      style={{
        background: `var(--tone-${tone}-soft)`,
        borderColor: `var(--tone-${tone}-rule)`,
        color: `var(--tone-${tone}-ink)`,
      }}
    >
      {children}
    </div>
  )
}

// ─── Smart payload renderer (for "Show details" expanded view) ────────────────

function renderPayload(rawKey, payload) {
  if (!payload) return null

  // brief_written / note_written
  if (rawKey === 'brief_written' || rawKey === 'note_written') {
    const errs = [
      ...(payload.graphql_errors ?? []).map(e => e?.message),
      ...(payload.user_errors ?? []).map(e => e?.message ?? JSON.stringify(e)),
    ].filter(Boolean)
    if (errs.length) {
      return (
        <Panel tone="neg" className="space-y-1">
          <p className="font-semibold">Failed to write note to Jobber</p>
          {errs.map((msg, i) => <p key={i}>{msg}</p>)}
        </Panel>
      )
    }
    return (
      <Panel tone="pos">
        Note saved to Jobber.
        {payload.note_id && <span className="mono ml-1 opacity-75">ID: {payload.note_id}</span>}
        {payload.replaced && <span className="ml-1">(replaced existing)</span>}
      </Panel>
    )
  }

  // Quote events
  if (rawKey?.includes('quote')) {
    const lines = [
      payload.quote_number && `Quote #${payload.quote_number}`,
      payload.quote_status && `Status: ${payload.quote_status}`,
      payload.quote_total != null && `Total: $${payload.quote_total}`,
      payload.expires_at && `Expires: ${formatDate(payload.expires_at)}`,
    ].filter(Boolean)
    if (lines.length) {
      return (
        <Panel className="space-y-0.5">
          {lines.map((l, i) => <p key={i}>{l}</p>)}
        </Panel>
      )
    }
  }

  // Assessment events
  if (rawKey?.includes('assessment')) {
    const lines = [
      payload.assessment_id && `Assessment ID: ${payload.assessment_id}`,
      payload.status && `Status: ${payload.status}`,
      payload.start_at && `Start: ${formatDate(payload.start_at)}`,
      payload.end_at && `End: ${formatDate(payload.end_at)}`,
    ].filter(Boolean)
    if (lines.length) {
      return (
        <Panel className="space-y-0.5">
          {lines.map((l, i) => <p key={i}>{l}</p>)}
        </Panel>
      )
    }
  }

  // Errors
  const errMsg = payload.error ?? payload.error_message ?? payload.reason
  if (errMsg) return <Panel tone="neg">{errMsg}</Panel>

  // Fallback: raw JSON
  const keys = Object.keys(payload)
  if (!keys.length) return null
  return (
    <pre
      className="mono mt-2 overflow-x-auto rounded-md px-3 py-2 text-[11px] leading-relaxed whitespace-pre-wrap wrap-break-word"
      style={{
        background: 'var(--ink)',
        color: 'var(--paper)',
        border: '1px solid var(--rule-strong)',
      }}
    >
      {JSON.stringify(payload, null, 2)}
    </pre>
  )
}

// ─── Expanded content ──────────────────────────────────────────────────────────

function ExpandedContent({ item }) {
  // Full SMS body
  if (item.body) {
    return (
      <div
        className="mt-2 rounded-md border px-3 py-2 text-[12.5px] leading-relaxed whitespace-pre-wrap"
        style={{
          background: 'var(--paper-sunken)',
          borderColor: 'var(--rule-faint)',
          color: 'var(--ink-secondary)',
        }}
      >
        {item.body}
      </div>
    )
  }

  // GlassHouse conversation bubbles
  if (item.ghConversation?.length > 0) {
    return (
      <div className="mt-2 space-y-1.5">
        {item.ghConversation.map((msg, i) => {
          const inbound = msg.direction === 'inbound'
          return (
            <div key={i} className={`flex ${inbound ? 'justify-start' : 'justify-end'}`}>
              <div
                className="max-w-sm rounded-[9px] px-3 py-1.5 text-[12px]"
                style={
                  inbound
                    ? {
                        background: 'var(--paper-sunken)',
                        border: '1px solid var(--rule-faint)',
                        color: 'var(--ink-secondary)',
                        borderBottomLeftRadius: 3,
                      }
                    : {
                        background: 'var(--accent)',
                        color: 'var(--on-signal)',
                        borderBottomRightRadius: 3,
                      }
                }
              >
                <p className="leading-relaxed">{msg.displayContent}</p>
                <p className="mt-0.5 text-[10px] opacity-65">{formatDate(msg.createdAt)}</p>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Smart payload rendering
  if (item.payload) {
    const rendered = renderPayload(item.rawKey, item.payload)
    if (rendered) return rendered
  }

  // Raw key fallback
  if (item.rawKey) {
    return <p className="mono mt-2 text-[11px]" style={{ color: 'var(--ink-faint)' }}>{item.rawKey}</p>
  }

  return (
    <p className="mt-2 text-[11.5px] italic" style={{ color: 'var(--ink-faint)' }}>
      No additional data stored.
    </p>
  )
}

function hasExpandable(item) {
  return !!(item.body || item.payload || item.ghConversation?.length)
}

// ─── Entry ─────────────────────────────────────────────────────────────────────

export default function TimelineEntry({ item, showDate = false }) {
  const [open, setOpen] = useState(false)
  const expandable = hasExpandable(item)

  // Redirect note: neutral amber instead of red
  const isRedirectedOnly = item.redirected && !item.failed

  const summaryColor = item.redirected
    ? 'var(--tone-warn-ink)'
    : item.status === 'failed' || item.type === 'exception'
    ? 'var(--tone-neg-ink)'
    : 'var(--ink-muted)'

  const muted = item.status === 'suppressed' || item.status === 'cancelled'

  return (
    <div className={`flex gap-3 py-2.5 ${item.upcoming ? 'opacity-80' : ''}`}>
      {/* Icon sits above the spine, with a paper ring punching the line out. */}
      <div className="relative z-1 mt-px shrink-0 rounded-full" style={{ boxShadow: '0 0 0 3px var(--paper-raised)' }}>
        <TimelineIcon kind={item.kind} tone={item.tone} />
      </div>

      <div className="min-w-0 flex-1">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {expandable ? (
              <button
                type="button"
                onClick={() => setOpen(v => !v)}
                aria-expanded={open}
                className="text-left text-[13px] font-semibold leading-snug transition-colors hover:text-[var(--accent)]"
                style={{ color: 'var(--ink)' }}
              >
                {item.title}
              </button>
            ) : (
              <span className="text-[13px] font-semibold leading-snug" style={{ color: 'var(--ink)' }}>
                {item.title}
              </span>
            )}
            {item.status && !isRedirectedOnly && (
              <Badge label={stageLabel(item.status)} status={item.status} />
            )}
          </div>

          {/* Timestamp + expand button */}
          <div className="flex shrink-0 items-start gap-1">
            <time dateTime={item.ts} className="text-right leading-tight">
              {item.demoMode ? (
                <>
                  <span className="block text-[11.5px] font-medium" style={{ color: 'var(--signal-alt)' }}>
                    {relativeTime(item.ts)}
                  </span>
                  {item.productionDue && (
                    <span className="block text-[10px]" style={{ color: 'var(--ink-faint)' }}>
                      Prod: {formatDayFull(item.productionDue)}
                    </span>
                  )}
                </>
              ) : showDate ? (
                <>
                  <span className="tabular block text-[11.5px]" style={{ color: 'var(--ink-muted)' }}>
                    {formatDate(item.ts)}
                  </span>
                  <span className="block text-[10.5px]" style={{ color: 'var(--ink-faint)' }}>
                    {relativeTime(item.ts)}
                  </span>
                </>
              ) : (
                <span className="tabular text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>
                  {formatTime(item.ts)}
                </span>
              )}
            </time>
            {expandable && (
              <button
                onClick={() => setOpen(v => !v)}
                className="btn btn-ghost mt-px h-5 w-5 p-0!"
                tabIndex={-1}
                aria-hidden="true"
              >
                <Chevron open={open} />
              </button>
            )}
          </div>
        </div>

        {/* One-line summary — always visible, no expansion needed */}
        {item.summary && (
          <p
            className={`mt-0.5 text-[12px] leading-relaxed ${muted ? 'italic' : ''}`}
            style={{ color: muted ? 'var(--ink-faint)' : summaryColor }}
          >
            {item.summary}
          </p>
        )}

        {open && <ExpandedContent item={item} />}
      </div>
    </div>
  )
}
