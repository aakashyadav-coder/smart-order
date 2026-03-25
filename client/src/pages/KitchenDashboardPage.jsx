/**
 * KitchenDashboardPage — Ultra-professional real-time order management
 * Theme: White-Red Professional with dark brand header
 */
import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../lib/api'
import socket from '../lib/socket'
import { useAuth } from '../context/AuthContext'
import ConfirmModal from '../components/ConfirmModal'
import { ChefHat, Wifi, WifiOff, LogOut, CheckCircle, Flame, XCircle, RefreshCw, Clock } from '../components/Icons'

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

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG = {
  PENDING:   { borderColor: 'border-l-amber-500',   bg: 'bg-amber-50',   text: 'text-amber-700',  dot: 'bg-amber-500',   badge: 'bg-amber-100 text-amber-800 border-amber-200',   label: 'Pending'   },
  ACCEPTED:  { borderColor: 'border-l-blue-500',    bg: 'bg-blue-50',    text: 'text-blue-700',   dot: 'bg-blue-500',    badge: 'bg-blue-100 text-blue-800 border-blue-200',       label: 'Accepted'  },
  PREPARING: { borderColor: 'border-l-orange-500',  bg: 'bg-orange-50',  text: 'text-orange-700', dot: 'bg-orange-500',  badge: 'bg-orange-100 text-orange-800 border-orange-200', label: 'Preparing' },
  SERVED:    { borderColor: 'border-l-green-500',   bg: 'bg-green-50',   text: 'text-green-700',  dot: 'bg-green-500',   badge: 'bg-green-100 text-green-800 border-green-200',    label: 'Served'    },
  CANCELLED: { borderColor: 'border-l-red-400',     bg: 'bg-red-50',     text: 'text-red-600',    dot: 'bg-red-400',     badge: 'bg-red-100 text-red-700 border-red-200',           label: 'Cancelled' },
  PAID:      { borderColor: 'border-l-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700',dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',label: 'Paid'     },
}

const FILTERS = ['ALL', 'PENDING', 'ACCEPTED', 'PREPARING', 'SERVED']

// ── Single Order Card ─────────────────────────────────────────────────────────
function OrderCard({ order, onAccept, onPrepare, onServe, onCancel }) {
  const cfg     = STATUS_CFG[order.status] || STATUS_CFG.PENDING
  const elapsed = Math.floor((Date.now() - new Date(order.createdAt)) / 60000)
  const isUrgent = order.status === 'PENDING' && elapsed >= 5

  return (
    <div className={`relative bg-white rounded-2xl border border-gray-100 border-l-4 ${cfg.borderColor} shadow-sm overflow-hidden hover:shadow-md transition-all duration-200 flex flex-col`}>

      {/* ── Card header strip ── */}
      <div className={`px-4 py-3 ${cfg.bg} flex items-center justify-between border-b border-gray-100`}>
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot} flex-shrink-0 ${order.status === 'PENDING' ? 'animate-pulse' : ''}`} />
          <span className={`font-extrabold text-xs uppercase tracking-widest ${cfg.text}`}>{cfg.label}</span>
          {isUrgent && (
            <span className="flex items-center gap-1 bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide animate-pulse">
              Urgent
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Clock className="w-3 h-3" />
          <span className={elapsed >= 5 ? 'text-red-500 font-bold' : ''}>{elapsed}m ago</span>
        </div>
      </div>

      {/* ── Table & customer row ── */}
      <div className="px-4 pt-3.5 pb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display font-extrabold text-gray-900 text-base leading-none truncate">{order.customerName}</p>
          {order.phone && <p className="text-gray-400 text-xs mt-1">{order.phone}</p>}
        </div>
        <div className="flex flex-col items-end flex-shrink-0">
          <div className="flex items-center gap-1">
            <span className="text-gray-400 text-[10px] uppercase tracking-wider">Table</span>
            <span className="font-display font-black text-gray-900 text-2xl leading-none">#{order.tableNumber}</span>
          </div>
          <p className="text-gray-900 font-bold text-sm mt-0.5">Rs. {order.totalPrice}</p>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="mx-4 border-t border-gray-100" />

      {/* ── Items list ── */}
      <div className="px-4 py-2.5 space-y-1.5 max-h-44 overflow-y-auto flex-1">
        {order.items?.map(item => (
          <div key={item.id} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] rounded-md bg-brand-50 text-brand-700 text-[10px] font-black border border-brand-100 flex-shrink-0">
                ×{item.quantity}
              </span>
              <span className="text-gray-700 text-xs font-medium truncate">{item.menuItem?.name}</span>
            </div>
            <span className="text-gray-400 text-xs flex-shrink-0">Rs. {(item.price * item.quantity)}</span>
          </div>
        ))}
      </div>

      {/* ── Actions ── */}
      <div className="px-4 py-3 border-t border-gray-100 flex gap-2 flex-shrink-0">
        {order.status === 'PENDING' && (
          <>
            <button
              onClick={() => onAccept(order)}
              className="flex-1 py-2.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-brand-700 to-brand-500 hover:from-brand-800 hover:to-brand-600 transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-brand-500/25"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Accept Order
            </button>
            <button
              onClick={() => onCancel(order)}
              className="py-2.5 px-3 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors flex items-center justify-center"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </>
        )}
        {order.status === 'ACCEPTED' && (
          <button
            onClick={() => onPrepare(order.id)}
            className="flex-1 py-2.5 rounded-xl text-xs font-extrabold text-white bg-orange-500 hover:bg-orange-600 transition-colors shadow-sm flex items-center justify-center gap-1.5"
          >
            <Flame className="w-3.5 h-3.5" /> Start Preparing
          </button>
        )}
        {order.status === 'PREPARING' && (
          <button
            onClick={() => onServe(order.id)}
            className="flex-1 py-2.5 rounded-xl text-xs font-extrabold text-white bg-green-600 hover:bg-green-700 transition-colors shadow-sm flex items-center justify-center gap-1.5"
          >
            <CheckCircle className="w-3.5 h-3.5" /> Mark Served
          </button>
        )}
        {(order.status === 'SERVED' || order.status === 'PAID' || order.status === 'CANCELLED') && (
          <div className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold text-center ${cfg.text} ${cfg.bg} border ${
            order.status === 'CANCELLED' ? 'border-red-200' :
            order.status === 'PAID' ? 'border-emerald-200' : 'border-green-200'
          }`}>
            {order.status === 'SERVED' ? '✓ Served' : order.status === 'PAID' ? '💳 Paid' : '✕ Cancelled'}
          </div>
        )}
      </div>

      {/* ── Order ID footer ── */}
      <p className="px-4 pb-2.5 text-gray-300 text-[9px] font-mono uppercase tracking-wider">
        #{order.id.slice(-8).toUpperCase()}
      </p>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
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
      setFilter('PENDING')
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
    ALL:       orders.filter(o => o.status !== 'PAID').length,
    PENDING:   orders.filter(o => o.status === 'PENDING').length,
    ACCEPTED:  orders.filter(o => o.status === 'ACCEPTED').length,
    PREPARING: orders.filter(o => o.status === 'PREPARING').length,
    SERVED:    orders.filter(o => o.status === 'SERVED').length,
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Dark Brand Header ─────────────────────────────────────────────────── */}
      <header className="bg-gradient-to-r from-gray-950 to-gray-900 sticky top-0 z-30 flex-shrink-0 shadow-xl shadow-black/20">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">

          {/* Logo + Brand */}
          <div className="flex items-center gap-3 min-w-0">
            {restaurant.logoUrl && !logoError
              ? <img
                  src={restaurant.logoUrl}
                  alt="logo"
                  className="w-10 h-10 rounded-xl object-cover ring-2 ring-white/10 flex-shrink-0"
                  onError={() => setLogoError(true)}
                />
              : <div className="w-10 h-10 bg-gradient-to-br from-brand-600 to-brand-800 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-900/40">
                  <ChefHat className="w-5 h-5 text-white" />
                </div>
            }
            <div className="min-w-0">
              <p className="font-display text-white font-extrabold text-sm leading-none truncate">{restaurant.name}</p>
              <p className="text-brand-400 text-xs font-semibold mt-0.5 tracking-wide">Kitchen Display</p>
            </div>
          </div>

          {/* Center — Pending alert */}
          <div className="flex items-center gap-3">
            {counts.PENDING > 0 && (
              <div className="relative flex items-center gap-2 bg-brand-600/20 border border-brand-500/40 rounded-full px-3.5 py-1.5">
                <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-500" />
                </span>
                <span className="text-brand-300 text-xs font-bold">{counts.PENDING} pending order{counts.PENDING > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          {/* Right — connection + user + logout */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Connection status */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5">
              {connected
                ? <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                    </span>
                    <span className="text-xs text-gray-400 font-medium">Live</span>
                  </>
                : <>
                    <WifiOff className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                    <span className="text-xs text-red-400 font-medium">Reconnecting…</span>
                  </>
              }
            </div>

            <div className="h-5 w-px bg-white/10 hidden sm:block" />

            {/* User info */}
            <div className="text-right hidden md:block">
              <p className="text-white text-xs font-semibold leading-none">{user?.name}</p>
              <p className="text-gray-500 text-[10px] mt-0.5">Kitchen Staff</p>
            </div>

            {/* Logout */}
            <button
              onClick={askLogout}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand-400 transition-colors px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-medium">Sign out</span>
            </button>
          </div>
        </div>

        {/* ── Filter Strip ── */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-2.5 flex gap-2 overflow-x-auto scrollbar-none">
            {FILTERS.map(f => {
              const count   = counts[f] ?? 0
              const isActive = filter === f
              const badge   = f !== 'ALL' && statusBadges[f] ? statusBadges[f] : 0
              const cfg     = f !== 'ALL' ? STATUS_CFG[f] : null
              return (
                <button
                  key={f}
                  onClick={() => { setFilter(f); if (f !== 'ALL') clearBadge(f) }}
                  className={`relative flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-150 ${
                    isActive
                      ? 'bg-gradient-to-r from-brand-700 to-brand-500 text-white shadow-md shadow-brand-500/25'
                      : 'bg-gray-50 text-gray-500 border border-gray-200 hover:text-gray-800 hover:bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-brand-600 rounded-full text-[9px] text-white flex items-center justify-center animate-bounce">
                      {badge}
                    </span>
                  )}
                  {f !== 'ALL' && cfg && (
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-white/70' : cfg.dot}`} />
                  )}
                  <span>{f === 'ALL' ? 'All Orders' : cfg?.label || f}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                    isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>{count}</span>
                </button>
              )
            })}
          </div>
        </div>
      </header>

      {/* ── Main Content ──────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 sm:px-6 py-5">

        {/* Error banner */}
        {fetchError && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <XCircle className="w-4 h-4" /><span>{fetchError}</span>
            </div>
            <button
              onClick={fetchOrders}
              className="flex items-center gap-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <div className="relative">
              <div className="w-14 h-14 border-4 border-brand-100 rounded-full" />
              <div className="absolute inset-0 w-14 h-14 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="text-center">
              <p className="font-display font-bold text-gray-700">Loading orders…</p>
              <p className="text-gray-400 text-sm mt-1">Fetching the latest from kitchen</p>
            </div>
          </div>

        /* Empty state */
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-36 text-center">
            <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center text-5xl mb-6 border border-gray-100 shadow-md shadow-gray-100">
              🍳
            </div>
            <p className="font-display font-extrabold text-gray-800 text-xl">
              {filter !== 'ALL' ? `No ${STATUS_CFG[filter]?.label?.toLowerCase() || filter.toLowerCase()} orders` : 'No active orders'}
            </p>
            <p className="text-gray-400 text-sm mt-2 max-w-xs">
              Orders will appear here in real-time as customers place them
            </p>
            {filter !== 'ALL' && (
              <button
                onClick={() => setFilter('ALL')}
                className="mt-5 px-5 py-2.5 text-sm font-bold rounded-xl bg-brand-50 text-brand-600 border border-brand-200 hover:bg-brand-100 transition-colors"
              >
                View All Orders
              </button>
            )}
          </div>

        /* Order grid */
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
