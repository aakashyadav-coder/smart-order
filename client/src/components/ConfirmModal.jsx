/**
 * ConfirmModal — Premium confirmation dialog
 * Theme: White modal, SVG icons, red danger / brand info
 */
import React, { useEffect } from 'react'
import { AlertTriangle, CheckCircle, X } from './Icons'

const TYPE_CFG = {
  danger:  { icon: AlertTriangle, iconBg: 'bg-red-50', iconColor: 'text-red-500', confirmClass: 'bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-red-500/25 hover:shadow-md' },
  warning: { icon: AlertTriangle, iconBg: 'bg-amber-50', iconColor: 'text-amber-500', confirmClass: 'bg-amber-500 hover:bg-amber-600 text-white' },
  info:    { icon: CheckCircle,  iconBg: 'bg-brand-50', iconColor: 'text-brand-600', confirmClass: 'bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white shadow-sm' },
}

export default function ConfirmModal({
  open, title, message, onConfirm, onCancel,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  type = 'danger', loading = false
}) {
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onCancel?.() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onCancel])

  if (!open) return null

  const cfg = TYPE_CFG[type] || TYPE_CFG.danger
  const Icon = cfg.icon

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm animate-bounce-in border border-gray-100">
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <X className="w-3.5 h-3.5 text-gray-500" />
        </button>

        <div className="p-6">
          <div className="flex flex-col items-center text-center gap-4">
            <div className={`w-14 h-14 ${cfg.iconBg} rounded-2xl flex items-center justify-center`}>
              <Icon className={`w-7 h-7 ${cfg.iconColor}`} />
            </div>
            <div>
              <h3 className="text-gray-900 font-extrabold text-lg">{title}</h3>
              {message && <p className="text-gray-500 text-sm mt-2 leading-relaxed">{message}</p>}
            </div>
          </div>
        </div>

        <div className="flex gap-2.5 px-6 pb-6">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all text-sm"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-xl font-semibold transition-all text-sm disabled:opacity-50 ${cfg.confirmClass}`}
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
