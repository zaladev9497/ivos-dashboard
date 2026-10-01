'use client'
import { relativeTime, formatDate } from '@/lib/utils'
import { useMinuteClock } from '@/lib/client-store'

/**
 * Absolute time in tabular figures (so columns align), relative time beside it
 * in a lighter weight. Scanning a column gives you "when" at a glance; the
 * exact timestamp is there when you need to be precise.
 */
export default function Timestamp({ iso, className = '', inline = false }) {
  // 0 on the server / first paint, then ticks each minute, so the relative text never mismatches hydration.
  const tick = useMinuteClock()
  const rel = tick ? relativeTime(iso) : ''

  if (!iso) return <span style={{ color: 'var(--ink-faint)' }}>—</span>

  if (inline) {
    return (
      <time dateTime={iso} className={`whitespace-nowrap text-[12px] ${className}`}>
        <span className="tabular" style={{ color: 'var(--ink-secondary)' }}>
          {formatDate(iso, { timeZoneName: undefined, year: undefined })}
        </span>
        {rel && (
          <span className="ml-1.5" style={{ color: 'var(--ink-faint)' }}>
            {rel}
          </span>
        )}
      </time>
    )
  }

  return (
    <time dateTime={iso} className={`block leading-tight ${className}`}>
      <span className="tabular block text-[12px]" style={{ color: 'var(--ink-secondary)' }}>
        {formatDate(iso)}
      </span>
      <span className="block text-[11px]" style={{ color: 'var(--ink-faint)' }}>
        {rel || ' '}
      </span>
    </time>
  )
}
