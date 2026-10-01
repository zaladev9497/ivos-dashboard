/**
 * Empty states are where cheap UI shows most. Instead of a stray "○", this
 * draws a small engraved mark — concentric rings on sunken paper — so an empty
 * table still looks like part of the product.
 */
export default function EmptyState({ title, description, action }) {
  return (
    <div className="rise flex flex-col items-center justify-center px-6 py-14 text-center">
      <div
        className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-full"
        style={{
          background: 'var(--paper-sunken)',
          border: '1px solid var(--rule-faint)',
          boxShadow: 'inset 0 1px 2px color-mix(in oklab, var(--ink) 6%, transparent)',
        }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" style={{ color: 'var(--ink-faint)' }}>
          <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.3" opacity="0.5" />
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      </div>
      <p className="text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>
        {title}
      </p>
      {description && (
        <p className="mt-1 max-w-[34ch] text-[12.5px] leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
