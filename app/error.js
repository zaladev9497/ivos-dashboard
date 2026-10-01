'use client'
import { useEffect } from 'react'
import Link from 'next/link'

// Catches runtime errors in any page. The sidebar (root layout) stays usable.
export default function Error({ error, retry }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center">
      <div className="w-full max-w-md rounded-md border border-slate-200 bg-white p-5 text-center">
        <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-600 ring-1 ring-inset ring-red-200" aria-hidden="true">
          !
        </div>
        <h1 className="text-sm font-semibold text-slate-800">Something went wrong</h1>
        <p className="mt-1 text-[13px] text-slate-500">
          This page could not be loaded. The problem has been logged. Try again, and if it keeps happening, tell the team
          {error?.digest ? <> and quote <span className="font-mono text-slate-700">{error.digest}</span></> : null}.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <button
            onClick={() => retry()}
            className="rounded bg-slate-800 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-slate-700"
          >
            Try again
          </button>
          <Link href="/" className="rounded px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-100">
            Go to leads
          </Link>
        </div>
      </div>
    </div>
  )
}
