'use client'
import { useEffect, useRef } from 'react'

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
  onConfirm,
  onCancel,
}) {
  const panelRef = useRef(null)
  const confirmRef = useRef(null)

  // Escape closes, and focus moves into the dialog on open so the keyboard
  // doesn't stay stranded on the page behind it.
  useEffect(() => {
    if (!open) return
    confirmRef.current?.focus()

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel?.()
        return
      }
      if (e.key !== 'Tab') return

      // Keep Tab inside the panel while the dialog is up.
      const focusable = panelRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'color-mix(in oklab, oklch(16% 0.025 266) 52%, transparent)', backdropFilter: 'blur(3px)' }}
      onClick={onCancel}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="rise w-full max-w-100 overflow-hidden"
        style={{
          background: 'var(--paper-raised)',
          border: '1px solid var(--rule)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--lift-modal)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-start gap-3.5">
            {danger && (
              <span
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ background: 'var(--signal-neg-soft)', border: '1px solid var(--signal-neg-rule)' }}
                aria-hidden="true"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-4 w-4" style={{ color: 'var(--signal-neg)' }}>
                  <path d="M12 8v5M12 16.5v.01" />
                  <path d="M10.3 3.9 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                </svg>
              </span>
            )}
            <div className="min-w-0">
              <h2 id="confirm-title" className="text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>
                {title}
              </h2>
              <div className="mt-1.5 text-[13px] leading-relaxed" style={{ color: 'var(--ink-secondary)' }}>
                {message}
              </div>
            </div>
          </div>
        </div>

        <div
          className="flex justify-end gap-2 border-t px-5 py-3"
          style={{ borderColor: 'var(--rule-faint)', background: 'var(--paper-sunken)' }}
        >
          <button onClick={onCancel} className="btn btn-quiet">
            Cancel
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
