'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { triggerDemoAdvance } from '@/app/demo-actions'

const WARN_AT = 50
const AUTO_STOP_MS = 15 * 60 * 1000

function readCount() {
  try { return parseInt(sessionStorage.getItem('demo_advance_count') || '0', 10) } catch { return 0 }
}
function writeCount(n) {
  try { sessionStorage.setItem('demo_advance_count', String(n)) } catch {}
}

export default function AdvanceButton({ pollIntervalSeconds = 10 }) {
  const router = useRouter()
  const inflightRef = useRef(false)
  const [running, setRunning] = useState(false)
  const [autoMode, setAutoMode] = useState(false)
  const [count, setCount] = useState(0)
  const [error, setError] = useState(null)
  const autoRef = useRef(null)
  const autoStartRef = useRef(null)

  useEffect(() => { setCount(readCount()) }, [])

  async function advance() {
    if (inflightRef.current) return
    inflightRef.current = true
    setRunning(true)
    setError(null)
    try {
      const result = await triggerDemoAdvance()
      if (result?.error) { setError(result.error); return }
      setCount(prev => { const next = prev + 1; writeCount(next); return next })
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
    <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-semibold text-violet-700 uppercase tracking-wide shrink-0">Demo</span>

        <button
          type="button"
          onClick={advance}
          disabled={running}
          className="rounded bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-40 transition-colors"
        >
          {running ? 'Advancing…' : '▶ Advance'}
        </button>

        <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer">
          <input type="checkbox" checked={autoMode} onChange={e => setAutoMode(e.target.checked)} />
          Auto every {pollIntervalSeconds}s
          {autoMode && <span className="text-xs text-violet-500 ml-1">(stops in 15 min or on tab switch)</span>}
        </label>

        <span className={`text-xs ml-auto ${count >= WARN_AT ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>
          {count >= WARN_AT && '⚠ '}Demo runs: {count}{count >= WARN_AT && ' — near n8n limit'}
        </span>
      </div>

      {error && (
        <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  )
}
