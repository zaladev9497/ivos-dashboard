import Link from 'next/link'

export const metadata = { title: 'Not found' }

export default function NotFound() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-4">
      <div className="surface rise w-full max-w-sm p-7 text-center">
        {/* The numeral is set in the display face at a size that makes it a
            graphic element rather than an error code. */}
        <p
          className="stat-figure mx-auto"
          style={{ fontSize: '2.75rem', color: 'var(--ink-faint)', opacity: 0.55 }}
        >
          404
        </p>
        <div className="rule-fade mx-auto my-4 w-16" />
        <h1 className="text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>
          Page not found
        </h1>
        <p className="mx-auto mt-1.5 max-w-[32ch] text-[12.5px] leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
          That page or record doesn&apos;t exist, or it was removed.
        </p>
        <Link href="/" className="btn btn-primary mt-5">
          Back to leads
        </Link>
      </div>
    </div>
  )
}
