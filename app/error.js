'use client'
import { useEffect } from 'react'
import Link from 'next/link'

// Catches runtime errors in any page. The sidebar (root layout) stays usable.
export default function Error({ error, retry }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-4">
      <div className="surface rise w-full max-w-md p-7 text-center">
        <div
          className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: 'var(--signal-neg-soft)', border: '1px solid var(--signal-neg-rule)' }}
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5" style={{ color: 'var(--signal-neg)' }}>
            <path d="M12 8v5M12 16.5v.01" />
            <path d="M10.3 3.9 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
          </svg>
        </div>
        <h1 className="text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>
          Something went wrong
        </h1>
        <p className="mx-auto mt-1.5 max-w-[42ch] text-[12.5px] leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
          This page could not be loaded. The problem has been logged. Try again, and if it keeps happening, tell the team
          {error?.digest ? (
            <> and quote <span className="mono" style={{ color: 'var(--ink-secondary)' }}>{error.digest}</span></>
          ) : null}.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <button onClick={() => retry()} className="btn btn-primary">
            Try again
          </button>
          <Link href="/" className="btn btn-quiet">
            Go to leads
          </Link>
        </div>
      </div>
    </div>
  )
}
