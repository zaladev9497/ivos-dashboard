'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'Leads' },
  { href: '/pipeline', label: 'Pipeline' },
  { href: '/messages', label: 'Messages' },
  { href: '/ops', label: 'Operations' },
]

export default function Nav({ testMode }) {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-screen-xl items-center gap-6 px-4 py-2">
        <span className="text-sm font-semibold text-slate-800 tracking-tight">
          IVOS
        </span>
        <nav className="flex gap-1">
          {links.map(({ href, label }) => {
            const active =
              href === '/'
                ? pathname === '/' || pathname.startsWith('/leads')
                : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </nav>
        {testMode && (
          <span className="ml-auto rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-300">
            TEST MODE
          </span>
        )}
      </div>
    </header>
  )
}
