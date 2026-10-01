'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Only follow same-site relative paths after sign-in (prevents open redirects).
  const from = params.get('from')
  const destination = from && from.startsWith('/') && !from.startsWith('//') ? from : '/'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Sign in failed.')
        return
      }
      router.push(destination)
      router.refresh()
    } catch {
      setError('Network error. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="surface space-y-4 p-6">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-[5px] border px-3 py-2 text-[12.5px]"
          style={{
            borderColor: 'var(--signal-neg-rule)',
            background: 'var(--signal-neg-soft)',
            color: 'var(--tone-neg-ink)',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="mt-px h-4 w-4 shrink-0" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.5v5M12 16v.01" />
          </svg>
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="eyebrow mb-1.5 block">Email</label>
        <input
          id="email" name="email" type="email" required autoFocus
          autoComplete="username" inputMode="email" spellCheck={false}
          value={email} onChange={(e) => setEmail(e.target.value)}
          className="field h-9 w-full" placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="eyebrow mb-1.5 block">Password</label>
        <input
          id="password" name="password" type="password" required
          autoComplete="current-password"
          value={password} onChange={(e) => setPassword(e.target.value)}
          className="field h-9 w-full" placeholder="••••••••••"
        />
      </div>

      <button type="submit" disabled={loading} className="btn btn-primary mt-1 h-9 w-full">
        {loading ? (
          <>
            <span
              className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-transparent"
              style={{ borderTopColor: 'currentColor', borderRightColor: 'currentColor' }}
              aria-hidden="true"
            />
            Signing in…
          </>
        ) : (
          'Sign in'
        )}
      </button>
    </form>
  )
}
