/**
 * KitchenDashboardPage — Professional Kanban-style Kitchen Display System (KDS)
 * Layout: 4 status columns (PENDING → ACCEPTED → PREPARING → SERVED)
 * Design: Dark brand header, clean white columns, compact cards, zero clutter
 */
import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../lib/api'
import socket from '../lib/socket'
import { useAuth } from '../context/AuthContext'
import ConfirmModal from '../components/ConfirmModal'
import {
  ChefHat, Wifi, WifiOff, LogOut,
  CheckCircle, Flame, XCircle, RefreshCw, Clock
} from '../components/Icons'

// ── Audio ─────────────────────────────────────────────────────────────────────
let _audioCtx = null
const getCtx = () => {
  if (!_audioCtx || _audioCtx.state === 'closed')
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  return _audioCtx
}
const playDing = () => {
  try {
    const ctx = getCtx()
    if (ctx.state === 'suspended') ctx.resume()
    const osc = ctx.createOscillator(); const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(1047, ctx.currentTime)
    osc.frequency.setValueAtTime(784, ctx.currentTime + 0.12)
    gain.gain.setValueAtTime(0.35, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.6)
  } catch (_) {}
}

// ── Column config — defines the Kanban board ──────────────────────────────────
const COLUMNS = [
  {
    id: 'PENDING',
    label: 'Pending',
    headerBg: 'bg-amber-500',
    headerText: 'text-white',
    colBg: 'bg-amber-50/60',
    borderTop: 'border-t-4 border-t-amber-500',
    dot: 'bg-amber-500',
    badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
    cardBorder: 'border-l-amber-500',
    emptyIcon: '⏳',
  },
  {
    id: 'ACCEPTED',
    label: 'Accepted',
    headerBg: 'bg-blue-500',
    headerText: 'text-white',
    colBg: 'bg-blue-50/60',
    borderTop: 'border-t-4 border-t-blue-500',
    dot: 'bg-blue-500',
    badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
    cardBorder: 'border-l-blue-500',
    emptyIcon: '👍',
  },
  {
    id: 'PREPARING',
    label: 'Preparing',
    headerBg: 'bg-orange-500',
    headerText: 'text-white',
    colBg: 'bg-orange-50/60',
    borderTop: 'border-t-4 border-t-orange-500',
    dot: 'bg-orange-500',
    badgeBg: 'bg-orange-100 text-orange-800 border-orange-200',
    cardBorder: 'border-l-orange-500',
    emptyIcon: '🔥',
  },
  {
    id: 'SERVED',
    label: 'Served',
    headerBg: 'bg-green-600',
    headerText: 'text-white',
    colBg: 'bg-green-50/40',
    borderTop: 'border-t-4 border-t-green-600',
    dot: 'bg-green-500',
    badgeBg: 'bg-green-100 text-green-800 border-green-200',
    cardBorder: 'border-l-green-500',
    emptyIcon: '✅',
  },
]

