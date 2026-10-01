'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const input =
  'w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400'

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
    <form onSubmit={handleSubmit} className="space-y-4 rounded-md border border-slate-200 bg-white p-5">
      {error && (
        <div role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="email" className="mb-1 block text-xs font-medium text-slate-500">Email</label>
        <input
          id="email" name="email" type="email" required autoFocus
          autoComplete="username" inputMode="email" spellCheck={false}
          value={email} onChange={(e) => setEmail(e.target.value)}
          className={input} placeholder="you@example.com"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-xs font-medium text-slate-500">Password</label>
        <input
          id="password" name="password" type="password" required
          autoComplete="current-password"
          value={password} onChange={(e) => setPassword(e.target.value)}
          className={input} placeholder="Dashboard password"
        />
      </div>
      <button
        type="submit" disabled={loading}
        className="w-full rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
