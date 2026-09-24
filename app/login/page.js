import LoginForm from './LoginForm'

export const metadata = { title: 'Sign in — IVOS Dashboard' }

export default function LoginPage({ searchParams }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-slate-800">IVOS Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Internal operations — sign in to continue</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
