// Internal tool: keep it out of search engines.
export default function robots() {
  return { rules: { userAgent: '*', disallow: '/' } }
}
