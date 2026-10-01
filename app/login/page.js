import { Suspense } from 'react'
import LoginForm from './LoginForm'

export const metadata = { title: 'Sign in' }

export default function LoginPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center">
          <p className="text-sm font-bold tracking-[0.25em] text-slate-800">IVOS</p>
          <h1 className="mt-2 text-base font-semibold text-slate-800">Operations dashboard</h1>
          <p className="mt-1 text-[13px] text-slate-500">Sign in to continue</p>
        </div>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
