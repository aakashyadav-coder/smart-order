/**
 * ConfirmModal — rebuilt with shadcn Dialog
 */
import React from 'react'
import { FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

const TYPE_CFG = {
  danger:  { icon: FaExclamationTriangle, iconBg: 'bg-red-50',    iconColor: 'text-red-500' },
  warning: { icon: FaExclamationTriangle, iconBg: 'bg-amber-50',  iconColor: 'text-amber-500' },
  info:    { icon: FaCheckCircle,         iconBg: 'bg-brand-50',  iconColor: 'text-brand-600' },
}

export default function ConfirmModal({
  open, title, message, onConfirm, onCancel,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  type = 'danger', loading = false
}) {
  const cfg = TYPE_CFG[type] || TYPE_CFG.danger
  const Icon = cfg.icon

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel?.() }}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <div className="flex flex-col items-center text-center gap-4 pb-2">
            <div className={`w-14 h-14 ${cfg.iconBg} rounded-2xl flex items-center justify-center`}>
              <Icon className={`w-7 h-7 ${cfg.iconColor}`} />
            </div>
            <div>
              <DialogTitle className="text-gray-900 text-lg">{title}</DialogTitle>
              {message && (
                <DialogDescription className="mt-2 leading-relaxed">{message}</DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        <DialogFooter className="flex-row gap-2.5 sm:gap-2.5">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={type === 'danger' ? 'destructive' : 'default'}
            className="flex-1"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing…</>
            ) : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
