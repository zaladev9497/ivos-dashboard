'use client'
import { relativeTime, formatDate } from '@/lib/utils'

export default function Timestamp({ iso, className = '' }) {
  if (!iso) return <span className="text-slate-400">—</span>
  return (
    <time
      dateTime={iso}
      title={formatDate(iso)}
      className={`cursor-default text-slate-500 ${className}`}
    >
      {relativeTime(iso)}
    </time>
  )
}
