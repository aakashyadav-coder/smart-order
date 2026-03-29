/**
 * KitchenDashboardPage — Brand-matched premium Kitchen Display System
 * Design: brand-red (#e11d48) dark header, white kanban cards,
 *         matching the Owner Dashboard's red-and-white theme.
 * Real-world fixes: large readable text, mute toggle, keyboard shortcuts.
 */
import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../lib/api'
import socket from '../lib/socket'
import { useAuth } from '../context/AuthContext'
import ConfirmModal from '../components/ConfirmModal'
import {
  FaConciergeBell, FaWifi, FaSignOutAlt, FaBell, FaBellSlash,
  FaCheckCircle, FaFire, FaTimesCircle, FaSyncAlt, FaClock, FaStar
} from 'react-icons/fa'

// ── Audio ─────────────────────────────────────────────────────────────────────
let _ctx = null
let _muted = false
const ensureAudio = () => {
  try {
    if (!_ctx || _ctx.state === 'closed') _ctx = new (window.AudioContext || window.webkitAudioContext)()
    if (_ctx.state === 'suspended') _ctx.resume()
  } catch (_) { }
}
const ding = () => {
  if (_muted) return
  try {
    ensureAudio()
    const now = _ctx.currentTime
    const o = _ctx.createOscillator()
    const g = _ctx.createGain()
    o.type = 'triangle'
    o.connect(g); g.connect(_ctx.destination)
    // Pleasant 3‑note chime
    const notes = [1047, 1319, 1568] // C6, E6, G6
    notes.forEach((f, i) => o.frequency.setValueAtTime(f, now + i * 0.12))
    g.gain.setValueAtTime(0.001, now)
    g.gain.exponentialRampToValueAtTime(0.35, now + 0.02)
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.45)
    o.start(now)
    o.stop(now + 0.5)
  } catch (_) { }
}

// ── Live second ticker ────────────────────────────────────────────────────────
function useTick(enabled = true) {
  const [, set] = useState(0)
  useEffect(() => {
    if (!enabled) return
    const t = setInterval(() => set(n => n + 1), 1000)
    return () => clearInterval(t)
  }, [enabled])
}

