/**
 * KitchenOrderCard — a single order card with action buttons
 */
import React, { useState } from 'react'

const STATUS_CONFIG = {
  PENDING:    { label: 'Pending',    badge: 'badge-pending',   next: 'ACCEPTED',  nextLabel: '✅ Accept Order' },
  ACCEPTED:   { label: 'Accepted',   badge: 'badge-accepted',  next: 'PREPARING', nextLabel: '👨‍🍳 Start Preparing' },
  PREPARING:  { label: 'Preparing',  badge: 'badge-preparing', next: 'COMPLETED', nextLabel: '🎉 Mark Complete' },
  COMPLETED:  { label: 'Completed',  badge: 'badge-completed', next: null,        nextLabel: null },
  CANCELLED:  { label: 'Cancelled',  badge: 'badge-cancelled', next: null,        nextLabel: null },
}

const timeAgo = (dateStr) => {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60)  return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

export default function KitchenOrderCard({ order, onUpdateStatus, onSendOTP }) {
  const [loading, setLoading] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING

  const handleNext = async () => {
    if (!cfg.next) return
    setLoading(true)
    await onUpdateStatus(order.id, cfg.next)
    setLoading(false)
  }

  const handleOTP = async () => {
    setOtpLoading(true)
    await onSendOTP(order.id)
    setOtpLoading(false)
  }

  const isNew = order.status === 'PENDING'

  return (
    <div className={`bg-gray-900 rounded-2xl border overflow-hidden transition-all ${
      isNew ? 'border-brand-500 shadow-lg shadow-brand-500/20' : 'border-gray-800'
    }`}>
      {/* Card header */}
      <div className={`flex items-center justify-between px-4 py-3 ${isNew ? 'bg-brand-500/10' : 'bg-gray-800/50'}`}>
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-white text-sm">Table #{order.tableNumber}</span>
          {isNew && <span className="text-xs bg-brand-500 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">NEW</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge ${cfg.badge} text-xs`}>{cfg.label}</span>
          <span className="text-gray-500 text-xs">{timeAgo(order.createdAt)}</span>
        </div>
      </div>

      {/* Customer info */}
      <div className="px-4 py-2 border-b border-gray-800">
        <p className="text-sm text-gray-300">
          👤 <span className="font-semibold text-white">{order.customerName}</span>
          <span className="text-gray-500 ml-2">· {order.phone}</span>
        </p>
      </div>

      {/* Items */}
      <div className="px-4 py-3 space-y-1.5">
        {order.items?.map(item => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-gray-300">
              <span className="text-white font-medium">{item.menuItem?.name || 'Item'}</span>
              <span className="text-gray-500"> × {item.quantity}</span>
            </span>
            <span className="text-gray-400">Rs. {(item.price * item.quantity).toFixed(0)}</span>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="px-4 py-2 border-t border-gray-800 flex justify-between items-center">
        <span className="text-gray-500 text-sm">{order.items?.length} item(s)</span>
        <span className="font-extrabold text-white">Rs. {order.totalPrice.toFixed(0)}</span>
      </div>

      {/* Actions */}
      {cfg.next && (
        <div className="px-4 pb-4 pt-2 space-y-2">
          <button
            onClick={handleNext}
            disabled={loading}
            className="btn-primary w-full py-2.5 text-sm"
          >
            {loading ? (
              <span className="flex items-center gap-2 justify-center">
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Updating…
              </span>
            ) : cfg.nextLabel}
          </button>

          {/* Send OTP manually */}
          {(order.status === 'ACCEPTED' || order.status === 'PREPARING') && (
            <button
              onClick={handleOTP}
              disabled={otpLoading}
              className="btn-ghost w-full py-2 text-xs text-gray-400 border border-gray-700"
            >
              {otpLoading ? 'Sending…' : '🔐 Resend OTP SMS'}
            </button>
          )}
        </div>
      )}

      {/* Order ID footer */}
      <div className="px-4 pb-3">
        <p className="text-xs text-gray-700">#{order.id.slice(-8).toUpperCase()}</p>
      </div>
    </div>
  )
}
