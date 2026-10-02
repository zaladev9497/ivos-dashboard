import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Nav from '@/components/Nav'
import ModeBanner from '@/components/ModeBanner'
import { getBusinessCalendar } from '@/lib/queries'

// One family for the whole UI. Geist is drawn for interfaces: compact, even
// texture at 12–14px, and a clean semibold for titles — so hierarchy comes
// from weight and size rather than from a second, decorative face.
const geist = Geist({
  variable: '--font-geist',
  subsets: ['latin'],
  display: 'swap',
})

// Its mono sibling for phone numbers, IDs and error strings.
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
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
      className={`${geist.variable} ${geistMono.variable} h-full antialiased`}
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
