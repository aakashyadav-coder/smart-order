/**
 * KitchenDashboardPage — Ultra-professional Slate & White KDS
 * Design: Clean floating columns on slate background, minimal status accents,
 *         giant table numbers, refined typography, zero visual noise.
 */
import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../lib/api'
import socket from '../lib/socket'
import { useAuth } from '../context/AuthContext'
import ConfirmModal from '../components/ConfirmModal'
import {
  ChefHat, WifiOff, LogOut,
  CheckCircle, Flame, XCircle, RefreshCw, Clock
} from '../components/Icons'

// ── Audio ─────────────────────────────────────────────────────────────────────
let _ctx = null
const ding = () => {
  try {
    if (!_ctx || _ctx.state === 'closed') _ctx = new (window.AudioContext || window.webkitAudioContext)()
    if (_ctx.state === 'suspended') _ctx.resume()
    const o = _ctx.createOscillator(), g = _ctx.createGain()
    o.connect(g); g.connect(_ctx.destination)
    o.frequency.setValueAtTime(1047, _ctx.currentTime)
    o.frequency.setValueAtTime(880, _ctx.currentTime + 0.1)
    g.gain.setValueAtTime(0.28, _ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, _ctx.currentTime + 0.55)
    o.start(); o.stop(_ctx.currentTime + 0.55)
  } catch (_) { }
}

// ── Live second ticker ────────────────────────────────────────────────────────
function useTick() {
  const [, set] = useState(0)
  useEffect(() => { const t = setInterval(() => set(n => n + 1), 1000); return () => clearInterval(t) }, [])
}

function elapsed(createdAt) {
  const s = Math.floor((Date.now() - new Date(createdAt)) / 1000)
  const m = Math.floor(s / 60)
  return { s, m, label: `${m}:${String(s % 60).padStart(2, '0')}` }
}

// ── Column config — minimal, no heavy color ────────────────────────────────────
const COLUMNS = [
  {
    id: 'PENDING',
    label: 'New Orders',
    dot: 'bg-amber-400',
    accent: 'border-l-amber-400',
    timerCritical: 'text-red-500',
    timerHigh: 'text-amber-500',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    emptyText: 'Waiting for orders',
  },
  {
    id: 'ACCEPTED',
    label: 'Accepted',
    dot: 'bg-sky-400',
    accent: 'border-l-sky-400',
    timerCritical: 'text-red-500',
    timerHigh: 'text-amber-500',
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
    emptyText: 'Accept incoming orders',
  },
  {
    id: 'PREPARING',
    label: 'Preparing',
    dot: 'bg-orange-400',
    accent: 'border-l-orange-400',
    timerCritical: 'text-red-500',
    timerHigh: 'text-amber-500',
    badge: 'bg-orange-50 text-orange-700 border-orange-200',
    emptyText: 'Nothing cooking yet',
  },
  {
    id: 'SERVED',
    label: 'Served',
    dot: 'bg-emerald-400',
    accent: 'border-l-emerald-400',
    timerCritical: 'text-slate-400',
    timerHigh: 'text-slate-400',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    emptyText: 'Completed orders here',
  },
]

