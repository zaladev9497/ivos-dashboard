import { Suspense } from 'react'
import LoginForm from './LoginForm'

export const metadata = { title: 'Sign in' }

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="rise w-full max-w-[380px]">
        <div className="mb-6">
          <p className="wordmark select-none">
            IVO<span style={{ color: 'var(--accent)' }}>S</span>
          </p>
          <h1 className="mt-6 text-[20px] font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>
            Sign in
          </h1>
          <p className="mt-1 text-[13px]" style={{ color: 'var(--ink-muted)' }}>
            Operations dashboard for Idlewild and Texas Shade.
          </p>
        </div>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>

        <p className="mt-5 text-[12px]" style={{ color: 'var(--ink-faint)' }}>
          Internal system. Authorized staff only.
        </p>
      </div>
    </div>
  )
}
