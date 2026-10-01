'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { acknowledgeException, resolveException } from './actions'

export default function ExceptionActions({ id, state }) {
  const router = useRouter()
  const [resolveOpen, setResolveOpen] = useState(false)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleAck() {
    setSaving(true); setError(null)
    const res = await acknowledgeException({ id })
    setSaving(false)
    if (res.error) { setError(res.error); return }
    router.refresh()
  }

  async function handleResolve() {
    setSaving(true); setError(null)
    const res = await resolveException({ id, note })
    setSaving(false)
    if (res.error) { setError(res.error); return }
    setResolveOpen(false); setNote(''); router.refresh()
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-1.5">
        {state === 'open' && (
          <button onClick={handleAck} disabled={saving} className="btn btn-quiet h-6 px-2 text-[11px]">
            Ack
          </button>
        )}
        <button
          onClick={() => setResolveOpen(v => !v)}
          className="btn h-6 px-2 text-[11px]"
          style={{
            background: 'transparent',
            border: '1px solid var(--signal-pos-rule)',
            color: 'var(--tone-pos-ink)',
          }}
        >
          Resolve
        </button>
      </div>
      {resolveOpen && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Resolution note (optional)"
            className="field h-6 w-48 text-[11.5px]"
          />
          <button
            onClick={handleResolve}
            disabled={saving}
            className="btn h-6 px-2 text-[11px]"
            style={{
              background: 'var(--signal-pos)',
              border: '1px solid var(--signal-pos)',
              color: 'var(--on-signal)',
            }}
          >
            {saving ? '…' : 'Save'}
          </button>
          <button
            onClick={() => setResolveOpen(false)}
            className="btn btn-ghost h-6 w-6 p-0! text-[11px]"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}
      {error && (
        <p className="text-[11px]" style={{ color: 'var(--tone-neg-ink)' }}>{error}</p>
      )}
    </div>
  )
}
