const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lets CI / local checks build into a separate folder (NEXT_DIST_DIR=.next-check) without touching a running dev server.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  poweredByHeader: false,
  // The default bottom-left spot sits on top of the sidebar's Log out button.
  devIndicators: { position: 'bottom-right' },
  reactStrictMode: true,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
