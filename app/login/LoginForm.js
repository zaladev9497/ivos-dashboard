'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Sign in failed.'); return }
      router.push('/')
      router.refresh()
    } catch {
      setError('Network error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white shadow-sm p-6 space-y-4">
      {error && (
        <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
        <input
          type="email" required autoFocus
          value={email} onChange={e => setEmail(e.target.value)}
          className="w-full rounded border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Password</label>
        <input
          type="password" required
          value={password} onChange={e => setPassword(e.target.value)}
          className="w-full rounded border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
          placeholder="Shared dashboard password"
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
