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
      <div className="flex items-center gap-1.5 flex-wrap">
        {state === 'open' && (
          <button
            onClick={handleAck}
            disabled={saving}
            className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          >
            Ack
          </button>
        )}
        <button
          onClick={() => setResolveOpen(v => !v)}
          className="rounded border border-green-300 px-2 py-0.5 text-xs text-green-700 hover:bg-green-50"
        >
          Resolve
        </button>
      </div>
      {resolveOpen && (
        <div className="flex items-center gap-1.5 mt-1">
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Resolution note (optional)"
            className="rounded border border-slate-200 px-2 py-0.5 text-xs w-48 focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
          <button
            onClick={handleResolve}
            disabled={saving}
            className="rounded bg-green-700 px-2 py-0.5 text-xs text-white hover:bg-green-600 disabled:opacity-40"
          >
            {saving ? '…' : 'OK'}
          </button>
          <button onClick={() => setResolveOpen(false)} className="text-xs text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
