'use client'
import { useEffect, useState } from 'react'
import { relativeTime, formatDate } from '@/lib/utils'

export default function Timestamp({ iso, className = '' }) {
  const [rel, setRel] = useState('')

  useEffect(() => {
    setRel(relativeTime(iso))
    const id = setInterval(() => setRel(relativeTime(iso)), 60_000)
    return () => clearInterval(id)
  }, [iso])

  if (!iso) return <span className="text-slate-400">—</span>
  return (
    <time dateTime={iso} className={`leading-tight ${className}`}>
      <span className="text-slate-700 text-xs">{formatDate(iso)}</span>
      <span className="block text-slate-400 text-xs">{rel || ''}</span>
    </time>
  )
}
