'use client'
import { useState } from 'react'
import Badge from '@/components/Badge'
import { formatDate, relativeTime } from '@/lib/utils'

function Chevron({ open }) {
  return (
    <svg
      className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PayloadBlock({ data }) {
  if (!data || Object.keys(data).length === 0) return null
  return (
    <pre className="mt-2 rounded bg-slate-900 text-slate-100 text-xs px-3 py-2 overflow-x-auto whitespace-pre-wrap break-all">
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}

function ExpandedContent({ item }) {
  // SMS body
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

  // Generic payload
  if (item.payload) {
    return <PayloadBlock data={item.payload} />
  }

  return <p className="mt-2 text-xs text-slate-400 italic">No additional data.</p>
}

function hasExpandable(item) {
  return !!(item.body || item.payload || item.ghConversation?.length)
}

export default function TimelineEntry({ item }) {
  const [open, setOpen] = useState(false)
  const expandable = hasExpandable(item)

  return (
    <div className={`flex gap-3 ${item.upcoming ? 'opacity-70' : ''}`}>
      {/* Icon */}
      <div className="flex-shrink-0 w-6 text-center mt-0.5">
        <span className={`text-base font-mono ${item.iconColor}`}>{item.icon}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-5">
        {/* Header row */}
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

        {/* Detail line */}
        {item.detail && (
          <p className="mt-0.5 text-xs text-slate-500">{item.detail}</p>
        )}

        {/* Click-to-expand hint when collapsed */}
        {expandable && !open && (
          <button
            onClick={() => setOpen(true)}
            className="mt-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Show details ›
          </button>
        )}

        {/* Expanded content */}
        {open && <ExpandedContent item={item} />}
      </div>
    </div>
  )
}
