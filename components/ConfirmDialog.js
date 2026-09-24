'use client'

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onCancel}
    >
      <div
        className="rounded-xl bg-white shadow-2xl max-w-md w-full mx-4 p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-slate-800">{title}</h2>
        <div className="text-sm text-slate-600 leading-relaxed">{message}</div>
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            className="rounded px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`rounded px-4 py-2 text-sm font-medium text-white ${
              danger ? 'bg-red-600 hover:bg-red-500' : 'bg-slate-800 hover:bg-slate-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
