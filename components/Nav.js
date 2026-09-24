'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const links = [
  { href: '/', label: 'Leads' },
  { href: '/pipeline', label: 'Pipeline' },
  { href: '/messages', label: 'Messages' },
  { href: '/ops', label: 'Operations' },
  { href: '/templates', label: 'Templates' },
  { href: '/cadence', label: 'Cadence' },
  { href: '/audit', label: 'Audit' },
  { href: '/settings', label: 'Settings' },
]

export default function Nav({ testMode }) {
  const pathname = usePathname()
  const router = useRouter()

  if (pathname === '/login') return null

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      {testMode && (
        <div className="bg-amber-400 text-amber-900 text-center text-xs font-semibold py-1 px-4">
          TEST MODE — all SMS are redirected, no real customers are receiving messages
        </div>
      )}
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2">
        <span className="text-sm font-semibold text-slate-800 tracking-tight shrink-0">
          IVOS
        </span>
        <nav className="flex gap-0.5 flex-wrap min-w-0">
          {links.map(({ href, label }) => {
            const active =
              href === '/'
                ? pathname === '/' || pathname.startsWith('/leads')
                : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`rounded px-2.5 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
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
        <button
          onClick={handleLogout}
          className="ml-auto shrink-0 rounded px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          Log out
        </button>
      </div>
    </header>
  )
}