// ── Compact Order Card ─────────────────────────────────────────────────────────
function OrderCard({ order, col, onAccept, onPrepare, onServe, onCancel }) {
  const elapsed  = Math.floor((Date.now() - new Date(order.createdAt)) / 60000)
  const isUrgent = col.id === 'PENDING' && elapsed >= 5

  return (
    <div className={`bg-white rounded-xl border border-gray-100 border-l-4 ${col.cardBorder} shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden`}>

      {/* Row 1 — Table # + elapsed time */}
      <div className="flex items-center justify-between px-3.5 pt-3 pb-1.5">
        <div className="flex items-center gap-2">
          <span className="font-display font-black text-gray-900 text-xl leading-none">
            #{order.tableNumber}
          </span>
          {isUrgent && (
            <span className="text-[9px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wide animate-pulse">
              Urgent
            </span>
          )}
        </div>
        <div className={`flex items-center gap-1 text-[11px] font-semibold ${elapsed >= 5 ? 'text-red-500' : 'text-gray-400'}`}>
          <Clock className="w-3 h-3" />
          {elapsed}m
        </div>
      </div>

      {/* Row 2 — Customer name */}
      <div className="px-3.5 pb-2.5">
        <p className="text-gray-800 text-sm font-semibold leading-none truncate">{order.customerName}</p>
        {order.phone && <p className="text-gray-400 text-[11px] mt-0.5">{order.phone}</p>}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100" />

      {/* Items list */}
      <div className="px-3.5 py-2.5 space-y-1 max-h-40 overflow-y-auto">
        {order.items?.map(item => (
          <div key={item.id} className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-gray-100 text-gray-600 font-black text-[10px] flex-shrink-0">
                {item.quantity}
              </span>
              <span className="text-gray-700 truncate">{item.menuItem?.name}</span>
            </div>
            <span className="text-gray-400 flex-shrink-0 text-[10px]">
              Rs.{item.price * item.quantity}
            </span>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100" />

      {/* Footer — total + action */}
      <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
        <span className="text-gray-900 font-bold text-sm">Rs. {order.totalPrice}</span>
        <div className="flex items-center gap-1.5">
          {col.id === 'PENDING' && (
            <>
              <button
                onClick={() => onAccept(order)}
                className="flex items-center gap-1 text-[11px] font-bold text-white bg-brand-600 hover:bg-brand-700 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <CheckCircle className="w-3 h-3" /> Accept
              </button>
              <button
                onClick={() => onCancel(order)}
                className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors border border-gray-100"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {col.id === 'ACCEPTED' && (
            <button
              onClick={() => onPrepare(order.id)}
              className="flex items-center gap-1 text-[11px] font-bold text-white bg-orange-500 hover:bg-orange-600 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <Flame className="w-3 h-3" /> Prepare
            </button>
          )}
          {col.id === 'PREPARING' && (
            <button
              onClick={() => onServe(order.id)}
              className="flex items-center gap-1 text-[11px] font-bold text-white bg-green-600 hover:bg-green-700 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <CheckCircle className="w-3 h-3" /> Serve
            </button>
          )}
          {col.id === 'SERVED' && (
            <span className="text-[11px] font-bold text-green-600 bg-green-50 px-2.5 py-1.5 rounded-lg border border-green-100">
              ✓ Done
            </span>
          )}
        </div>
      </div>

      {/* ID chip */}
      <div className="px-3.5 pb-2">
        <span className="text-gray-200 text-[9px] font-mono">#{order.id.slice(-6).toUpperCase()}</span>
      </div>
    </div>
  )
}

// ── Kanban Column ─────────────────────────────────────────────────────────────
function KanbanColumn({ col, orders, onAccept, onPrepare, onServe, onCancel }) {
  return (
    <div className={`flex flex-col rounded-2xl border border-gray-200 overflow-hidden shadow-sm ${col.borderTop} flex-shrink-0 w-72 xl:w-80`}
      style={{ height: 'calc(100vh - 96px)' }}
    >
      {/* Column header */}
      <div className={`${col.headerBg} px-4 py-3 flex items-center justify-between flex-shrink-0`}>
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full bg-white/40 flex-shrink-0 ${col.id === 'PENDING' && orders.length > 0 ? 'animate-pulse !bg-white' : ''}`} />
          <span className={`font-display font-extrabold text-sm ${col.headerText}`}>{col.label}</span>
        </div>
        <span className={`text-xs font-black px-2.5 py-0.5 rounded-full bg-white/20 ${col.headerText}`}>
          {orders.length}
        </span>
      </div>

      {/* Scrollable card list */}
      <div className={`flex-1 overflow-y-auto p-3 space-y-3 ${col.colBg} scrollbar-none`}>
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-16 text-center select-none">
            <span className="text-4xl opacity-30">{col.emptyIcon}</span>
            <p className="text-gray-400 text-xs font-semibold">No {col.label.toLowerCase()} orders</p>
          </div>
        ) : (
          orders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              col={col}
              onAccept={onAccept}
              onPrepare={onPrepare}
              onServe={onServe}
              onCancel={onCancel}
            />
          ))
        )}
      </div>
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
  const [connected, setConnected]   = useState(socket.connected)
  const [restaurant, setRestaurant] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kitchen_restaurant') || 'null') || { name: 'Kitchen', logoUrl: null } }
    catch { return { name: 'Kitchen', logoUrl: null } }
  })
  const [confirm, setConfirm]     = useState(null)
  const [logoError, setLogoError] = useState(false)

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
      setRestaurant(data); setLogoError(false)
      localStorage.setItem('kitchen_restaurant', JSON.stringify(data))
    }).catch(() => {})
    socket.emit('join_kitchen')
    if (user?.restaurantId) socket.emit('join_restaurant', { restaurantId: user.restaurantId })
  }, [authLoading, fetchOrders, user?.restaurantId])

  useEffect(() => {
    const onNewOrder = order => {
      setOrders(prev => prev.find(o => o.id === order.id) ? prev : [order, ...prev])
      playDing()
      toast.success(`🆕 New order — Table #${order.tableNumber}!`, { duration: 6000 })
    }
    const onStatusUpdate = ({ orderId, status }) =>
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
    const onRestaurantUpdated = data => {
      const b = { name: data.name, logoUrl: data.logoUrl }
      setRestaurant(b); setLogoError(false)
      localStorage.setItem('kitchen_restaurant', JSON.stringify(b))
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
  }, [])

  const doStatusUpdate = async (orderId, status) => {
    try {
      const res = await api.put(`/orders/${orderId}/status`, { status })
      setOrders(prev => prev.map(o => o.id === orderId ? res.data : o))
      toast.success(`Marked as ${status.toLowerCase()}`)
      if (status === 'ACCEPTED') api.post('/otp/send', { orderId }).catch(() => {})
    } catch (err) { toast.error(err.message) }
  }

  const askAccept = order => setConfirm({
    title: 'Accept Order?',
    message: `Accept order from ${order.customerName} (Table #${order.tableNumber})? An OTP will be sent to the customer.`,
    onConfirm: () => { doStatusUpdate(order.id, 'ACCEPTED'); setConfirm(null) },
    type: 'info', confirmLabel: '✓ Accept',
  })
  const askCancel = order => setConfirm({
    title: 'Cancel Order?',
    message: `Cancel order from ${order.customerName}? This cannot be undone.`,
    onConfirm: () => { doStatusUpdate(order.id, 'CANCELLED'); setConfirm(null) },
    type: 'danger', confirmLabel: 'Cancel Order',
  })
  const askLogout = () => setConfirm({
    title: 'Sign Out?',
    message: 'Are you sure you want to sign out?',
    onConfirm: () => { logout(); navigate('/kitchen/login') },
    type: 'danger', confirmLabel: 'Sign Out',
  })

  // group orders by status for Kanban columns
  const grouped = {}
  COLUMNS.forEach(col => {
    grouped[col.id] = orders.filter(o => o.status === col.id)
  })

  const pendingCount = grouped['PENDING']?.length || 0
  const activeCount  = orders.filter(o => ['PENDING','ACCEPTED','PREPARING'].includes(o.status)).length

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <header className="bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 flex-shrink-0 shadow-2xl shadow-black/30">
        <div className="px-5 py-3 flex items-center gap-4">

          {/* Brand */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {restaurant.logoUrl && !logoError
              ? <img src={restaurant.logoUrl} alt="" className="w-9 h-9 rounded-xl object-cover ring-2 ring-white/10 flex-shrink-0" onError={() => setLogoError(true)} />
              : <div className="w-9 h-9 bg-gradient-to-br from-brand-600 to-brand-800 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                  <ChefHat className="w-5 h-5 text-white" />
                </div>
            }
            <div className="min-w-0">
              <p className="font-display text-white font-extrabold text-sm leading-none truncate">{restaurant.name}</p>
              <p className="text-brand-400 text-[11px] font-semibold mt-0.5 tracking-wide">Kitchen Display</p>
            </div>
          </div>

          {/* Live stats chips */}
          <div className="hidden md:flex items-center gap-2">
            {pendingCount > 0 && (
              <div className="flex items-center gap-1.5 bg-amber-500/20 border border-amber-500/40 rounded-full px-3 py-1.5">
                <span className="relative flex h-2 w-2 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
                </span>
                <span className="text-amber-300 text-[11px] font-bold">{pendingCount} pending</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
              <span className="text-gray-300 text-[11px] font-semibold">{activeCount} active</span>
            </div>
          </div>

          {/* Connection + user + logout */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-1.5">
              {connected
                ? <><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /><span className="text-[11px] text-gray-400 font-medium">Live</span></>
                : <><WifiOff className="w-3.5 h-3.5 text-red-400 animate-pulse" /><span className="text-[11px] text-red-400 font-medium">Offline</span></>
              }
            </div>
            <div className="h-4 w-px bg-white/10 hidden sm:block" />
            <div className="hidden md:block text-right">
              <p className="text-white text-[11px] font-semibold leading-none">{user?.name}</p>
              <p className="text-gray-600 text-[10px] mt-0.5">Kitchen Staff</p>
            </div>
            <button
              onClick={askLogout}
              className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-brand-400 transition-colors px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-medium">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Error banner ──────────────────────────────────────────────────────── */}
      {fetchError && (
        <div className="bg-red-50 border-b border-red-200 px-5 py-2.5 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 text-red-600 text-xs font-medium">
            <XCircle className="w-4 h-4 flex-shrink-0" />{fetchError}
          </div>
          <button onClick={fetchOrders} className="flex items-center gap-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0">
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {/* ── Kanban Board ──────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-4 border-gray-200 rounded-full" />
            <div className="absolute inset-0 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="text-center">
            <p className="font-display font-bold text-gray-700">Loading orders…</p>
            <p className="text-gray-400 text-sm mt-1">Connecting to kitchen</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-4 p-4 h-full min-w-max">
            {COLUMNS.map(col => (
              <KanbanColumn
                key={col.id}
                col={col}
                orders={grouped[col.id] || []}
                onAccept={askAccept}
                onPrepare={id => doStatusUpdate(id, 'PREPARING')}
                onServe={id => doStatusUpdate(id, 'SERVED')}
                onCancel={askCancel}
              />
            ))}
            {/* Cancelled column — collapsed, just for reference */}
            {orders.some(o => o.status === 'CANCELLED') && (
              <div className="flex flex-col rounded-2xl border border-red-200 overflow-hidden shadow-sm border-t-4 border-t-red-400 flex-shrink-0 w-48"
                style={{ height: 'calc(100vh - 96px)' }}
              >
                <div className="bg-red-400 px-4 py-3 flex items-center justify-between flex-shrink-0">
                  <span className="font-display font-extrabold text-sm text-white">Cancelled</span>
                  <span className="text-xs font-black px-2 py-0.5 rounded-full bg-white/20 text-white">
                    {orders.filter(o => o.status === 'CANCELLED').length}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-red-50/40 scrollbar-none">
                  {orders.filter(o => o.status === 'CANCELLED').map(order => (
                    <div key={order.id} className="bg-white rounded-xl border border-red-100 border-l-4 border-l-red-400 px-3 py-2.5 opacity-60">
                      <p className="font-bold text-gray-700 text-xs">Table #{order.tableNumber}</p>
                      <p className="text-gray-400 text-[10px] truncate">{order.customerName}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
