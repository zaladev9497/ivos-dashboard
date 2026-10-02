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
    <div className="flex flex-col items-end gap-1.5">
      {!resolveOpen ? (
        <div className="flex items-center gap-1.5">
          {state === 'open' && (
            <button onClick={handleAck} disabled={saving} className="btn btn-ghost h-7 px-2.5 text-[12px]">
              Acknowledge
            </button>
          )}
          <button onClick={() => setResolveOpen(true)} className="btn btn-quiet h-7 px-2.5 text-[12px]">
            Resolve
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => { e.preventDefault(); handleResolve() }}
          className="flex items-center gap-1.5"
        >
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Note (optional)"
            aria-label="Resolution note"
            autoFocus
            className="field h-7 w-40 text-[12px]"
          />
          <button type="submit" disabled={saving} className="btn btn-primary h-7 px-2.5 text-[12px]">
            {saving ? 'Saving…' : 'Resolve'}
          </button>
          <button
            type="button"
            onClick={() => { setResolveOpen(false); setError(null) }}
            className="btn btn-ghost h-7 w-7 p-0!"
            aria-label="Cancel"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3.5 w-3.5" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </form>
      )}
      {error && (
        <p className="text-[11.5px]" style={{ color: 'var(--tone-neg-ink)' }}>{error}</p>
      )}
    </div>
  )
}