function elapsed(createdAt) {
  const totalSeconds = Math.floor((Date.now() - new Date(createdAt)) / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const label = h >= 1
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`
  return { s, m: Math.floor(totalSeconds / 60), h, label }
}

function formatServedAt(order) {
  const ts = order?.servedAt || order?.updatedAt || order?.createdAt
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return 'Served'
  const date = d.toLocaleDateString('en-GB', { timeZone: 'Asia/Kathmandu', day: '2-digit', month: 'short', year: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { timeZone: 'Asia/Kathmandu', hour: 'numeric', minute: '2-digit', hour12: true })
  return `${date} • ${time}`
}

// ── Column config — brand-matched ──────────────────────────────────────────────
const COLUMNS = [
  {
    id: 'PENDING',
    label: 'New Orders',
    dot: 'bg-amber-400',
    accent: '#f59e0b',
    cardAccent: 'border-l-amber-400',
    countBg: 'bg-amber-100 text-amber-800',
    timerCritical: 'text-red-500',
    timerHigh: 'text-amber-500',
    emptyText: 'Waiting for orders',
    emptyIcon: FaClock,
  },
  {
    id: 'ACCEPTED',
    label: 'Accepted',
    dot: 'bg-blue-400',
    accent: '#60a5fa',
    cardAccent: 'border-l-blue-400',
    countBg: 'bg-blue-100 text-blue-800',
    timerCritical: 'text-red-500',
    timerHigh: 'text-amber-500',
    emptyText: 'Accept incoming orders',
    emptyIcon: FaCheckCircle,
  },
  {
    id: 'PREPARING',
    label: 'Preparing',
    dot: 'bg-orange-400',
    accent: '#fb923c',
    cardAccent: 'border-l-orange-400',
    countBg: 'bg-orange-100 text-orange-800',
    timerCritical: 'text-red-500',
    timerHigh: 'text-amber-500',
    emptyText: 'Nothing cooking yet',
    emptyIcon: FaFire,
  },
  {
    id: 'SERVED',
    label: 'Served',
    dot: 'bg-emerald-400',
    accent: '#34d399',
    cardAccent: 'border-l-emerald-400',
    countBg: 'bg-emerald-100 text-emerald-800',
    timerCritical: 'text-gray-400',
    timerHigh: 'text-gray-400',
    emptyText: 'Completed orders here',
    emptyIcon: FaStar,
  },
]

function IconBadge({ children }) {
  return <span className="kitchen-icon-badge">{children}</span>
}

// ── Order Card ─────────────────────────────────────────────────────────────────
function OrderCard({ order, col, isNew, isBusy, onAccept, onPrepare, onServe, onCancel }) {
  const isServed = col.id === 'SERVED'
  useTick(!isServed)
  const t = isServed ? null : elapsed(order.createdAt)
  const m = t?.m ?? 0
  const label = t?.label ?? ''
  const isCritical = !isServed && m >= 10
  const isHigh = !isServed && m >= 5 && !isCritical
  const isFresh = !isServed && m < 2
  const timerCls = isServed ? 'text-emerald-600' : isCritical ? col.timerCritical : isHigh ? col.timerHigh : 'text-gray-400'

  const showUrgentPopup = ['PENDING', 'ACCEPTED', 'PREPARING'].includes(col.id) && (isCritical || isHigh || isNew || isFresh)
  const urgentLabel = isCritical || isHigh ? 'URGENT' : 'NEW'

  return (
    <article
      className={`
        kitchen-card rounded-2xl border border-gray-100 border-l-[4px] ${col.cardAccent}
        hover:shadow-lg transition-all duration-200 overflow-hidden relative
        ${isNew ? 'animate-slide-up' : ''}
        ${isNew ? 'kitchen-card-new' : ''}
        ${isCritical ? 'ring-1 ring-red-200' : ''}
      `}
    >
      {/* TOP — table number + timer */}
      <div className={`px-4 pt-4 pb-2 ${isServed ? '' : 'flex items-start justify-between gap-2'}`}>
        <div className={isServed ? '' : 'min-w-0'}>
          <div className="flex items-center gap-2">
            <span className="font-display font-black text-gray-900 text-4xl leading-none tabular-nums tracking-tight">
              {order.tableNumber}
            </span>
            <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
              #{String(order.id).slice(-6)}
            </span>
          </div>
          <p
            className={`text-gray-500 text-sm font-medium mt-1 ${isServed ? 'leading-snug whitespace-normal break-normal' : 'leading-none truncate'}`}
          >
            {order.customerName}
          </p>
          {isServed && (
            <div className={`mt-1 flex items-center gap-1.5 text-[11px] font-semibold ${timerCls}`}>
              <FaCheckCircle className="w-3.5 h-3.5 kitchen-icon" />
              <span className="whitespace-nowrap">Served {formatServedAt(order)}</span>
            </div>
          )}
        </div>
        {isServed ? (
          null
        ) : (
          <div className={`flex items-center gap-1.5 text-sm font-mono font-bold flex-shrink-0 mt-1 ${timerCls}`}>
            {showUrgentPopup && (
              <span className="bg-red-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-lg shadow-red-500/30 border border-red-300/40 urgent-pop">
                {urgentLabel}
              </span>
            )}
            {isCritical && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block mr-0.5" />
            )}
            <FaClock className="w-3.5 h-3.5 opacity-60 kitchen-icon" />
            {label}
          </div>
        )}
      </div>

      {/* DIVIDER */}
      <div className="mx-4 border-t border-gray-100" />

      {/* ITEMS — text-sm for distance readability */}
      <div className="px-4 py-3 space-y-2 max-h-44 overflow-y-auto scrollbar-none">
        {order.items?.map(item => (
          <div key={item.id} className="flex justify-between items-center gap-2">
            <span className="text-gray-800 text-sm font-medium truncate leading-snug">
              <span className="text-brand-600 font-black mr-1.5">{item.quantity}×</span>
              {item.menuItem?.name}
            </span>
            <span className="text-gray-400 flex-shrink-0 text-xs font-semibold whitespace-nowrap">
              Rs.{item.price * item.quantity}
            </span>
          </div>
        ))}
      </div>

      {/* DIVIDER */}
      <div className="mx-4 border-t border-gray-100" />

      {/* FOOTER */}
      <div className="px-4 py-3 flex items-center justify-between gap-2 bg-gray-50/50">
        <span className="text-gray-900 font-extrabold text-base tabular-nums">
          Rs.{order.totalPrice}
        </span>

        <div className="flex items-center gap-1.5">
          {col.id === 'PENDING' && (
            <>
              <button
                onClick={() => !isBusy && onAccept(order)}
                disabled={isBusy}
                className={`flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 px-3.5 py-2 rounded-xl transition-all shadow-sm shadow-brand-500/25 ${isBusy ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {isBusy ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FaCheckCircle className="w-3.5 h-3.5 kitchen-icon" />}
                Accept
              </button>
              <button
                onClick={() => !isBusy && onCancel(order)}
                disabled={isBusy}
                className={`w-9 h-9 flex items-center justify-center rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors border border-gray-100 ${isBusy ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <FaTimesCircle className="w-4.5 h-4.5 kitchen-icon" />
              </button>
            </>
          )}
          {col.id === 'ACCEPTED' && (
            <button
              onClick={() => !isBusy && onPrepare(order.id)}
              disabled={isBusy}
              className={`flex items-center gap-1.5 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 px-3.5 py-2 rounded-xl transition-colors shadow-sm ${isBusy ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {isBusy ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FaFire className="w-3.5 h-3.5 kitchen-icon" />}
              Prepare
            </button>
          )}
          {col.id === 'PREPARING' && (
            <button
              onClick={() => !isBusy && onServe(order.id)}
              disabled={isBusy}
              className={`flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 rounded-xl transition-colors shadow-sm ${isBusy ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {isBusy ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FaCheckCircle className="w-3.5 h-3.5 kitchen-icon" />}
              Serve
            </button>
          )}
          {col.id === 'SERVED' && (
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100">
              ✓ Done
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

// ── Column Panel ───────────────────────────────────────────────────────────────
function ColumnPanel({ col, orders, newIds, busyOrderIds, onAccept, onPrepare, onServe, onCancel }) {
  const sorted = [...orders].sort((a, b) => {
    if (col.id === 'SERVED') {
      const ta = new Date(a.servedAt || a.updatedAt || a.createdAt).getTime()
      const tb = new Date(b.servedAt || b.updatedAt || b.createdAt).getTime()
      return tb - ta // recent first
    }
    return new Date(a.createdAt) - new Date(b.createdAt)
  })

  return (
    <section
      className="kitchen-glass kitchen-column flex flex-col rounded-3xl overflow-hidden flex-shrink-0"
      style={{ width: '18rem', minWidth: '18rem', height: '100%', '--kitchen-accent': col.accent }}
    >
      {/* Column header — gradient matching column type */}
      <div className="px-5 py-3.5 kitchen-column-header flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${col.dot} ${orders.length > 0 && col.id === 'PENDING' ? 'animate-pulse' : ''}`} />
          <span className="font-display font-bold text-white text-sm tracking-tight">{col.label}</span>
        </div>
        <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full kitchen-chip text-white">
          {orders.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-none">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full select-none pointer-events-none gap-3">
            {(() => {
              const EmptyIcon = col.emptyIcon
              return (
                <IconBadge>
                  <EmptyIcon className="w-6 h-6 text-white/70 kitchen-icon" />
                </IconBadge>
              )
            })()}
            <p className="text-gray-400 text-xs font-semibold text-center">{col.emptyText}</p>
          </div>
        ) : sorted.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            col={col}
            isNew={newIds.has(order.id)}
            isBusy={busyOrderIds?.has(order.id)}
            onAccept={onAccept}
            onPrepare={onPrepare}
            onServe={onServe}
            onCancel={onCancel}
          />
        ))}
      </div>
    </section>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function KitchenDashboardPage() {
  const navigate = useNavigate()
  const { user, logout, loading: authLoading } = useAuth()

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [connected, setConnected] = useState(socket.connected)
  const [restaurant, setRestaurant] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kitchen_restaurant') || 'null') || { name: 'Kitchen', logoUrl: null } }
    catch { return { name: 'Kitchen', logoUrl: null } }
  })
  const [confirm, setConfirm] = useState(null)
  const [logoError, setLogoError] = useState(false)
  const [muted, setMuted] = useState(false)
  const [audioUnlocked, setAudioUnlocked] = useState(false)
  const [busyOrderIds, setBusyOrderIds] = useState(new Set()) // orders with in-flight API calls
  const newIds = useRef(new Set())
  const notifiedOrderIds = useRef(new Set())
  const ordersRef = useRef([])
  const overdueNotified = useRef(new Set())

  const unlockAudio = async () => {
    ensureAudio()
    try {
      if (_ctx?.state === 'suspended') await _ctx.resume()
    } catch (_) { }
    if (_ctx && _ctx.state !== 'suspended') setAudioUnlocked(true)
  }

  const notify = (title, body) => {
    if (!('Notification' in window)) return
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico', badge: '/favicon.ico' })
    }
  }

  const toggleMute = () => {
    _muted = !_muted
    setMuted(_muted)
    toast(_muted ? 'Sound muted' : 'Sound on', {
      duration: 1500,
      icon: _muted ? <FaBellSlash className="w-4 h-4 text-red-400 kitchen-icon" /> : <FaBell className="w-4 h-4 text-brand-400 kitchen-icon" />,
    })
  }

  const fetchOrders = useCallback(async () => {
    try {
      setFetchError(null)
      const res = await api.get('/orders')
      setOrders(res.data)
    } catch (e) { setFetchError(e.message || 'Failed to load') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (authLoading) return
    fetchOrders()
    api.get('/restaurant/mine').then(r => {
      const d = { name: r.data.name, logoUrl: r.data.logoUrl }
      setRestaurant(d); setLogoError(false)
      localStorage.setItem('kitchen_restaurant', JSON.stringify(d))
    }).catch(() => { })
    socket.connect()
    socket.emit('join_kitchen')
    if (user?.restaurantId) socket.emit('join_restaurant', { restaurantId: user.restaurantId })
  }, [authLoading, fetchOrders, user?.restaurantId])

  // Unlock audio after refresh (browsers require a user gesture)
  useEffect(() => {
    const unlock = () => {
      unlockAudio()
      window.removeEventListener('click', unlock)
      window.removeEventListener('touchstart', unlock)
      window.removeEventListener('keydown', unlock)
    }
    window.addEventListener('click', unlock)
    window.addEventListener('touchstart', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('click', unlock)
      window.removeEventListener('touchstart', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  // Request notification permission (browser will show its own prompt)
  useEffect(() => {
    if (!('Notification' in window)) return
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  }, [])

  useEffect(() => { ordersRef.current = orders }, [orders])

  // After 2 minutes in PENDING, play repeating alert until accepted
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      const pending = ordersRef.current.filter(o => o.status === 'PENDING')
      const overdueOrders = pending.filter(o => (now - new Date(o.createdAt).getTime()) >= 2 * 60 * 1000)
      if (overdueOrders.length) ding()

      // Notify once per overdue order
      overdueOrders.forEach(o => {
        if (!overdueNotified.current.has(o.id)) {
          notify('Order waiting 2+ min', `Table ${o.tableNumber} — please accept.`)
          overdueNotified.current.add(o.id)
        }
      })
      // Clean up notified set for orders no longer pending
      const pendingIds = new Set(pending.map(o => o.id))
      overdueNotified.current.forEach(id => { if (!pendingIds.has(id)) overdueNotified.current.delete(id) })
    }, 12000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const onNew = order => {
      setOrders(p => p.find(o => o.id === order.id) ? p : [order, ...p])
      if (notifiedOrderIds.current.has(order.id)) return
      notifiedOrderIds.current.add(order.id)
      newIds.current.add(order.id)
      setTimeout(() => newIds.current.delete(order.id), 1500)
      ding()
      toast.success(`New order — Table ${order.tableNumber}`, { duration: 6000 })
      notify('New Order', `Table ${order.tableNumber} — Rs.${order.totalPrice}`)
    }
    const onStatus = ({ orderId, status }) =>
      setOrders(p => p.map(o => o.id === orderId ? { ...o, status } : o))
    const onBrand = d => {
      const b = { name: d.name, logoUrl: d.logoUrl }
      setRestaurant(b); setLogoError(false)
      localStorage.setItem('kitchen_restaurant', JSON.stringify(b))
    }
    socket.on('new_order', onNew)
    socket.on('order_status_update', onStatus)
    socket.on('restaurant_updated', onBrand)
    socket.on('connect', () => {
      setConnected(true)
      socket.emit('join_kitchen')
      if (user?.restaurantId) socket.emit('join_restaurant', { restaurantId: user.restaurantId })
    })
    socket.on('disconnect', () => setConnected(false))
    return () => {
      socket.off('new_order', onNew)
      socket.off('order_status_update', onStatus)
      socket.off('restaurant_updated', onBrand)
      socket.off('connect'); socket.off('disconnect')
    }
  }, [user?.restaurantId])

  const doStatus = async (orderId, status) => {
    setBusyOrderIds(prev => new Set(prev).add(orderId))
    try {
      const res = await api.put(`/orders/${orderId}/status`, { status })
      setOrders(p => p.map(o => o.id === orderId ? res.data : o))
      if (status === 'ACCEPTED') api.post('/otp/send', { orderId }).catch(() => { })
    } catch (e) { toast.error(e.message) }
    finally { setBusyOrderIds(prev => { const n = new Set(prev); n.delete(orderId); return n }) }
  }

  const askAccept = o => setConfirm({
    title: 'Accept order?',
    message: `Table ${o.tableNumber} — ${o.customerName}. An OTP will be sent to the customer.`,
    confirmLabel: 'Accept', type: 'info',
    onConfirm: () => { doStatus(o.id, 'ACCEPTED'); setConfirm(null) },
  })
  const askCancel = o => setConfirm({
    title: 'Cancel order?',
    message: `Cancel Table ${o.tableNumber} — ${o.customerName}? This cannot be undone.`,
    confirmLabel: 'Cancel Order', type: 'danger',
    onConfirm: () => { doStatus(o.id, 'CANCELLED'); setConfirm(null) },
  })
  const askLogout = () => setConfirm({
    title: 'Sign out?', message: 'Sign out of the Kitchen Display System?',
    confirmLabel: 'Sign Out', type: 'danger',
    onConfirm: () => { logout(); navigate('/kitchen/login') },
  })
  const askToggleMute = () => setConfirm({
    title: muted ? 'Turn sound on?' : 'Mute sound?',
    message: muted ? 'Enable order alert sounds in the kitchen display?' : 'Disable order alert sounds in the kitchen display?',
    confirmLabel: muted ? 'Turn On' : 'Mute',
    type: muted ? 'info' : 'danger',
    onConfirm: () => { toggleMute(); setConfirm(null) },
  })

  // ── Keyboard bump-bar shortcuts ──────────────────────────────────────────────
  // A = accept oldest PENDING  |  P = start preparing oldest ACCEPTED
  // S = serve oldest PREPARING |  M = toggle mute  |  R = refresh
  useEffect(() => {
    const handler = e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      const key = e.key.toUpperCase()
      if (key === 'M') { askToggleMute(); return }
      if (key === 'R') {
        fetchOrders()
        toast('Refreshing…', {
          icon: <FaSyncAlt className="w-4 h-4 text-brand-400 kitchen-icon" />,
          duration: 1000,
        })
        return
      }
      setOrders(cur => {
        const oldest = status => [...cur].filter(o => o.status === status).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0]
        if (key === 'A') { const o = oldest('PENDING'); if (o) askAccept(o) }
        if (key === 'P') { const o = oldest('ACCEPTED'); if (o) doStatus(o.id, 'PREPARING') }
        if (key === 'S') { const o = oldest('PREPARING'); if (o) doStatus(o.id, 'SERVED') }
        return cur // no mutation
      })
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [fetchOrders]) // eslint-disable-line

  const grouped = {}
  COLUMNS.forEach(c => { grouped[c.id] = orders.filter(o => o.status === c.id) })
  const cancelled = orders.filter(o => o.status === 'CANCELLED')
  const pending = grouped['PENDING']?.length || 0
  const active = orders.filter(o => ['PENDING', 'ACCEPTED', 'PREPARING'].includes(o.status)).length

  return (
    <div className="h-screen flex flex-col overflow-hidden relative kitchen-bg">
      <div className="absolute inset-0 kitchen-grid pointer-events-none" />
      <div className="absolute inset-0 kitchen-vignette pointer-events-none" />
      <div className="relative z-10 flex flex-col h-full">

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 kitchen-topbar px-5 py-3 flex items-center gap-4">

        {/* Brand */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-gradient-to-br from-brand-600 to-brand-700 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-600/30 ring-1 ring-white/10">
            {restaurant.logoUrl && !logoError
              ? <img src={restaurant.logoUrl} alt="" className="w-full h-full rounded-2xl object-cover" onError={() => setLogoError(true)} />
              : <FaConciergeBell className="w-4.5 h-4.5 text-white kitchen-icon" />
            }
          </div>
          <div className="min-w-0">
            <p className="font-display font-bold text-white text-base leading-none truncate">{restaurant.name}</p>
            <p className="text-brand-400 text-xs font-semibold mt-0.5 uppercase tracking-widest">Kitchen Display</p>
          </div>
        </div>

        {/* Center — summary pills */}
        <div className="flex items-center gap-2 flex-1 justify-center flex-wrap">
          {pending > 0 && (
            <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 bg-amber-500/15 border border-amber-500/25">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-amber-300 text-sm font-bold">{pending} pending</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 kitchen-chip rounded-full px-3 py-1.5">
            <span className="text-gray-300 text-sm font-semibold">{active} active</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-emerald-400 text-sm font-semibold">{grouped['SERVED']?.length || 0} served</span>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Connection */}
          <div className="flex items-center gap-1.5">
            {connected
              ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /><span className="text-gray-400 text-sm font-medium hidden sm:inline">Live</span></>
              : <><FaWifi className="w-3 h-3 text-red-400 animate-pulse kitchen-icon" /><span className="text-red-400 text-sm hidden sm:inline">Offline</span></>
            }
          </div>
          <div className="h-3.5 w-px bg-white/10 hidden sm:block" />
          {/* Mute */}
          <button
            onClick={askToggleMute}
            title={muted ? 'Unmute (M)' : 'Mute (M)'}
            className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors text-sm ${muted ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'text-gray-500 hover:text-white hover:bg-white/10'
              }`}
          >
            {muted ? <FaBellSlash className="w-4 h-4 kitchen-icon" /> : <FaBell className="w-4 h-4 kitchen-icon" />}
          </button>
          {/* Refresh */}
          <button
            onClick={fetchOrders}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
            title="Refresh orders (R)"
          >
            <FaSyncAlt className="w-3.5 h-3.5 kitchen-icon" />
          </button>
          {/* Logout */}
          <button
            onClick={askLogout}
            className="flex items-center gap-1.5 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 transition-colors px-3 py-1.5 rounded-xl shadow-sm shadow-brand-600/30"
          >
            <FaSignOutAlt className="w-3.5 h-3.5 kitchen-icon" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* Keyboard shortcut hint bar */}
      <div className="flex-shrink-0 kitchen-subbar px-5 py-1.5 hidden sm:flex items-center gap-4">
        <span className="text-gray-500 text-xs uppercase tracking-widest font-bold">Bump bar:</span>
        {[
          { key: 'A', label: 'Accept', color: 'text-brand-400' },
          { key: 'P', label: 'Prepare', color: 'text-orange-400' },
          { key: 'S', label: 'Serve', color: 'text-emerald-400' },
          { key: 'M', label: muted ? 'Unmute' : 'Mute', color: 'text-gray-400' },
          { key: 'R', label: 'Refresh', color: 'text-gray-400' },
        ].map(({ key, label, color }) => (
          <span key={key} className="flex items-center gap-1.5">
            <kbd className={`text-[11px] font-mono font-black px-1.5 py-0.5 rounded bg-white/10 border border-white/15 ${color}`}>{key}</kbd>
            <span className="text-gray-500 text-xs">{label}</span>
          </span>
        ))}
      </div>

      {/* Error banner */}
      {fetchError && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-5 py-2 flex items-center justify-between text-xs flex-shrink-0">
          <span className="text-red-300 font-medium flex items-center gap-1.5">
            <FaTimesCircle className="w-3.5 h-3.5 kitchen-icon" />{fetchError}
          </span>
          <button onClick={fetchOrders} className="flex items-center gap-1 text-xs font-bold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors">
            <FaSyncAlt className="w-3 h-3 kitchen-icon" /> Retry
          </button>
        </div>
      )}

      {/* ── Board ─────────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-5">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-[3px] border-white/10 rounded-full" />
            <div className="absolute inset-0 border-[3px] border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-gray-200 text-sm font-bold">Loading kitchen orders…</p>
            <p className="text-gray-500 text-xs mt-1">Please wait</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-3 p-4 h-full" style={{ minWidth: 'max-content' }}>
            {COLUMNS.map(col => (
              <ColumnPanel
                key={col.id}
                col={col}
                orders={grouped[col.id] || []}
                newIds={newIds.current}
                busyOrderIds={busyOrderIds}
                onAccept={askAccept}
                onPrepare={id => doStatus(id, 'PREPARING')}
                onServe={id => doStatus(id, 'SERVED')}
                onCancel={askCancel}
              />
            ))}

            {/* Cancelled — slim column, only when needed */}
            {cancelled.length > 0 && (
              <section
                className="kitchen-glass kitchen-column flex flex-col rounded-3xl overflow-hidden flex-shrink-0"
                style={{ width: '12rem', minWidth: '12rem', height: '100%', '--kitchen-accent': '#94a3b8' }}
              >
                <div className="px-4 py-3.5 kitchen-column-header flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" />
                    <span className="font-display font-bold text-white text-sm">Cancelled</span>
                  </div>
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded-full kitchen-chip text-white">
                    {cancelled.length}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-none">
                  {cancelled.map(o => (
                    <div key={o.id} className="kitchen-card rounded-xl border border-gray-100 border-l-[3px] border-l-gray-300 px-3 py-2.5 opacity-55">
                      <p className="font-display font-black text-gray-500 text-xl leading-none">{o.tableNumber}</p>
                      <p className="text-gray-400 text-[10px] mt-1 truncate">{o.customerName}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      )}

      {confirm && (
        <ConfirmModal
          open
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          type={confirm.type}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
      </div>
    </div>
  )
}
