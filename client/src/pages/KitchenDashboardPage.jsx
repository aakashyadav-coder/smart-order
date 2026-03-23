/**
 * KitchenDashboardPage — Ultra-professional real-time order management
 * Features:
 *  - Live restaurant name/logo via socket
 *  - No QR link (removed)
 *  - Animated red notification badge on PENDING count
 *  - Confirmation modals before status changes and logout
 *  - Premium dark split-panel UI
 */
import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../lib/api'
import socket from '../lib/socket'
import { useAuth } from '../context/AuthContext'
import ConfirmModal from '../components/ConfirmModal'

// ── Notification sound ──────────────────────────────────────────────────────
const playDing = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator(), gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(1047, ctx.currentTime)
    osc.frequency.setValueAtTime(784, ctx.currentTime + 0.12)
    gain.gain.setValueAtTime(0.35, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.6)
  } catch (_) {}
}

// ── Status config ───────────────────────────────────────────────────────────
const STATUS_CFG = {
  PENDING:   { color: 'border-l-yellow-400',  bg: 'bg-yellow-400/10', text: 'text-yellow-400',  dot: 'bg-yellow-400',  label: 'Pending'   },
  ACCEPTED:  { color: 'border-l-blue-400',    bg: 'bg-blue-400/10',   text: 'text-blue-400',    dot: 'bg-blue-400',    label: 'Accepted'  },
  PREPARING: { color: 'border-l-orange-400',  bg: 'bg-orange-400/10', text: 'text-orange-400',  dot: 'bg-orange-400',  label: 'Preparing' },
  COMPLETED: { color: 'border-l-green-400',   bg: 'bg-green-400/10',  text: 'text-green-400',   dot: 'bg-green-400',   label: 'Completed' },
  CANCELLED: { color: 'border-l-red-500',     bg: 'bg-red-500/10',    text: 'text-red-500',     dot: 'bg-red-500',     label: 'Cancelled' },
}

const FILTERS = ['ALL', 'PENDING', 'ACCEPTED', 'PREPARING', 'COMPLETED']

