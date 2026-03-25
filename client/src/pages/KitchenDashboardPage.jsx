/**
 * KitchenDashboardPage — Ultra-professional real-time order management
 * Theme: White-Red Professional
 */
import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../lib/api'
import socket from '../lib/socket'
import { useAuth } from '../context/AuthContext'
import ConfirmModal from '../components/ConfirmModal'
import { ChefHat, Wifi, WifiOff, LogOut, CheckCircle, Flame, XCircle, RefreshCw } from '../components/Icons'

// ── Notification sound ──────────────────────────────────────────────────────
let _audioCtx = null
const getAudioCtx = () => {
  if (!_audioCtx || _audioCtx.state === 'closed') {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  return _audioCtx
}
const playDing = () => {
  try {
    const ctx = getAudioCtx()
    if (ctx.state === 'suspended') ctx.resume()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(1047, ctx.currentTime)
    osc.frequency.setValueAtTime(784,  ctx.currentTime + 0.12)
    gain.gain.setValueAtTime(0.35, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.6)
  } catch (_) {}
}

// ── Status config — light theme ─────────────────────────────────────────────
const STATUS_CFG = {
  PENDING:   { color: 'border-l-amber-500',   bg: 'bg-amber-50',   text: 'text-amber-700',  dot: 'bg-amber-500',   label: 'Pending'   },
  ACCEPTED:  { color: 'border-l-blue-500',    bg: 'bg-blue-50',    text: 'text-blue-700',   dot: 'bg-blue-500',    label: 'Accepted'  },
  PREPARING: { color: 'border-l-orange-500',  bg: 'bg-orange-50',  text: 'text-orange-700', dot: 'bg-orange-500',  label: 'Preparing' },
  SERVED:    { color: 'border-l-green-500',   bg: 'bg-green-50',   text: 'text-green-700',  dot: 'bg-green-500',   label: 'Served'    },
  CANCELLED: { color: 'border-l-red-400',     bg: 'bg-red-50',     text: 'text-red-600',    dot: 'bg-red-400',     label: 'Cancelled' },
  PAID:      { color: 'border-l-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700',dot: 'bg-emerald-500', label: 'Paid'      },
}

const FILTERS = ['ALL', 'PENDING', 'ACCEPTED', 'PREPARING', 'SERVED']

// ── Single Order Card ───────────────────────────────────────────────────────
function OrderCard({ order, onAccept, onPrepare, onServe, onCancel }) {
  const cfg     = STATUS_CFG[order.status] || STATUS_CFG.PENDING
  const elapsed = Math.floor((Date.now() - new Date(order.createdAt)) / 60000)

  return (
    <div className={`relative bg-white rounded-2xl border border-gray-200 border-l-4 ${cfg.color} overflow-hidden hover:shadow-md transition-all duration-200`}>
      {/* Header */}
      <div className={`px-4 py-3 ${cfg.bg} flex items-center justify-between border-b border-gray-100`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${cfg.dot} ${order.status === 'PENDING' ? 'animate-pulse' : ''}`} />
          <span className={`font-bold text-xs uppercase tracking-widest ${cfg.text}`}>{cfg.label}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>Table</span>
          <span className="font-black text-gray-800 text-base">#{order.tableNumber}</span>
          <span className="text-gray-300">•</span>
          <span>{elapsed}m ago</span>
        </div>
      </div>

      {/* Customer */}
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <div>
          <p className="text-gray-900 font-bold text-sm">{order.customerName}</p>
          <p className="text-gray-400 text-xs">{order.phone}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-400 text-[10px] uppercase tracking-wider">Total</p>
          <p className="text-gray-900 font-extrabold text-lg leading-none">Rs. {order.totalPrice}</p>
        </div>
      </div>

      {/* Items */}
      <div className="px-4 py-2 space-y-0.5 max-h-36 overflow-y-auto">
        {order.items?.map(item => (
          <div key={item.id} className="flex justify-between text-xs py-1 border-b border-gray-100 last:border-0">
            <span className="text-gray-700 font-medium">
              <span className="text-gray-400 mr-1.5">×{item.quantity}</span>
              {item.menuItem?.name}
            </span>
            <span className="text-gray-500">Rs. {(item.price * item.quantity)}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
        {order.status === 'PENDING' && (
          <>
            <button onClick={() => onAccept(order)}
              className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 transition-all flex items-center justify-center gap-1.5 shadow-sm">
              <CheckCircle className="w-3.5 h-3.5" /> Accept
            </button>
            <button onClick={() => onCancel(order)}
              className="py-2 px-3 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors flex items-center justify-center">
              <XCircle className="w-3.5 h-3.5" />
            </button>
          </>
        )}
        {order.status === 'ACCEPTED' && (
          <button onClick={() => onPrepare(order.id)}
            className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 transition-colors shadow-sm flex items-center justify-center gap-1.5">
            <Flame className="w-3.5 h-3.5" /> Start Preparing
          </button>
        )}
        {order.status === 'PREPARING' && (
          <button onClick={() => onServe(order.id)}
            className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-green-600 hover:bg-green-700 transition-colors shadow-sm flex items-center justify-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" /> Mark Served
          </button>
        )}
        {(order.status === 'SERVED' || order.status === 'PAID' || order.status === 'CANCELLED') && (
          <div className={`flex-1 py-2 rounded-xl text-xs font-bold text-center ${cfg.text} ${cfg.bg} border ${order.status === 'CANCELLED' ? 'border-red-200' : order.status === 'PAID' ? 'border-emerald-200' : 'border-green-200'}`}>
            {order.status === 'SERVED' ? '✓ Served' : order.status === 'PAID' ? '💳 Paid' : '✕ Cancelled'}
          </div>
        )}
      </div>

      {/* ID */}
      <p className="px-4 pb-2 text-gray-300 text-[10px] font-mono">#{order.id.slice(-8).toUpperCase()}</p>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function KitchenDashboardPage() {
  const navigate = useNavigate()
  const { user, logout, loading: authLoading } = useAuth()

  const [orders, setOrders]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [filter, setFilter]         = useState(() => localStorage.getItem('kitchen_filter') || 'ALL')
  const [connected, setConnected]   = useState(socket.connected)
  const [restaurant, setRestaurant] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kitchen_restaurant') || 'null') || { name: 'Kitchen', logoUrl: null } }
    catch { return { name: 'Kitchen', logoUrl: null } }
  })
  const [confirm, setConfirm]       = useState(null)
  const [logoError, setLogoError]   = useState(false)
  const [statusBadges, setStatusBadges] = useState({})
  const badgeTimersRef = useRef({})

  // Persist active filter
  useEffect(() => {
    localStorage.setItem('kitchen_filter', filter)
  }, [filter])

  const addBadge = useCallback((status) => {
    setStatusBadges(prev => ({ ...prev, [status]: (prev[status] || 0) + 1 }))
    clearTimeout(badgeTimersRef.current[status])
    badgeTimersRef.current[status] = setTimeout(() => {
      setStatusBadges(prev => { const n = { ...prev }; delete n[status]; return n })
    }, 10000)
  }, [])

  const clearBadge = (status) => {
    setStatusBadges(prev => { const n = { ...prev }; delete n[status]; return n })
    clearTimeout(badgeTimersRef.current[status])
  }

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

  useEffect(() => {
    if (authLoading) return
    fetchOrders()
    api.get('/restaurant/mine').then(r => {
      const data = { name: r.data.name, logoUrl: r.data.logoUrl }
      setRestaurant(data)
      setLogoError(false)
      localStorage.setItem('kitchen_restaurant', JSON.stringify(data))
    }).catch(() => {})
    socket.emit('join_kitchen')
    if (user?.restaurantId) socket.emit('join_restaurant', { restaurantId: user.restaurantId })
  }, [authLoading, fetchOrders, user?.restaurantId])

  useEffect(() => {
    const onNewOrder = (order) => {
      setOrders(prev => prev.find(o => o.id === order.id) ? prev : [order, ...prev])
      playDing()
      addBadge('PENDING')
      setFilter('PENDING') // auto-focus pending column so no order is missed
      toast.success(`🆕 New order — Table #${order.tableNumber}!`, { duration: 6000 })
    }
    const onStatusUpdate = ({ orderId, status }) => {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
      if (STATUS_CFG[status]) addBadge(status)
    }
    const onRestaurantUpdated = (data) => {
      const branding = { name: data.name, logoUrl: data.logoUrl }
      setRestaurant(branding)
      setLogoError(false)
      localStorage.setItem('kitchen_restaurant', JSON.stringify(branding))
      toast.success(`Restaurant updated: "${data.name}"`, { icon: '🏢' })
    }
    const onConnect    = () => setConnected(true)
    const onDisconnect = () => setConnected(false)

    socket.on('new_order',           onNewOrder)
    socket.on('order_status_update', onStatusUpdate)
    socket.on('restaurant_updated',  onRestaurantUpdated)
    socket.on('connect',             onConnect)
    socket.on('disconnect',          onDisconnect)

    return () => {
      socket.off('new_order',           onNewOrder)
      socket.off('order_status_update', onStatusUpdate)
      socket.off('restaurant_updated',  onRestaurantUpdated)
      socket.off('connect',             onConnect)
      socket.off('disconnect',          onDisconnect)
    }
  }, [addBadge])

  const doStatusUpdate = async (orderId, status) => {
    try {
      const res = await api.put(`/orders/${orderId}/status`, { status })
      setOrders(prev => prev.map(o => o.id === orderId ? res.data : o))
      const label = STATUS_CFG[status]?.label || status
      toast.success(`Marked as ${label}`)
      if (status === 'ACCEPTED') {
        api.post('/otp/send', { orderId }).catch(() => {})
      }
    } catch (err) { toast.error(err.message) }
  }

  const askAccept = (order) => setConfirm({
    title: 'Accept Order?',
    message: `Accept order from ${order.customerName} (Table #${order.tableNumber})? An OTP will be sent to the customer.`,
    onConfirm: () => { doStatusUpdate(order.id, 'ACCEPTED'); setConfirm(null) },
    type: 'info',
    confirmLabel: '✓ Accept',
    confirmStyle: 'bg-brand-600 hover:bg-brand-700',
  })
  const askCancel = (order) => setConfirm({
    title: 'Cancel Order?',
    message: `Cancel order from ${order.customerName}? This cannot be undone.`,
    onConfirm: () => { doStatusUpdate(order.id, 'CANCELLED'); setConfirm(null) },
    type: 'danger',
    confirmLabel: 'Cancel Order',
  })
  const askLogout = () => setConfirm({
    title: 'Sign Out?',
    message: 'Are you sure you want to sign out of Kitchen Dashboard?',
    onConfirm: () => { logout(); navigate('/kitchen/login') },
    type: 'danger',
    confirmLabel: 'Sign Out',
  })

  const filteredOrders = filter === 'ALL'
    ? orders.filter(o => o.status !== 'PAID')
    : orders.filter(o => o.status === filter)

  const counts = {
    PENDING:   orders.filter(o => o.status === 'PENDING').length,
    ACCEPTED:  orders.filter(o => o.status === 'ACCEPTED').length,
    PREPARING: orders.filter(o => o.status === 'PREPARING').length,
    SERVED:    orders.filter(o => o.status === 'SERVED').length,
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ── Top Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 flex-shrink-0 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Logo + Brand */}
          <div className="flex items-center gap-3 min-w-0">
            {restaurant.logoUrl && !logoError
              ? <img src={restaurant.logoUrl} alt="logo"
                  className="w-9 h-9 rounded-xl object-cover ring-2 ring-gray-200 flex-shrink-0"
                  onError={() => setLogoError(true)} />
              : <div className="w-9 h-9 bg-gradient-to-br from-brand-600 to-brand-700 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                  <ChefHat className="w-5 h-5 text-white" />
                </div>
            }
            <div className="min-w-0">
              <p className="text-gray-900 font-extrabold text-sm leading-none truncate">{restaurant.name}</p>
              <p className="text-gray-400 text-xs mt-0.5">Kitchen Dashboard</p>
            </div>
          </div>

          {/* Pending alert */}
          <div className="flex items-center gap-3">
            {counts.PENDING > 0 && (
              <div className="relative flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-full px-3 py-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-600" />
                </span>
                <span className="text-brand-700 text-xs font-bold">{counts.PENDING} pending order{counts.PENDING > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          {/* Right — connection + logout */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-1.5">
              {connected
                ? <><Wifi className="w-3.5 h-3.5 text-green-500" /><span className="text-xs text-gray-400">Live</span></>
                : <><WifiOff className="w-3.5 h-3.5 text-red-400 animate-pulse" /><span className="text-xs text-gray-400">Reconnecting…</span></>}
            </div>
            <div className="h-5 w-px bg-gray-200 hidden sm:block" />
            <div className="text-right hidden md:block">
              <p className="text-gray-800 text-xs font-semibold leading-none">{user?.name}</p>
              <p className="text-gray-400 text-[10px] mt-0.5">Kitchen Staff</p>
            </div>
            <button onClick={askLogout} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand-600 transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-100">
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>

        {/* Filter strip */}
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 pb-3 flex gap-2 overflow-x-auto">
          {FILTERS.map(f => {
            const count   = f === 'ALL' ? orders.filter(o => o.status !== 'PAID').length : (counts[f] ?? 0)
            const isActive = filter === f
            const badge   = f !== 'ALL' && statusBadges[f] ? statusBadges[f] : 0
            return (
              <button key={f}
                onClick={() => { setFilter(f); if (f !== 'ALL') clearBadge(f) }}
                className={`relative flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-white text-gray-500 border border-gray-200 hover:text-gray-800 hover:border-gray-300'
                }`}>
                {badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-600 rounded-full text-[9px] text-white flex items-center justify-center animate-bounce">
                    {badge}
                  </span>
                )}
                {f === 'ALL' ? 'All' : STATUS_CFG[f]?.label || f}
                <span className={`${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'} rounded-full px-1.5 py-0.5 text-[10px] font-bold`}>{count}</span>
              </button>
            )
          })}
        </div>
      </header>

      {/* ── Main ──────────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 sm:px-6 py-5">
        {fetchError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <XCircle className="w-4 h-4" /><span>{fetchError}</span>
              </div>
              <button onClick={fetchOrders} className="flex items-center gap-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0">
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            </div>
        )}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">Loading orders…</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-5xl mb-6 border border-gray-200 shadow-sm">🍳</div>
            <p className="text-gray-800 font-bold text-lg">No {filter !== 'ALL' ? (STATUS_CFG[filter]?.label?.toLowerCase() || filter.toLowerCase()) : ''} orders</p>
            <p className="text-gray-400 text-sm mt-1">Orders will appear here in real-time</p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 xl:columns-3 gap-4 space-y-4">
            {filteredOrders.map(order => (
              <div key={order.id} className="break-inside-avoid">
                <OrderCard
                  order={order}
                  onAccept={askAccept}
                  onPrepare={(id) => doStatusUpdate(id, 'PREPARING')}
                  onServe={(id) => doStatusUpdate(id, 'SERVED')}
                  onCancel={askCancel}
                />
              </div>
            ))}
          </div>
        )}
      </main>

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
