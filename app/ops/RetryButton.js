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
    <div className="inline-flex flex-col items-end">
      <button onClick={handleRetry} disabled={saving} className="btn btn-quiet h-7 px-2.5 text-[12px]">
        {saving ? 'Retrying…' : 'Retry'}
      </button>
      {error && (
        <p className="mt-0.5 text-[11.5px]" style={{ color: 'var(--tone-neg-ink)' }}>{error}</p>
      )}
    </div>
  )
}