// ── Single Order Card ───────────────────────────────────────────────────────
function OrderCard({ order, onAccept, onPrepare, onComplete, onCancel }) {
  const cfg = STATUS_CFG[order.status] || STATUS_CFG.PENDING
  const elapsed = Math.floor((Date.now() - new Date(order.createdAt)) / 60000)

  return (
    <div className={`relative bg-gray-900 rounded-2xl border border-gray-800 border-l-4 ${cfg.color} overflow-hidden group hover:border-gray-700 transition-all duration-200`}>
      {/* Header */}
      <div className={`px-4 py-3 ${cfg.bg} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${cfg.dot} ${order.status === 'PENDING' ? 'animate-pulse' : ''}`} />
          <span className={`font-bold text-xs uppercase tracking-widest ${cfg.text}`}>{cfg.label}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Table</span>
          <span className="font-black text-white text-base">#{order.tableNumber}</span>
          <span className="text-gray-600">•</span>
          <span>{elapsed}m ago</span>
        </div>
      </div>

      {/* Customer */}
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <div>
          <p className="text-white font-bold text-sm">{order.customerName}</p>
          <p className="text-gray-500 text-xs">{order.phone}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-500 text-[10px] uppercase tracking-wider">Total</p>
          <p className="text-white font-extrabold text-lg leading-none">Rs. {order.totalPrice}</p>
        </div>
      </div>

      {/* Items */}
      <div className="px-4 py-2 space-y-0.5 max-h-36 overflow-y-auto">
        {order.items?.map(item => (
          <div key={item.id} className="flex justify-between text-xs py-1 border-b border-gray-800/60 last:border-0">
            <span className="text-gray-300 font-medium">
              <span className="text-gray-600 mr-1.5">×{item.quantity}</span>
              {item.menuItem?.name}
            </span>
            <span className="text-gray-500">Rs. {(item.price * item.quantity)}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-gray-800 flex gap-2">
        {order.status === 'PENDING' && (
          <>
            <button onClick={() => onAccept(order)} className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5">
              ✓ Accept
            </button>
            <button onClick={() => onCancel(order)} className="py-2 px-3 rounded-xl text-xs font-bold text-red-400 bg-red-900/30 hover:bg-red-900/60 transition-colors">
              ✕
            </button>
          </>
        )}
        {order.status === 'ACCEPTED' && (
          <button onClick={() => onPrepare(order)} className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 transition-colors">
            🔥 Start Preparing
          </button>
        )}
        {order.status === 'PREPARING' && (
          <button onClick={() => onComplete(order)} className="flex-1 py-2 rounded-xl text-xs font-bold text-black bg-green-400 hover:bg-green-300 transition-colors">
            ✓ Mark Complete
          </button>
        )}
        {(order.status === 'COMPLETED' || order.status === 'CANCELLED') && (
          <div className={`flex-1 py-2 rounded-xl text-xs font-bold text-center ${cfg.text} ${cfg.bg}`}>
            {order.status === 'COMPLETED' ? '✓ Done' : '✕ Cancelled'}
          </div>
        )}
      </div>

      {/* ID */}
      <p className="px-4 pb-2 text-gray-700 text-[10px] font-mono">#{order.id.slice(-8).toUpperCase()}</p>
    </div>
  )
}

// ── Stat Pill ────────────────────────────────────────────────────────────────
const Pill = ({ label, value, color }) => (
  <div className="bg-gray-800/60 rounded-xl px-3 py-2 text-center">
    <p className={`font-extrabold text-xl leading-none ${color}`}>{value}</p>
    <p className="text-gray-500 text-[10px] mt-0.5 uppercase tracking-wider">{label}</p>
  </div>
)

// ── Main Page ────────────────────────────────────────────────────────────────
export default function KitchenDashboardPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const [orders, setOrders]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [fetchError, setFetchError]   = useState(null)
  const [filter, setFilter]           = useState('ALL')
  const [connected, setConnected]     = useState(socket.connected)
  const [restaurant, setRestaurant]   = useState({ name: 'Kitchen', logoUrl: null })
  const [confirm, setConfirm]         = useState(null)
  const [newBadge, setNewBadge]       = useState(0)
  const badgeTimerRef                 = useRef(null)

  // Flash new badge for 8s then fade
  const flashBadge = useCallback(() => {
    setNewBadge(n => n + 1)
    clearTimeout(badgeTimerRef.current)
    badgeTimerRef.current = setTimeout(() => setNewBadge(0), 8000)
  }, [])

  // Fetch orders (with retry support)
  const fetchOrders = useCallback(async () => {
    try {
      setFetchError(null)
      const res = await api.get('/orders')
      setOrders(res.data)
    } catch (err) {
      setFetchError(err.message || 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchOrders()
    if (user?.restaurantId) {
      api.get('/restaurant/mine').then(r => {
        setRestaurant({ name: r.data.name, logoUrl: r.data.logoUrl })
      }).catch(() => {})
    }
  }, [user, fetchOrders])

  // Socket listeners
  useEffect(() => {
    socket.emit('join_kitchen')
    if (user?.restaurantId) socket.emit('join_restaurant', { restaurantId: user.restaurantId })

    const onNewOrder = (order) => {
      setOrders(prev => prev.find(o => o.id === order.id) ? prev : [order, ...prev])
      playDing()
      flashBadge()
      toast.success(`🆕 New order — Table #${order.tableNumber}!`, { duration: 6000 })
    }
    const onStatusUpdate = ({ orderId, status }) => {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
    }
    const onRestaurantUpdated = (data) => {
      setRestaurant({ name: data.name, logoUrl: data.logoUrl })
      toast.success(`Restaurant updated: "${data.name}"`, { icon: '🏢' })
    }
    const onConnect    = () => setConnected(true)
    const onDisconnect = () => setConnected(false)

    socket.on('new_order', onNewOrder)
    socket.on('order_status_update', onStatusUpdate)
    socket.on('restaurant_updated', onRestaurantUpdated)
    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)

    return () => {
      socket.off('new_order', onNewOrder)
      socket.off('order_status_update', onStatusUpdate)
      socket.off('restaurant_updated', onRestaurantUpdated)
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
    }
  }, [user, flashBadge])

  // Status update executor
  const doStatusUpdate = async (orderId, status) => {
    try {
      const res = await api.put(`/orders/${orderId}/status`, { status })
      setOrders(prev => prev.map(o => o.id === orderId ? res.data : o))
      toast.success(`Marked as ${status.toLowerCase()}`)
      if (status === 'ACCEPTED') {
        api.post('/otp/send', { orderId }).catch(() => {})
      }
    } catch (err) { toast.error(err.message) }
    finally { setConfirm(null) }
  }

  // Confirmation helpers
  const askAccept   = (order) => setConfirm({ title: 'Accept Order?', message: `Accept order from ${order.customerName} (Table #${order.tableNumber})? OTP will be sent to customer.`, onConfirm: () => doStatusUpdate(order.id, 'ACCEPTED'), type: 'info', confirmLabel: '✓ Accept', confirmStyle: 'bg-blue-600 hover:bg-blue-700' })
  const askPrepare  = (order) => setConfirm({ title: 'Start Preparing?', message: `Mark Table #${order.tableNumber} order as preparing?`, onConfirm: () => doStatusUpdate(order.id, 'PREPARING'), type: 'warning', confirmLabel: '🔥 Start Preparing' })
  const askComplete = (order) => setConfirm({ title: 'Mark Complete?', message: `Mark this order from ${order.customerName} as completed and served?`, onConfirm: () => doStatusUpdate(order.id, 'COMPLETED'), type: 'info', confirmLabel: '✓ Complete' })
  const askCancel   = (order) => setConfirm({ title: 'Cancel Order?', message: `Cancel order from ${order.customerName}? This cannot be undone.`, onConfirm: () => doStatusUpdate(order.id, 'CANCELLED'), type: 'danger', confirmLabel: 'Cancel Order' })
  const askLogout   = () => setConfirm({ title: 'Sign Out?', message: 'Are you sure you want to sign out of Kitchen Dashboard?', onConfirm: () => { logout(); navigate('/kitchen/login') }, type: 'danger', confirmLabel: 'Sign Out' })

  const filteredOrders = filter === 'ALL' ? orders : orders.filter(o => o.status === filter)

  const counts = {
    pending:   orders.filter(o => o.status === 'PENDING').length,
    accepted:  orders.filter(o => o.status === 'ACCEPTED').length,
    preparing: orders.filter(o => o.status === 'PREPARING').length,
    completed: orders.filter(o => o.status === 'COMPLETED').length,
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* ── Top Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-30 flex-shrink-0">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Logo + Restaurant name (real-time) */}
          <div className="flex items-center gap-3 min-w-0">
            {restaurant.logoUrl
              ? <img src={restaurant.logoUrl} alt="logo" className="w-9 h-9 rounded-xl object-cover ring-2 ring-gray-700 flex-shrink-0" />
              : <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-orange-600 rounded-xl flex items-center justify-center text-lg flex-shrink-0">🍽️</div>
            }
            <div className="min-w-0">
              <p className="text-white font-extrabold text-sm leading-none truncate">{restaurant.name}</p>
              <p className="text-gray-500 text-xs mt-0.5">Kitchen Dashboard</p>
            </div>
          </div>

          {/* Center — pending badge */}
          <div className="flex items-center gap-3">
            {counts.pending > 0 && (
              <div className="relative flex items-center gap-2 bg-red-900/30 border border-red-700/50 rounded-full px-3 py-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                </span>
                <span className="text-red-300 text-xs font-bold">{counts.pending} new order{counts.pending > 1 ? 's' : ''}</span>
              </div>
            )}
            {newBadge > 0 && counts.pending === 0 && (
              <div className="bg-green-900/30 border border-green-700/50 rounded-full px-3 py-1.5 text-green-300 text-xs font-bold">
                ✓ Orders incoming
              </div>
            )}
          </div>

          {/* Right — connection + logout */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400 animate-pulse'}`} />
              <span className="text-xs text-gray-500">{connected ? 'Live' : 'Reconnecting…'}</span>
            </div>
            <div className="h-5 w-px bg-gray-700 hidden sm:block" />
            <div className="text-right hidden md:block">
              <p className="text-white text-xs font-semibold leading-none">{user?.name}</p>
              <p className="text-gray-600 text-[10px] mt-0.5">Kitchen Staff</p>
            </div>
            <button onClick={askLogout} className="text-xs text-gray-500 hover:text-red-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-800">
              Sign out
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 pb-3 flex gap-2 overflow-x-auto">
          {FILTERS.map(f => {
            const count = f === 'ALL' ? orders.length : counts[f.toLowerCase()] ?? orders.filter(o => o.status === f).length
            const isActive = filter === f
            const isPending = f === 'PENDING' && counts.pending > 0
            return (
              <button
                key={f}
                onClick={() => { setFilter(f); if(f === 'PENDING') setNewBadge(0) }}
                className={`relative flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-150 ${
                  isActive ? 'bg-white text-gray-900' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {isPending && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center animate-bounce">
                    {counts.pending}
                  </span>
                )}
                {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
                <span className={`${isActive ? 'bg-gray-200 text-gray-700' : 'bg-gray-700 text-gray-400'} rounded-full px-1.5 py-0.5 text-[10px] font-bold`}>{count}</span>
              </button>
            )
          })}
        </div>
      </header>

      {/* ── Main Grid ──────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 sm:px-6 py-5">
        {/* Error banner */}
        {fetchError && (
          <div className="mb-4 bg-red-900/30 border border-red-700/50 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-red-300 text-sm">
              <span>⚠️</span>
              <span>{fetchError}</span>
            </div>
            <button onClick={fetchOrders} className="text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0">
              Retry
            </button>
          </div>
        )}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">Loading orders…</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-24 h-24 bg-gray-900 rounded-full flex items-center justify-center text-5xl mb-6 border border-gray-800">🍳</div>
            <p className="text-white font-bold text-lg">No {filter !== 'ALL' ? filter.toLowerCase() : ''} orders</p>
            <p className="text-gray-600 text-sm mt-1">Orders will appear here in real-time</p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 xl:columns-3 gap-4 space-y-4">
            {filteredOrders.map(order => (
              <div key={order.id} className="break-inside-avoid">
                <OrderCard
                  order={order}
                  onAccept={askAccept}
                  onPrepare={askPrepare}
                  onComplete={askComplete}
                  onCancel={askCancel}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── Confirmation Modal ─────────────────────────────────────────────────── */}
      {confirm && (
        <ConfirmModal
          open
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel || 'Confirm'}
          type={confirm.type || 'danger'}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
