'use client'
import { usePathname } from 'next/navigation'

/**
 * A standing warning that the app is not talking to real customers. It has to
 * be impossible to miss but must not shout over the content all day — so it is
 * a thin tinted strip with a steady dot, not a saturated slab or an animation.
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
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: `var(--signal-${tone})` }}
        aria-hidden="true"
      />
      <span className="eyebrow" style={{ color: 'inherit' }}>
        {both ? 'Test + Demo' : 'Test mode'}
      </span>
      <span style={{ opacity: 0.4 }}>·</span>
      <span>
        {both
          ? 'Follow-up timings are compressed to minutes.'
          : 'SMS are redirected. No real customers receive messages.'}
      </span>
    </div>
  )
}
