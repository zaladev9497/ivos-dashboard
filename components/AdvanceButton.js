'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { triggerDemoAdvance } from '@/app/demo-actions'
import { createStorageStore } from '@/lib/client-store'

const WARN_AT = 50
const AUTO_STOP_MS = 15 * 60 * 1000

const countStore = createStorageStore(() => sessionStorage, 'demo_advance_count', {
  serverValue: 0,
  read: (v) => parseInt(v || '0', 10) || 0,
})

export default function AdvanceButton({ pollIntervalSeconds = 10 }) {
  const router = useRouter()
  const inflightRef = useRef(false)
  const [running, setRunning] = useState(false)
  const [autoMode, setAutoMode] = useState(false)
  const count = countStore.use()
  const [error, setError] = useState(null)
  const autoRef = useRef(null)
  const autoStartRef = useRef(null)

  async function advance() {
    if (inflightRef.current) return
    inflightRef.current = true
    setRunning(true)
    setError(null)
    try {
      const result = await triggerDemoAdvance()
      if (result?.error) { setError(result.error); return }
      countStore.set(count + 1)
      // Give n8n ~2.5s to process and write back to the DB before we re-fetch
      await new Promise(r => setTimeout(r, 2500))
      router.refresh()
    } catch (e) {
      setError(e?.message ?? 'Unexpected error')
    } finally {
      inflightRef.current = false
      setRunning(false)
    }
  }

  // Stop auto-advance when tab goes to background
  useEffect(() => {
    const handle = () => { if (document.visibilityState === 'hidden') setAutoMode(false) }
    document.addEventListener('visibilitychange', handle)
    return () => document.removeEventListener('visibilitychange', handle)
  }, [])

  // Auto-advance interval
  useEffect(() => {
    if (!autoMode) { clearInterval(autoRef.current); return }
    autoStartRef.current = Date.now()
    autoRef.current = setInterval(() => {
      if (Date.now() - autoStartRef.current >= AUTO_STOP_MS) { setAutoMode(false); return }
      advance()
    }, pollIntervalSeconds * 1000)
    return () => clearInterval(autoRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMode, pollIntervalSeconds])

  return (
    <div
      className="space-y-2 rounded-[9px] border px-3 py-2.5"
      style={{ borderColor: 'var(--signal-alt-rule)', background: 'var(--signal-alt-soft)' }}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="eyebrow shrink-0" style={{ color: 'var(--tone-alt-ink)' }}>Demo</span>

        <button
          type="button"
          onClick={advance}
          disabled={running}
          className="btn h-7 px-3"
          style={{
            background: 'var(--signal-alt)',
            border: '1px solid var(--signal-alt)',
            color: 'var(--on-signal)',
            boxShadow: 'var(--lift-flat), inset 0 1px 0 color-mix(in oklab, white 18%, transparent)',
          }}
        >
          {running ? (
            <>
              <span
                className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-transparent"
                style={{ borderTopColor: 'currentColor', borderRightColor: 'currentColor' }}
                aria-hidden="true"
              />
              Advancing…
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3" aria-hidden="true">
                <path d="M7 5.5l11 6.5-11 6.5z" />
              </svg>
              Advance
            </>
          )}
        </button>

        {/* Auto-advance toggle — a switch, because it is a running state rather
            than a value being submitted with a form. */}
        <label className="flex cursor-pointer select-none items-center gap-2 text-[12.5px]" style={{ color: 'var(--ink-secondary)' }}>
          <input
            type="checkbox"
            checked={autoMode}
            onChange={e => setAutoMode(e.target.checked)}
            className="peer sr-only"
          />
          <span
            className="relative h-[18px] w-8 shrink-0 rounded-full transition-colors"
            style={{
              background: autoMode ? 'var(--signal-alt)' : 'var(--rule-strong)',
              boxShadow: 'inset 0 1px 2px color-mix(in oklab, var(--ink) 12%, transparent)',
            }}
            aria-hidden="true"
          >
            <span
              className="absolute top-[2px] h-3.5 w-3.5 rounded-full transition-[left] duration-200 ease-out"
              style={{
                left: autoMode ? '16px' : '2px',
                background: 'var(--knob)',
                boxShadow: '0 1px 2px color-mix(in oklab, var(--ink) 28%, transparent)',
              }}
            />
          </span>
          Auto every {pollIntervalSeconds}s
          {autoMode && (
            <span className="text-[11px]" style={{ color: 'var(--tone-alt-ink)' }}>
              (stops in 15 min or on tab switch)
            </span>
          )}
        </label>

        <span
          className="ml-auto inline-flex items-center gap-1 text-[12px]"
          style={{
            color: count >= WARN_AT ? 'var(--tone-neg-ink)' : 'var(--ink-faint)',
            fontWeight: count >= WARN_AT ? 600 : 400,
          }}
        >
          {count >= WARN_AT && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
              <path d="M12 8.5v4M12 16v.01" />
              <path d="M10.3 4.2 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z" />
            </svg>
          )}
          Demo runs: <span className="tabular">{count}</span>
          {count >= WARN_AT && ', near the n8n limit'}
        </span>
      </div>

      {error && (
        <div
          className="rounded-md border px-3 py-2 text-[12.5px]"
          style={{
            borderColor: 'var(--signal-neg-rule)',
            background: 'var(--signal-neg-soft)',
            color: 'var(--tone-neg-ink)',
          }}
        >
          {error}
        </div>
      )}
    </div>
  )
}
