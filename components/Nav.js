'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createStorageStore } from '@/lib/client-store'

const icon = (d) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0" aria-hidden="true">
    {d}
  </svg>
)

const links = [
  { href: '/', label: 'Leads', icon: icon(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.3c2.2.6 3.5 2.6 3.5 5.7" /></>) },
  { href: '/pipeline', label: 'Pipeline', icon: icon(<><rect x="3" y="4" width="5" height="16" rx="1" /><rect x="10" y="4" width="5" height="10" rx="1" /><rect x="17" y="4" width="4" height="6" rx="1" /></>) },
  { href: '/messages', label: 'Messages', icon: icon(<path d="M21 12a8 8 0 0 1-11.8 7L3 21l2-5.6A8 8 0 1 1 21 12z" />) },
  { href: '/ops', label: 'Operations', icon: icon(<path d="M3 12h4l3-8 4 16 3-8h4" />) },
  { href: '/templates', label: 'Templates', icon: icon(<><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>) },
  { href: '/cadence', label: 'Cadence', icon: icon(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>) },
  { href: '/audit', label: 'Audit', icon: icon(<><path d="M12 3l8 3v6c0 4.5-3.3 8-8 9-4.7-1-8-4.5-8-9V6l8-3z" /><path d="M9 12l2 2 4-4" /></>) },
  { href: '/settings', label: 'Settings', icon: icon(<><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" /></>) },
]

const COLLAPSE_KEY = 'ivos_sidebar_collapsed'

// Saved choice wins; otherwise start collapsed on narrow screens so content gets the room.
const collapseStore = createStorageStore(() => localStorage, COLLAPSE_KEY, {
  serverValue: false,
  read: (v) => (v === null ? window.matchMedia('(max-width: 767px)').matches : v === '1'),
})

function toggleTheme() {
  const dark = document.documentElement.classList.toggle('dark')
  try { localStorage.setItem('ivos_theme', dark ? 'dark' : 'light') } catch {}
}

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const collapsed = collapseStore.use()

  function toggleCollapsed() {
    collapseStore.set(!collapsed ? 1 : 0)
  }

  if (pathname === '/login') return null

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const itemBase = 'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors'
  const labelEl = (text) => <span className={collapsed ? 'sr-only' : 'truncate'}>{text}</span>

  return (
    <aside
      aria-label="Main navigation"
      className={`sticky top-0 z-40 flex h-screen shrink-0 flex-col border-r border-slate-200/70 bg-white transition-[width] duration-200 ${
        collapsed ? 'w-12' : 'w-44'
      }`}
    >
      <div className={`flex h-10 items-center px-1.5 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <span className="px-1.5 text-sm font-bold tracking-[0.2em] text-slate-800">IVOS</span>
        )}
        <button
          onClick={toggleCollapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M9 4v16" />
            <path d={collapsed ? 'M14 10l2 2-2 2' : 'M16 10l-2 2 2 2'} />
          </svg>
        </button>
      </div>

      <nav className="sidebar-scroll flex-1 space-y-0.5 overflow-y-auto px-1.5 py-1">
        {links.map(({ href, label, icon: ic }) => {
          const active =
            href === '/'
              ? pathname === '/' || pathname.startsWith('/leads')
              : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              aria-current={active ? 'page' : undefined}
              className={`${itemBase} ${collapsed ? 'justify-center' : ''} ${
                active
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              {ic}
              {labelEl(label)}
            </Link>
          )
        })}
      </nav>

      <div className="space-y-0.5 border-t border-slate-100 p-1.5">
        <button
          onClick={toggleTheme}
          title="Toggle light / dark mode"
          aria-label="Toggle light / dark mode"
          className={`${itemBase} w-full text-slate-500 hover:bg-slate-50 hover:text-slate-800 ${collapsed ? 'justify-center' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="hidden h-4 w-4 shrink-0 dark:block" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 dark:hidden" aria-hidden="true">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          </svg>
          <span className={collapsed ? 'sr-only' : 'truncate'}>
            <span className="dark:hidden">Dark mode</span>
            <span className="hidden dark:inline">Light mode</span>
          </span>
        </button>
        <button
          onClick={handleLogout}
          title="Log out"
          className={`${itemBase} w-full text-slate-500 hover:bg-slate-50 hover:text-slate-800 ${collapsed ? 'justify-center' : ''}`}
        >
          {icon(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></>)}
          {labelEl('Log out')}
        </button>
      </div>
    </aside>
  )
}
