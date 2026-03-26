/**
 * KanbanBoard.jsx — Live order pipeline (click-to-advance status)
 * Columns: PENDING → ACCEPTED → PREPARING → SERVED → PAID
 */
import React, { useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { FaCheckCircle, FaFire, FaClock, FaTimesCircle, FaUsers, FaPhoneAlt } from 'react-icons/fa'

const PIPELINE = [
  { status: 'PENDING',   label: 'Pending',   color: 'text-amber-600',  bg: 'bg-amber-50',   border: 'border-amber-200',   dot: 'bg-amber-400',   headerBg: 'bg-amber-50 border-amber-200',   icon: FaClock,       next: 'ACCEPTED',   nextLabel: 'Accept',       btnClass: 'bg-gradient-to-r from-brand-600 to-brand-500 text-white hover:from-brand-700 hover:to-brand-600' },
  { status: 'ACCEPTED',  label: 'Accepted',  color: 'text-blue-600',   bg: 'bg-blue-50',    border: 'border-blue-200',    dot: 'bg-blue-400',    headerBg: 'bg-blue-50 border-blue-200',     icon: FaCheckCircle, next: 'PREPARING',  nextLabel: 'Start Prep',   btnClass: 'bg-orange-500 text-white hover:bg-orange-600' },
  { status: 'PREPARING', label: 'Preparing', color: 'text-orange-600', bg: 'bg-orange-50',  border: 'border-orange-200',  dot: 'bg-orange-400',  headerBg: 'bg-orange-50 border-orange-200', icon: FaFire,       next: 'SERVED',     nextLabel: 'Mark Served',  btnClass: 'bg-green-600 text-white hover:bg-green-700' },
  { status: 'SERVED',    label: 'Served',    color: 'text-green-600',  bg: 'bg-green-50',   border: 'border-green-200',   dot: 'bg-green-400',   headerBg: 'bg-green-50 border-green-200',   icon: FaUsers,      next: null,          nextLabel: null,           btnClass: '' },
  { status: 'PAID',      label: 'Paid',      color: 'text-emerald-600',bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500', headerBg: 'bg-emerald-50 border-emerald-200',icon: FaCheckCircle, next: null,          nextLabel: null,           btnClass: '' },
]

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60) return `${Math.floor(diff)}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

function OrderCard({ order, col, onStatusChange }) {
  const [loading, setLoading] = useState(false)
  const [cancel, setCancel] = useState(false)

  const advance = async () => {
    if (!col.next) return
    setLoading(true)
    try {
      await api.put(`/orders/${order.id}/status`, { status: col.next })
      onStatusChange(order.id, col.next)
      toast.success(`Order moved to ${col.next}`)
    } catch (err) { toast.error(err.message) } finally { setLoading(false) }
  }

  const cancelOrder = async () => {
    setLoading(true)
    try {
      await api.put(`/orders/${order.id}/status`, { status: 'CANCELLED' })
      onStatusChange(order.id, 'CANCELLED')
      toast.success('Order cancelled')
    } catch (err) { toast.error(err.message) } finally { setLoading(false); setCancel(false) }
  }

  const elapsed = (Date.now() - new Date(order.createdAt)) / 1000 / 60
  const isUrgent = col.status === 'PENDING' && elapsed > 5

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md ${isUrgent ? 'border-amber-300 ring-2 ring-amber-200 ring-offset-1' : 'border-gray-100'}`}>
      {/* Urgent strip */}
      {isUrgent && (
        <div className="bg-amber-500 text-white text-[10px] font-black text-center py-0.5 tracking-wider animate-pulse">
          ⚡ WAITING {Math.floor(elapsed)}m
        </div>
      )}

      <div className="p-3.5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="min-w-0">
            <p className="font-bold text-gray-900 text-sm leading-none truncate">{order.customerName}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-gray-400 text-xs">Table #{order.tableNumber}</span>
              <span className="text-gray-300">·</span>
              <span className="text-gray-400 text-xs">{timeAgo(order.createdAt)}</span>
            </div>
          </div>
          <span className="font-black text-gray-900 text-sm flex-shrink-0">Rs.{order.totalPrice}</span>
        </div>

        {/* Items */}
        <div className="space-y-0.5 mb-3">
          {order.items?.slice(0, 3).map(item => (
            <div key={item.id} className="flex items-center justify-between text-xs">
              <span className="text-gray-600 truncate max-w-[140px]">{item.menuItem?.name || 'Item'}</span>
              <span className="text-gray-400 flex-shrink-0 ml-2 font-medium">×{item.quantity}</span>
            </div>
          ))}
          {(order.items?.length || 0) > 3 && (
            <p className="text-gray-400 text-xs">+{order.items.length - 3} more</p>
          )}
        </div>

        {/* Phone */}
        {order.phone && (
          <a href={`tel:${order.phone}`} className="flex items-center gap-1.5 text-gray-400 hover:text-brand-600 transition-colors text-xs mb-3 group">
            <FaPhoneAlt className="w-3 h-3 group-hover:text-brand-600" />
            <span>{order.phone}</span>
          </a>
        )}

        {/* Actions */}
        {cancel ? (
          <div className="flex gap-1.5">
            <button onClick={() => setCancel(false)} className="flex-1 py-1.5 text-xs font-semibold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">Keep</button>
            <button onClick={cancelOrder} disabled={loading} className="flex-1 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">Cancel</button>
          </div>
        ) : (
          <div className="flex gap-1.5">
            {col.next && (
              <button onClick={advance} disabled={loading}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-1 ${col.btnClass}`}>
                {loading
                  ? <span className="w-3 h-3 border-[2px] border-current border-t-transparent rounded-full animate-spin" />
                  : col.nextLabel
                }
              </button>
            )}
            {(col.status === 'PENDING' || col.status === 'ACCEPTED') && (
              <button onClick={() => setCancel(true)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 border border-red-100 hover:bg-red-100 transition-colors flex-shrink-0">
                <FaTimesCircle className="w-3.5 h-3.5 text-red-500" />
              </button>
            )}
            {!col.next && <div className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-lg border border-emerald-200"><FaCheckCircle className="w-3.5 h-3.5" /> Done</div>}
          </div>
        )}
      </div>
    </div>
  )
}

function Column({ col, orders, onStatusChange }) {
  const Icon = col.icon
  return (
    <div className="flex-shrink-0 w-72 flex flex-col bg-gray-50 rounded-2xl border border-gray-100 max-h-full overflow-hidden">
      {/* Column header */}
      <div className={`flex items-center gap-2.5 px-3.5 py-3 border-b ${col.headerBg} flex-shrink-0`}>
        <div className={`w-2 h-2 rounded-full ${col.dot}`} />
        <Icon className={`w-4 h-4 ${col.color}`} />
        <span className={`font-bold text-sm ${col.color}`}>{col.label}</span>
        <span className={`ml-auto text-xs font-black px-2 py-0.5 rounded-full ${col.bg} ${col.color} border ${col.border}`}>{orders.length}</span>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-none">
        {orders.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Icon className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-xs">No orders</p>
          </div>
        ) : (
          orders.map(order => (
            <OrderCard key={order.id} order={order} col={col} onStatusChange={onStatusChange} />
          ))
        )}
      </div>
    </div>
  )
}

export default function KanbanBoard({ orders, onStatusChange }) {
  const activeStatuses = ['PENDING', 'ACCEPTED', 'PREPARING', 'SERVED', 'PAID']
  const grouped = Object.fromEntries(activeStatuses.map(s => [s, orders.filter(o => o.status === s)]))
  const total = activeStatuses.reduce((s, k) => s + (grouped[k]?.length || 0), 0)

  return (
    <div className="flex flex-col h-full">
      {/* Board info bar */}
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <p className="text-xs text-gray-500 font-medium">{total} active order{total !== 1 ? 's' : ''} in pipeline</p>
        {grouped.PENDING?.length > 0 && (
          <span className="flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
            ⚡ {grouped.PENDING.length} need action
          </span>
        )}
        <p className="text-gray-400 text-xs ml-auto">Click action buttons to advance status →</p>
      </div>

      {/* Kanban columns */}
      <div className="flex gap-3 overflow-x-auto pb-3 flex-1 min-h-0">
        {PIPELINE.map(col => (
          <Column key={col.status} col={col} orders={grouped[col.status] || []} onStatusChange={onStatusChange} />
        ))}
      </div>
    </div>
  )
}
