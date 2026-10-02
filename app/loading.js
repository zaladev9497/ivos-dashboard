// Shown instantly while a page streams in. Mirrors the page head + toolbar +
// table layout so nothing jumps when real content arrives.
export default function Loading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4" role="status" aria-label="Loading">
      <div className="shrink-0 space-y-2 pb-0.5">
        <div className="skeleton h-6 w-32" />
        <div className="skeleton h-3.5 w-72" />
      </div>

    <div className="surface flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className="flex shrink-0 items-center gap-2 border-b px-4 py-3"
        style={{ borderColor: 'var(--rule-faint)' }}
      >
        <div className="skeleton h-8 w-60" />
        <div className="skeleton h-8 w-28" />
        <div className="skeleton h-8 w-28" />
        <div className="skeleton ml-auto h-4 w-16" />
      </div>

      <div className="h-[33px] shrink-0" style={{ background: 'var(--paper-sunken)' }} />

      <div className="min-h-0 flex-1 overflow-hidden">
        {Array.from({ length: 14 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b px-4 py-[13px]"
            style={{
              borderColor: 'var(--rule-faint)',
              // Rows fade out down the page so the skeleton reads as depth
              // rather than as a solid block of grey bars.
              opacity: Math.max(0.2, 1 - i * 0.062),
            }}
          >
            <div className="skeleton h-3.5 w-44" />
            <div className="skeleton hidden h-3.5 w-28 md:block" />
            <div className="skeleton hidden h-5 w-24 rounded-full sm:block" />
            <div className="skeleton ml-auto h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>

    </div>

      <span className="sr-only">Loading…</span>
    </div>
  )
}