// ── Order Card ─────────────────────────────────────────────────────────────────
function OrderCard({ order, col, isNew, onAccept, onPrepare, onServe, onCancel }) {
  useTick()
  const { m, label } = elapsed(order.createdAt)
  const isCritical = m >= 10
  const isHigh = m >= 5 && !isCritical
  const timerCls = isCritical ? col.timerCritical : isHigh ? col.timerHigh : 'text-slate-400'

  return (
    <article
      className={`
        bg-white rounded-2xl border border-slate-100 border-l-[3px] ${col.accent}
        shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden
        ${isNew ? 'animate-slide-up' : ''}
      `}
    >
      {/* TOP — table number + timer */}
      <div className="px-4 pt-4 pb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="font-display font-black text-slate-900 text-4xl leading-none tabular-nums tracking-tight">
            {order.tableNumber}
          </span>
          <p className="text-slate-500 text-xs font-medium mt-1 leading-none truncate">
            {order.customerName}
          </p>
        </div>
        <div className={`flex items-center gap-1 text-[11px] font-mono font-semibold flex-shrink-0 mt-1 ${timerCls}`}>
          {isCritical && (
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block mr-0.5" />
          )}
          {label}
        </div>
      </div>

      {/* DIVIDER */}
      <div className="mx-4 border-t border-slate-100" />

      {/* ITEMS */}
      <div className="px-4 py-2.5 space-y-1 max-h-32 overflow-y-auto">
        {order.items?.map(item => (
          <div key={item.id} className="flex justify-between items-center gap-2 text-xs">
            <span className="text-slate-600 truncate leading-relaxed">
              <span className="text-slate-400 font-semibold mr-1">{item.quantity}×</span>
              {item.menuItem?.name}
            </span>
            <span className="text-slate-400 flex-shrink-0 text-[10px]">
              Rs.{item.price * item.quantity}
            </span>
          </div>
        ))}
      </div>

      {/* DIVIDER */}
      <div className="mx-4 border-t border-slate-100" />

      {/* FOOTER — total + action */}
      <div className="px-4 py-3 flex items-center justify-between gap-2">
        <span className="text-slate-900 font-extrabold text-sm tabular-nums">
          Rs.{order.totalPrice}
        </span>

        <div className="flex items-center gap-1.5">
          {col.id === 'PENDING' && (
            <>
              <button
                onClick={() => onAccept(order)}
                className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-slate-900 hover:bg-slate-700 px-3 py-2 rounded-xl transition-colors"
              >
                <CheckCircle className="w-3 h-3" /> Accept
              </button>
              <button
                onClick={() => onCancel(order)}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors border border-slate-100"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </>
          )}
          {col.id === 'ACCEPTED' && (
            <button
              onClick={() => onPrepare(order.id)}
              className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-orange-500 hover:bg-orange-600 px-3 py-2 rounded-xl transition-colors"
            >
              <Flame className="w-3 h-3" /> Prepare
            </button>
          )}
          {col.id === 'PREPARING' && (
            <button
              onClick={() => onServe(order.id)}
              className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-2 rounded-xl transition-colors"
            >
              <CheckCircle className="w-3 h-3" /> Serve
            </button>
          )}
          {col.id === 'SERVED' && (
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100">
              Served
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

// ── Column Panel ───────────────────────────────────────────────────────────────
function ColumnPanel({ col, orders, newIds, onAccept, onPrepare, onServe, onCancel }) {
  // Oldest first (most urgent at top)
  const sorted = [...orders].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

  return (
    <section
      className="flex flex-col bg-slate-50 rounded-3xl border border-slate-200/80 overflow-hidden flex-shrink-0 shadow-sm"
      style={{ width: '17rem', height: 'calc(100vh - 80px)', minWidth: '17rem' }}
    >
      {/* Column header */}
      <div className="px-5 py-3.5 bg-white border-b border-slate-100 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${col.dot} ${orders.length > 0 && col.id === 'PENDING' ? 'animate-pulse' : ''}`} />
          <span className="font-display font-bold text-slate-800 text-sm">{col.label}</span>
        </div>
        <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full border ${orders.length > 0
            ? col.badge
            : 'bg-slate-100 text-slate-400 border-slate-200'
          }`}>
          {orders.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-none">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full select-none pointer-events-none">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl mb-3" />
            <p className="text-slate-300 text-xs font-semibold text-center">{col.emptyText}</p>
          </div>
        ) : sorted.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            col={col}
            isNew={newIds.has(order.id)}
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
  const newIds = useRef(new Set())

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
    socket.emit('join_kitchen')
    if (user?.restaurantId) socket.emit('join_restaurant', { restaurantId: user.restaurantId })
  }, [authLoading, fetchOrders, user?.restaurantId])

  useEffect(() => {
    const onNew = order => {
      setOrders(p => p.find(o => o.id === order.id) ? p : [order, ...p])
      newIds.current.add(order.id)
      setTimeout(() => newIds.current.delete(order.id), 1500)
      ding()
      toast.success(`New order — Table ${order.tableNumber}`, { duration: 6000 })
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
    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    return () => {
      socket.off('new_order', onNew)
      socket.off('order_status_update', onStatus)
      socket.off('restaurant_updated', onBrand)
      socket.off('connect'); socket.off('disconnect')
    }
  }, [])

  const doStatus = async (orderId, status) => {
    try {
      const res = await api.put(`/orders/${orderId}/status`, { status })
      setOrders(p => p.map(o => o.id === orderId ? res.data : o))
      if (status === 'ACCEPTED') api.post('/otp/send', { orderId }).catch(() => { })
    } catch (e) { toast.error(e.message) }
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

  const grouped = {}
  COLUMNS.forEach(c => { grouped[c.id] = orders.filter(o => o.status === c.id) })
  const cancelled = orders.filter(o => o.status === 'CANCELLED')
  const pending = grouped['PENDING']?.length || 0
  const active = orders.filter(o => ['PENDING', 'ACCEPTED', 'PREPARING'].includes(o.status)).length

  return (
    <div className="h-screen bg-slate-100 flex flex-col overflow-hidden">

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 bg-slate-900 px-5 py-3 flex items-center gap-4">

        {/* Brand */}
        <div className="flex items-center gap-3 min-w-0">
          {restaurant.logoUrl && !logoError
            ? <img src={restaurant.logoUrl} alt="" className="w-8 h-8 rounded-xl object-cover ring-1 ring-white/10 flex-shrink-0" onError={() => setLogoError(true)} />
            : <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <ChefHat className="w-4 h-4 text-white/60" />
            </div>
          }
          <div className="min-w-0">
            <p className="font-display font-bold text-white text-sm leading-none truncate">{restaurant.name}</p>
            <p className="text-slate-500 text-[10px] font-medium mt-0.5 uppercase tracking-widest">KDS</p>
          </div>
        </div>

        {/* Center — summary pills */}
        <div className="flex items-center gap-2 flex-1 justify-center">
          {pending > 0 && (
            <div className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/25 rounded-full px-3 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-amber-300 text-[11px] font-bold">{pending} pending</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
            <span className="text-slate-400 text-[11px] font-semibold">{active} active</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
            <span className="text-slate-400 text-[11px] font-semibold">{grouped['SERVED']?.length || 0} served</span>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Connection */}
          <div className="flex items-center gap-1.5">
            {connected
              ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /><span className="text-slate-500 text-[10px] font-medium hidden sm:inline">Live</span></>
              : <><WifiOff className="w-3 h-3 text-red-400 animate-pulse" /><span className="text-red-400 text-[10px] hidden sm:inline">Offline</span></>
            }
          </div>
          <div className="h-3.5 w-px bg-white/10 hidden sm:block" />
          {/* User */}
          <p className="text-slate-500 text-[11px] font-medium hidden md:block">{user?.name}</p>
          {/* Logout */}
          <button
            onClick={askLogout}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-red-400 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-white/5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* Error */}
      {fetchError && (
        <div className="bg-red-50 border-b border-red-100 px-5 py-2 flex items-center justify-between text-xs flex-shrink-0">
          <span className="text-red-600 font-medium">{fetchError}</span>
          <button onClick={fetchOrders} className="flex items-center gap-1 text-xs font-bold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors">
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {/* ── Board ─────────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-5">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 border-[3px] border-slate-200 rounded-full" />
            <div className="absolute inset-0 border-[3px] border-slate-700 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-slate-400 text-sm font-medium">Loading orders…</p>
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
                onAccept={askAccept}
                onPrepare={id => doStatus(id, 'PREPARING')}
                onServe={id => doStatus(id, 'SERVED')}
                onCancel={askCancel}
              />
            ))}

            {/* Cancelled — slim column, only when needed */}
            {cancelled.length > 0 && (
              <section
                className="flex flex-col bg-slate-50 rounded-3xl border border-slate-200/80 overflow-hidden flex-shrink-0"
                style={{ width: '11rem', height: 'calc(100vh - 80px)' }}
              >
                <div className="px-4 py-3.5 bg-white border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0" />
                    <span className="font-display font-bold text-slate-400 text-sm">Cancelled</span>
                  </div>
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded-full border bg-slate-100 text-slate-400 border-slate-200">
                    {cancelled.length}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-none">
                  {cancelled.map(o => (
                    <div key={o.id} className="bg-white rounded-xl border border-slate-100 border-l-[3px] border-l-slate-300 px-3 py-2.5 opacity-50">
                      <p className="font-display font-black text-slate-500 text-xl leading-none">{o.tableNumber}</p>
                      <p className="text-slate-400 text-[10px] mt-1 truncate">{o.customerName}</p>
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
  )
}
