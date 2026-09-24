'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { retryScheduledMessage } from './actions'

export default function RetryButton({ id }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleRetry() {
    setSaving(true); setError(null)
    const res = await retryScheduledMessage({ id })
    setSaving(false)
    if (res.error) { setError(res.error); return }
    router.refresh()
  }

  return (
    <div>
      <button
        onClick={handleRetry}
        disabled={saving}
        className="rounded border border-blue-300 px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-50 disabled:opacity-40"
      >
        {saving ? '…' : 'Retry'}
      </button>
      {error && <p className="text-xs text-red-600 mt-0.5">{error}</p>}
    </div>
  )
}
