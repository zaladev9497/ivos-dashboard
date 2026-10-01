'use client'

// Last-resort boundary: renders when the root layout itself fails (e.g. a font or config error).
// It replaces the whole document, so it carries its own minimal styles.
export default function GlobalError({ error, retry }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          background: '#14161d',
          color: '#e9ebf2',
        }}
      >
        <div style={{ maxWidth: 380, textAlign: 'center', padding: 24 }}>
          <h1 style={{ fontSize: 17, margin: '0 0 8px', fontWeight: 600, letterSpacing: '-0.02em' }}>The dashboard hit an unexpected error</h1>
          <p style={{ fontSize: 13, color: '#959aab', margin: '0 0 16px' }}>
            Reload the page. If it keeps happening, tell the team{error?.digest ? ` and quote ${error.digest}` : ''}.
          </p>
          <button
            onClick={() => retry()}
            style={{ background: '#8b85ff', color: '#14161d', border: 0, borderRadius: 5, padding: '8px 16px', fontSize: 13, fontWeight: 550, cursor: 'pointer' }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  )
}
