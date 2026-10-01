'use client'
import { usePathname } from 'next/navigation'

/**
 * A standing warning that the app is not talking to real customers. It has to
 * be impossible to miss but must not shout over the content all day — so it is
 * a thin tinted strip with a pulsing dot, not a saturated slab.
 */
export default function ModeBanner({ testMode, demoMode }) {
  const pathname = usePathname()
  if (pathname === '/login' || (!testMode && !demoMode)) return null

  const both = testMode && demoMode
  const tone = both ? 'alt' : 'warn'

  return (
    <div
      role="status"
      className="flex shrink-0 items-center justify-center gap-2 border-b px-4 py-1.25 text-[11.5px] font-medium tracking-[0.01em]"
      style={{
        background: `var(--signal-${tone}-soft)`,
        borderColor: `var(--signal-${tone}-rule)`,
        color: `var(--tone-${tone}-ink)`,
      }}
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden="true">
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
          style={{ background: `var(--signal-${tone})` }}
        />
        <span
          className="relative inline-flex h-1.5 w-1.5 rounded-full"
          style={{ background: `var(--signal-${tone})` }}
        />
      </span>
      <span className="eyebrow" style={{ color: 'inherit' }}>
        {both ? 'Test + Demo' : 'Test mode'}
      </span>
      <span style={{ opacity: 0.4 }}>·</span>
      <span>
        {both
          ? 'follow-up timings are compressed to minutes'
          : 'all SMS are redirected — no real customers are receiving messages'}
      </span>
    </div>
  )
}
