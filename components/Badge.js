'use client'
import { statusTone } from '@/lib/utils'

/**
 * A status stamp. The coloured dot carries the signal so the pill itself can
 * stay quiet at table density — a grid of these reads as a column of states,
 * not as a row of coloured rectangles.
 *
 * `dot={false}` for pills that are labels rather than states (journey type).
 */
export default function Badge({ label, status, className = '', dot = true }) {
  const tone = statusTone(status)

  return (
    <span
      className={`badge ${className}`}
      style={{
        color: `var(--${tone}-ink)`,
        background: `var(--${tone}-soft)`,
        borderColor: `var(--${tone}-rule)`,
      }}
    >
      {dot && <span className="badge-dot" />}
      {label ?? status}
    </span>
  )
}
