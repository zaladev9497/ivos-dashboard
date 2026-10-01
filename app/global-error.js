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
          background: '#0a0a0a',
          color: '#e5e5e5',
        }}
      >
        <div style={{ maxWidth: 380, textAlign: 'center', padding: 24 }}>
          <h1 style={{ fontSize: 16, margin: '0 0 8px' }}>The dashboard hit an unexpected error</h1>
          <p style={{ fontSize: 13, color: '#a3a3a3', margin: '0 0 16px' }}>
            Reload the page. If it keeps happening, tell the team{error?.digest ? ` and quote ${error.digest}` : ''}.
          </p>
          <button
            onClick={() => retry()}
            style={{ background: '#4f46e5', color: '#fff', border: 0, borderRadius: 4, padding: '8px 14px', fontSize: 13, cursor: 'pointer' }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  )
}
