'use client'
import { usePathname } from 'next/navigation'

export default function ModeBanner({ testMode, demoMode }) {
  const pathname = usePathname()
  if (pathname === '/login' || (!testMode && !demoMode)) return null

  return (
    <div className={`shrink-0 text-center text-xs font-semibold py-1 px-4 ${
      testMode && demoMode ? 'bg-violet-600 text-white' : 'bg-amber-400 text-amber-900'
    }`}>
      {testMode && demoMode
        ? 'TEST MODE + DEMO MODE — follow-up timings are compressed to minutes'
        : 'TEST MODE — all SMS are redirected, no real customers are receiving messages'}
    </div>
  )
}
