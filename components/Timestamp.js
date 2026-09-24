'use client'
import { useEffect, useState } from 'react'
import { relativeTime, formatDate } from '@/lib/utils'

export default function Timestamp({ iso, className = '' }) {
  const [label, setLabel] = useState('')

  useEffect(() => {
    setLabel(relativeTime(iso))
    const id = setInterval(() => setLabel(relativeTime(iso)), 60_000)
    return () => clearInterval(id)
  }, [iso])

  if (!iso) return <span className="text-slate-400">—</span>
  return (
    <time
      dateTime={iso}
      title={formatDate(iso)}
      className={`cursor-default text-slate-500 ${className}`}
    >
      {label || '—'}
    </time>
  )
}
