import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Nav from '@/components/Nav'
import { getBusinessCalendar } from '@/lib/queries'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata = {
  title: 'IVOS Dashboard',
  description: 'Internal operations dashboard — Idlewild / Texas Shade',
}

export default async function RootLayout({ children }) {
  let testMode = false
  let demoMode = false
  try {
    const cal = await getBusinessCalendar()
    testMode = !!(cal?.sms_redirect_to || cal?.test_only)
    demoMode = !!(cal?.demo_mode)
  } catch {
    // env vars not set yet — still render the shell
  }

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-slate-50 text-slate-900">
        <Nav testMode={testMode} demoMode={demoMode} />
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </body>
    </html>
  )
}
