'use client'
import { statusClass } from '@/lib/utils'

export default function Badge({ label, status, className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusClass(status)} ${className}`}
    >
      {label ?? status}
    </span>
  )
}
