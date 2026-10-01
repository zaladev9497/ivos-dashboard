'use client'

export default function Pagination({ page, total, pageSize, onPage }) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div
      className="flex shrink-0 items-center justify-between gap-3 border-t px-5 py-3"
      style={{ borderColor: 'var(--rule-faint)', background: 'var(--paper-sunken)' }}
    >
      <p className="text-[11.5px]" style={{ color: 'var(--ink-muted)' }}>
        <span className="tabular font-medium" style={{ color: 'var(--ink-secondary)' }}>
          {from.toLocaleString()}–{to.toLocaleString()}
        </span>
        {' of '}
        <span className="tabular font-medium" style={{ color: 'var(--ink-secondary)' }}>
          {total.toLocaleString()}
        </span>
      </p>

      <div className="flex items-center gap-1.5">
        <span className="eyebrow mr-1 hidden sm:inline" style={{ color: 'var(--ink-faint)' }}>
          Page {page} / {totalPages}
        </span>
        <button
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="btn btn-quiet h-7 px-2.5"
          aria-label="Previous page"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Prev
        </button>
        <button
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="btn btn-quiet h-7 px-2.5"
          aria-label="Next page"
        >
          Next
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
  )
}
