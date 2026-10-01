import { Inter, Fraunces, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import Nav from '@/components/Nav'
import ModeBanner from '@/components/ModeBanner'
import { getBusinessCalendar } from '@/lib/queries'

// Inter for data and UI — optical sizing keeps 11px labels crisp at table density.
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

// Fraunces for headings and figures. A variable serif with a SOFT axis, so the
// display face reads editorial rather than decorative.
const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  display: 'swap',
  axes: ['SOFT', 'WONK', 'opsz'],
})

// JetBrains Mono for IDs, phone numbers and error strings — slashed zero.
const jetbrains = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata = {
  title: { default: 'IVOS Dashboard', template: '%s · IVOS' },
  description: 'Internal operations dashboard — Idlewild / Texas Shade',
  robots: { index: false, follow: false },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8f9fc' },
    { media: '(prefers-color-scheme: dark)', color: '#14161d' },
  ],
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
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} ${jetbrains.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('ivos_theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full">
        <a
          href="#main"
          className="btn btn-primary sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50"
        >
          Skip to content
        </a>
        <div className="flex h-screen overflow-hidden">
          <Nav />
          <div className="flex min-w-0 flex-1 flex-col">
            <ModeBanner testMode={testMode} demoMode={demoMode} />
            <main
              id="main"
              tabIndex={-1}
              className="flex min-h-0 flex-1 flex-col overflow-auto p-6 focus:outline-none lg:p-8"
            >
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  )
}
