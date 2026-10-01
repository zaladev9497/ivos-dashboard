// Shown instantly while a page streams in. Mirrors the toolbar + table layout so nothing jumps.
export default function Loading() {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-slate-200 bg-white"
      role="status"
      aria-label="Loading"
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-3 py-2">
        <div className="h-8 w-56 animate-pulse rounded bg-slate-100" />
        <div className="h-8 w-28 animate-pulse rounded bg-slate-100" />
        <div className="h-8 w-28 animate-pulse rounded bg-slate-100" />
        <div className="ml-auto h-4 w-16 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="h-8 shrink-0 bg-slate-50" />
      <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-3 py-2.5">
            <div className="h-3.5 w-40 animate-pulse rounded bg-slate-100" />
            <div className="hidden h-3.5 w-28 animate-pulse rounded bg-slate-100 md:block" />
            <div className="hidden h-5 w-20 animate-pulse rounded bg-slate-100 sm:block" />
            <div className="ml-auto h-5 w-14 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  )
}
