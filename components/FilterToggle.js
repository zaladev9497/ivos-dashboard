'use client'

/**
 * A filter that switches on and off — reads as one chip with a check, not a
 * loose browser checkbox. Shared by every list toolbar so they all match.
 */
export default function FilterToggle({ checked, onChange, children }) {
  return (
    <label
      className="btn h-8 cursor-pointer select-none px-2.5 text-[12.5px]"
      style={{
        background: checked ? 'var(--accent-soft)' : 'var(--paper-raised)',
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: checked ? 'var(--accent-rule)' : 'var(--rule)',
        color: checked ? 'var(--accent-ink)' : 'var(--ink-muted)',
        boxShadow: 'var(--lift-flat)',
      }}
    >
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span
        className="flex h-3.5 w-3.5 items-center justify-center rounded-[4px] border transition-colors"
        style={{
          borderColor: checked ? 'var(--accent)' : 'var(--rule-strong)',
          background: checked ? 'var(--accent)' : 'transparent',
        }}
        aria-hidden="true"
      >
        {checked && (
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--paper-raised)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        )}
      </span>
      {children}
    </label>
  )
}
