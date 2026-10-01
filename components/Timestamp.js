'use client'
import { relativeTime, formatDate } from '@/lib/utils'
import { useMinuteClock } from '@/lib/client-store'

export default function Timestamp({ iso, className = '', inline = false }) {
  // 0 on the server / first paint, then ticks each minute, so the relative text never mismatches hydration.
  const tick = useMinuteClock()
  const rel = tick ? relativeTime(iso) : ''

  if (!iso) return <span className="text-slate-400">—</span>
  if (inline) {
    return (
      <time dateTime={iso} className={`whitespace-nowrap text-xs ${className}`}>
        <span className="text-slate-700">{formatDate(iso, { timeZoneName: undefined, year: undefined })}</span>
        <span className="ml-1.5 text-slate-400">{rel}</span>
      </time>
    )
  }
  return (
    <time dateTime={iso} className={`leading-tight ${className}`}>
      <span className="text-slate-700 text-xs">{formatDate(iso)}</span>
      <span className="block text-slate-400 text-xs">{rel || ''}</span>
    </time>
  )
}
