'use client'

export default function Pagination({ page, total, pageSize, onPage }) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
      <span>
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
      </span>
      <div className="flex gap-2">
        <button
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ‹ Prev
        </button>
        <button
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next ›
        </button>
      </div>
    </div>
  )
}
