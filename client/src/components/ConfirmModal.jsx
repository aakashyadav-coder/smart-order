/**
 * ConfirmModal — reusable confirmation dialog
 * Usage: <ConfirmModal open={bool} title="..." message="..." onConfirm={fn} onCancel={fn} danger />
 */
import React, { useEffect } from 'react'

const ICONS = {
  danger:  '⚠️',
  warning: '🔔',
  info:    'ℹ️',
}

export default function ConfirmModal({ open, title, message, onConfirm, onCancel, confirmLabel = 'Confirm', cancelLabel = 'Cancel', type = 'danger', loading = false }) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onCancel?.() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onCancel])

  if (!open) return null

  const confirmStyle = type === 'danger'
    ? 'bg-red-600 hover:bg-red-700 text-white'
    : type === 'warning'
    ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
    : 'bg-brand-500 hover:bg-brand-600 text-white'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onCancel} />

      {/* Modal */}
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-sm animate-bounce-in">
        <div className="p-6">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 bg-gray-800 rounded-full flex items-center justify-center text-3xl">
              {ICONS[type]}
            </div>
            <div>
              <h3 className="text-white font-extrabold text-lg">{title}</h3>
              {message && <p className="text-gray-400 text-sm mt-1 leading-relaxed">{message}</p>}
            </div>
          </div>
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl font-semibold text-gray-400 bg-gray-800 hover:bg-gray-700 hover:text-white transition-all text-sm"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-xl font-semibold transition-all text-sm disabled:opacity-50 ${confirmStyle}`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Processing…
              </span>
            ) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
