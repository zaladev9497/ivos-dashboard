import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Nav from '@/components/Nav'
import ModeBanner from '@/components/ModeBanner'
import { getBusinessCalendar } from '@/lib/queries'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata = {
  title: { default: 'IVOS Dashboard', template: '%s · IVOS' },
  description: 'Internal operations dashboard — Idlewild / Texas Shade',
  robots: { index: false, follow: false },
}

export const viewport = { width: 'device-width', initialScale: 1 }

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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('ivos_theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full bg-slate-50 text-slate-900">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-slate-800 focus:px-3 focus:py-1.5 focus:text-sm focus:text-white"
        >
          Skip to content
        </a>
        <div className="flex h-screen overflow-hidden">
          <Nav />
          <div className="flex min-w-0 flex-1 flex-col">
            <ModeBanner testMode={testMode} demoMode={demoMode} />
            <main id="main" tabIndex={-1} className="flex min-h-0 flex-1 flex-col overflow-auto p-1.5 focus:outline-none">{children}</main>
          </div>
        </div>
      </body>
    </html>
  )
}
