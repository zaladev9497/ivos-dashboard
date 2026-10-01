import { Suspense } from 'react'
import LoginForm from './LoginForm'

export const metadata = { title: 'Sign in' }

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      {/* A faint warm bloom behind the card. Barely perceptible — it keeps the
          page from reading as a flat sheet without announcing itself. */}
      <div
        className="pointer-events-none absolute left-1/2 top-[38%] h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: 'radial-gradient(circle, color-mix(in oklab, var(--accent) 9%, transparent), transparent 68%)',
          filter: 'blur(26px)',
        }}
        aria-hidden="true"
      />

      <div className="rise relative w-full max-w-[370px]">
        <div className="mb-7 text-center">
          <p className="wordmark select-none">
            IVO<span style={{ color: 'var(--accent)' }}>S</span>
          </p>
          <h1 className="mt-4 text-[19px] font-semibold" style={{ color: 'var(--ink)' }}>
            Operations dashboard
          </h1>
          <p className="mt-1 text-[12.5px]" style={{ color: 'var(--ink-muted)' }}>
            Idlewild · Texas Shade
          </p>
        </div>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>

        <p className="mt-5 text-center text-[11px]" style={{ color: 'var(--ink-faint)' }}>
          Internal system · Authorized personnel only
        </p>
      </div>
    </div>
  )
}
