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
        className="btn h-6 px-2 text-[11px]"
        style={{
          background: 'transparent',
          border: '1px solid var(--signal-info-rule)',
          color: 'var(--tone-info-ink)',
        }}
      >
        {saving ? '…' : 'Retry'}
      </button>
      {error && (
        <p className="mt-0.5 text-[11px]" style={{ color: 'var(--tone-neg-ink)' }}>{error}</p>
      )}
    </div>
  )
}
