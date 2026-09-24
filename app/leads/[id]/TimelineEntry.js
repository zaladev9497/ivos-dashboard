'use client'
import { useState } from 'react'
import Badge from '@/components/Badge'
import { formatDate, relativeTime } from '@/lib/utils'

function Chevron({ open }) {
  return (
    <svg
      className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
      viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"
    >
      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Smart payload renderers per event type ────────────────────────────────────

function renderPayload(type, payload) {
  if (!payload) return null

  // brief_written — Jobber note write attempt
  if (type === 'brief_written' || type === 'note_written') {
    const gqlErrors = payload.graphql_errors ?? []
    const userErrors = payload.user_errors ?? []
    const allErrors = [
      ...gqlErrors.map((e) => e?.message).filter(Boolean),
      ...userErrors.map((e) => e?.message ?? JSON.stringify(e)).filter(Boolean),
    ]
    if (allErrors.length > 0) {
      return (
        <div className="mt-2 rounded bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-700 space-y-1">
          <p className="font-semibold">Failed to write note to Jobber</p>
          {allErrors.map((msg, i) => <p key={i}>{msg}</p>)}
        </div>
      )
    }
    return (
      <div className="mt-2 rounded bg-green-50 border border-green-100 px-3 py-2 text-xs text-green-700">
        Note saved to Jobber.
        {payload.note_id && (
          <span className="ml-1 text-green-500 font-mono">ID: {payload.note_id}</span>
        )}
        {payload.replaced && <span className="ml-1">(replaced existing note)</span>}
      </div>
    )
  }

  // SMS sent / received — show body text
  if (payload.body || payload.text || payload.message) {
    return (
      <div className="mt-2 rounded bg-slate-50 border border-slate-100 px-3 py-2 text-xs text-slate-700 whitespace-pre-wrap">
        {payload.body ?? payload.text ?? payload.message}
      </div>
    )
  }

  // quote events
  if (type?.includes('quote')) {
    const lines = [
      payload.quote_number && `Quote #${payload.quote_number}`,
      payload.quote_status && `Status: ${payload.quote_status}`,
      payload.quote_total != null && `Total: $${payload.quote_total}`,
      payload.sent_to && `Sent to: ${payload.sent_to}`,
      payload.expires_at && `Expires: ${formatDate(payload.expires_at)}`,
    ].filter(Boolean)
    if (lines.length) {
      return (
        <div className="mt-2 rounded bg-slate-50 border border-slate-100 px-3 py-2 text-xs text-slate-700 space-y-0.5">
          {lines.map((l, i) => <p key={i}>{l}</p>)}
        </div>
      )
    }
  }

  // assessment events
  if (type?.includes('assessment')) {
    const lines = [
      payload.assessment_id && `Assessment ID: ${payload.assessment_id}`,
      payload.status && `Status: ${payload.status}`,
      payload.start_at && `Start: ${formatDate(payload.start_at)}`,
      payload.end_at && `End: ${formatDate(payload.end_at)}`,
    ].filter(Boolean)
    if (lines.length) {
      return (
        <div className="mt-2 rounded bg-slate-50 border border-slate-100 px-3 py-2 text-xs text-slate-700 space-y-0.5">
          {lines.map((l, i) => <p key={i}>{l}</p>)}
        </div>
      )
    }
  }

  // errors / exceptions — surface them clearly
  const errorMsg = payload.error ?? payload.error_message ?? payload.reason
  if (errorMsg) {
    return (
      <div className="mt-2 rounded bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-700">
        {errorMsg}
      </div>
    )
  }

  // fallback: raw JSON but only if there's something meaningful
  const keys = Object.keys(payload)
  if (keys.length === 0) return null
  return (
    <pre className="mt-2 rounded bg-slate-900 text-slate-100 text-xs px-3 py-2 overflow-x-auto whitespace-pre-wrap wrap-break-word">
      {JSON.stringify(payload, null, 2)}
    </pre>
  )

}

// ─── Expanded content ──────────────────────────────────────────────────────────

function ExpandedContent({ item }) {
  // SMS body stored directly on item
  if (item.body) {
    return (
      <div className="mt-2 rounded bg-slate-50 border border-slate-100 px-3 py-2 text-xs text-slate-700 whitespace-pre-wrap">
        {item.body}
      </div>
    )
  }

  // GlassHouse conversation
  if (item.ghConversation?.length > 0) {
    return (
      <div className="mt-2 space-y-1.5">
        {item.ghConversation.map((msg, i) => (
          <div key={i} className={`flex ${msg.direction === 'inbound' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-sm rounded px-2.5 py-1.5 text-xs ${
              msg.direction === 'inbound' ? 'bg-slate-100 text-slate-700' : 'bg-blue-600 text-white'
            }`}>
              <p>{msg.displayContent}</p>
              <p className="mt-0.5 opacity-60 text-[10px]">{formatDate(msg.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Smart payload rendering
  if (item.payload) {
    const rendered = renderPayload(item.type === 'lead_event' ? item.title : item.type, item.payload)
    if (rendered) return rendered
  }

  return <p className="mt-2 text-xs text-slate-400 italic">No additional data stored.</p>
}

function hasExpandable(item) {
  return !!(item.body || item.payload || item.ghConversation?.length)
}

// ─── Entry ─────────────────────────────────────────────────────────────────────

export default function TimelineEntry({ item }) {
  const [open, setOpen] = useState(false)
  const expandable = hasExpandable(item)

  return (
    <div className={`flex gap-3 ${item.upcoming ? 'opacity-70' : ''}`}>
      <div className="shrink-0 w-6 text-center mt-0.5">
        <span className={`text-base font-mono ${item.iconColor}`}>{item.icon}</span>
      </div>

      <div className="flex-1 min-w-0 pb-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="font-medium text-sm text-slate-800">{item.title}</span>
            {item.status && <Badge label={item.status} status={item.status} />}
            {item.source && (
              <span className="text-xs text-slate-400 font-mono">{item.source}</span>
            )}
          </div>
          <div className="flex items-start gap-2 shrink-0">
            <time dateTime={item.ts} className="text-right leading-tight">
              <span className="block text-xs text-slate-500">{formatDate(item.ts)}</span>
              <span className="block text-xs text-slate-400">{relativeTime(item.ts)}</span>
            </time>
            {expandable && (
              <button
                onClick={() => setOpen((v) => !v)}
                className="mt-0.5 p-0.5 rounded hover:bg-slate-100 transition-colors"
                aria-label={open ? 'Collapse' : 'Expand'}
              >
                <Chevron open={open} />
              </button>
            )}
          </div>
        </div>

        {item.detail && (
          <p className="mt-0.5 text-xs text-slate-500">{item.detail}</p>
        )}

        {expandable && !open && (
          <button
            onClick={() => setOpen(true)}
            className="mt-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Show details ›
          </button>
        )}

        {open && <ExpandedContent item={item} />}
      </div>
    </div>
  )
}
