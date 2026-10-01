import Link from 'next/link'

export const metadata = { title: 'Not found' }

export default function NotFound() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center">
      <div className="w-full max-w-sm rounded-md border border-slate-200 bg-white p-5 text-center">
        <p className="text-2xl font-semibold text-slate-300">404</p>
        <h1 className="mt-1 text-sm font-semibold text-slate-800">Page not found</h1>
        <p className="mt-1 text-[13px] text-slate-500">That page or record doesn&apos;t exist, or it was removed.</p>
        <Link href="/" className="mt-4 inline-block rounded bg-slate-800 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-slate-700">
          Back to leads
        </Link>
      </div>
    </div>
  )
}
