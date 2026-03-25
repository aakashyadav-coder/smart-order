/**
 * KitchenDashboardPage — Ultra-professional Kanban Kitchen Display System
 * Features: live per-second timers, urgency heat system, stats strip, entrance animations
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

// ── Live clock — ticks every second ───────────────────────────────────────────
function useTick() {
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000)
    return () => clearInterval(t)
  }, [])
}

// Format elapsed seconds as m:ss
function fmtElapsed(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// Urgency level based on elapsed minutes
function getUrgency(elapsedSec, status) {
  if (status !== 'PENDING' && status !== 'ACCEPTED' && status !== 'PREPARING') return 'normal'
  const m = elapsedSec / 60
  if (m >= 10) return 'critical'
  if (m >= 5)  return 'high'
  if (m >= 2)  return 'medium'
  return 'low'
}

const URGENCY_STYLES = {
  normal:   { border: 'border-l-gray-200',   ring: '',                      bg: '',                     label: null,       labelCls: '' },
  low:      { border: 'border-l-green-400',  ring: '',                      bg: '',                     label: null,       labelCls: '' },
  medium:   { border: 'border-l-amber-500',  ring: '',                      bg: 'bg-amber-50/30',       label: null,       labelCls: '' },
  high:     { border: 'border-l-orange-500', ring: 'ring-1 ring-orange-200',bg: 'bg-orange-50/40',      label: '⚡ High',  labelCls: 'bg-orange-100 text-orange-700' },
  critical: { border: 'border-l-red-600',    ring: 'ring-2 ring-red-300',   bg: 'bg-red-50/60',         label: '🔴 URGENT',labelCls: 'bg-red-100 text-red-700 animate-pulse' },
}

// ── Kanban column config ───────────────────────────────────────────────────────
const COLUMNS = [
  { id: 'PENDING',   label: 'New Orders',  headerBg: 'bg-amber-500',  colBg: 'bg-amber-50/50',   topBorder: 'border-t-amber-500',  defaultBorder: 'border-l-amber-500',  emptyIcon: '⏳', emptyText: 'Waiting for orders' },
  { id: 'ACCEPTED',  label: 'Accepted',    headerBg: 'bg-blue-500',   colBg: 'bg-blue-50/40',    topBorder: 'border-t-blue-500',   defaultBorder: 'border-l-blue-500',  emptyIcon: '👍', emptyText: 'Accept incoming orders' },
  { id: 'PREPARING', label: 'Preparing',   headerBg: 'bg-orange-500', colBg: 'bg-orange-50/40',  topBorder: 'border-t-orange-500', defaultBorder: 'border-l-orange-500', emptyIcon: '🔥', emptyText: 'No items being cooked' },
  { id: 'SERVED',    label: 'Served',      headerBg: 'bg-green-600',  colBg: 'bg-green-50/30',   topBorder: 'border-t-green-600',  defaultBorder: 'border-l-green-500',  emptyIcon: '✅', emptyText: 'Completed orders appear here' },
]

// ── Order Card ─────────────────────────────────────────────────────────────────
function OrderCard({ order, col, onAccept, onPrepare, onServe, onCancel, isNew }) {
  useTick() // re-render every second

  const nowSec    = Math.floor((Date.now() - new Date(order.createdAt)) / 1000)
  const urgency   = getUrgency(nowSec, order.status)
  const uStyle    = URGENCY_STYLES[urgency]
  const borderCls = (urgency === 'low' || urgency === 'normal') ? col.defaultBorder : uStyle.border

  return (
    <div
      className={`
        bg-white rounded-xl border border-gray-100 border-l-4 ${borderCls}
        ${uStyle.ring} ${uStyle.bg}
        shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden
        ${isNew ? 'animate-slide-up' : ''}
      `}
    >
      {/* ── Header row ── */}
      <div className="flex items-center justify-between px-3.5 pt-3 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Table number — most important info */}
          <span className="font-display font-black text-gray-900 text-2xl leading-none flex-shrink-0">
            #{order.tableNumber}
          </span>
          {uStyle.label && (
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${uStyle.labelCls}`}>
              {uStyle.label}
            </span>
          )}
        </div>
        {/* Live elapsed timer */}
        <div className={`flex items-center gap-1 text-xs font-bold tabular-nums flex-shrink-0 ${
          urgency === 'critical' ? 'text-red-600' :
          urgency === 'high'     ? 'text-orange-500' :
          urgency === 'medium'   ? 'text-amber-500' : 'text-gray-400'
        }`}>
          <Clock className="w-3 h-3" />
          {fmtElapsed(nowSec)}
        </div>
      </div>

      {/* Customer */}
      <div className="px-3.5 pb-2.5">
        <p className="text-gray-800 text-sm font-semibold leading-none truncate">{order.customerName}</p>
        {order.phone && <p className="text-gray-400 text-[11px] mt-0.5">{order.phone}</p>}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100 mx-0" />

      {/* Items */}
      <div className="px-3.5 py-2.5 space-y-1.5 max-h-36 overflow-y-auto">
        {order.items?.map(item => (
          <div key={item.id} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded bg-gray-100 text-gray-600 font-black text-[9px] flex-shrink-0 leading-none">
                {item.quantity}
              </span>
              <span className="text-gray-700 text-[11px] font-medium truncate">{item.menuItem?.name}</span>
            </div>
            <span className="text-gray-400 text-[10px] flex-shrink-0 font-medium">
              Rs.{item.price * item.quantity}
            </span>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100" />

      {/* Footer — total + action */}
      <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
        <span className="text-gray-900 font-extrabold text-sm">Rs.{order.totalPrice}</span>
        <div className="flex items-center gap-1.5">
          {col.id === 'PENDING' && (
            <>
              <button
                onClick={() => onAccept(order)}
                className="flex items-center gap-1 text-[11px] font-extrabold text-white bg-gradient-to-r from-brand-700 to-brand-500 hover:from-brand-800 hover:to-brand-600 px-3 py-1.5 rounded-lg transition-all shadow-sm"
              >
                <CheckCircle className="w-3 h-3" /> Accept
              </button>
              <button onClick={() => onCancel(order)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                <XCircle className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {col.id === 'ACCEPTED' && (
            <button
              onClick={() => onPrepare(order.id)}
              className="flex items-center gap-1 text-[11px] font-extrabold text-white bg-orange-500 hover:bg-orange-600 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
            >
              <Flame className="w-3 h-3" /> Prepare
            </button>
          )}
          {col.id === 'PREPARING' && (
            <button
              onClick={() => onServe(order.id)}
              className="flex items-center gap-1 text-[11px] font-extrabold text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
            >
              <CheckCircle className="w-3 h-3" /> Serve
            </button>
          )}
          {col.id === 'SERVED' && (
            <span className="text-[11px] font-bold text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
              ✓ Done
            </span>
          )}
        </div>
      </div>

      {/* ID */}
      <div className="px-3.5 pb-2">
        <span className="text-gray-200 text-[9px] font-mono">#{order.id.slice(-6).toUpperCase()}</span>
      </div>
    </div>
  )
}

// ── Kanban Column ─────────────────────────────────────────────────────────────
function KanbanColumn({ col, orders, newOrderIds, onAccept, onPrepare, onServe, onCancel }) {
  // Sort: most urgent (oldest) first
  const sorted = [...orders].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

  return (
    <div
      className={`flex flex-col rounded-2xl border border-gray-200 overflow-hidden shadow-sm border-t-4 ${col.topBorder} flex-shrink-0`}
      style={{ width: '17rem', minWidth: '17rem', height: 'calc(100vh - 92px)' }}
    >
      {/* Column header */}
      <div className={`${col.headerBg} px-4 py-2.5 flex items-center justify-between flex-shrink-0`}>
        <span className="font-display font-extrabold text-white text-sm">{col.label}</span>
        <span className={`text-xs font-black px-2.5 py-0.5 rounded-full bg-white/25 text-white ${orders.length > 0 && col.id === 'PENDING' ? 'animate-pulse' : ''}`}>
          {orders.length}
        </span>
      </div>

      {/* Card list */}
      <div className={`flex-1 overflow-y-auto p-3 space-y-3 ${col.colBg} scrollbar-none`}>
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16 gap-2 select-none opacity-50">
            <span className="text-3xl">{col.emptyIcon}</span>
            <p className="text-gray-400 text-xs font-semibold text-center">{col.emptyText}</p>
          </div>
        ) : sorted.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            col={col}
            isNew={newOrderIds.has(order.id)}
            onAccept={onAccept}
            onPrepare={onPrepare}
            onServe={onServe}
            onCancel={onCancel}
          />
        ))}
      </div>
    </div>
  )
}

// ── Live stat hook — recalculates every 10 s ──────────────────────────────────
function useStats(orders) {
  const pending   = orders.filter(o => o.status === 'PENDING').length
  const active    = orders.filter(o => ['PENDING','ACCEPTED','PREPARING'].includes(o.status)).length
  const servedToday = orders.filter(o => {
    if (o.status !== 'SERVED' && o.status !== 'PAID') return false
    const d = new Date(o.updatedAt || o.createdAt)
    const now = new Date()
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  }).length

  // Average wait time of currently PENDING orders (in minutes)
  const pendingOrders = orders.filter(o => o.status === 'PENDING')
  const avgWait = pendingOrders.length
    ? Math.round(pendingOrders.reduce((s, o) => s + (Date.now() - new Date(o.createdAt)) / 60000, 0) / pendingOrders.length)
    : null

  return { pending, active, servedToday, avgWait }
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function KitchenDashboardPage() {
  const navigate = useNavigate()
  const { user, logout, loading: authLoading } = useAuth()
  useTick() // global tick keeps stats live

  const [orders, setOrders]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [connected, setConnected]   = useState(socket.connected)
  const [restaurant, setRestaurant] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kitchen_restaurant') || 'null') || { name: 'Kitchen', logoUrl: null } }
    catch { return { name: 'Kitchen', logoUrl: null } }
  })
  const [confirm, setConfirm]     = useState(null)
  const [logoError, setLogoError] = useState(false)
  const newOrderIds = useRef(new Set())

  const fetchOrders = useCallback(async () => {
    try {
      setFetchError(null)
      const res = await api.get('/orders')
      setOrders(res.data)
    } catch (err) {
      setFetchError(err.message || 'Failed to load orders')
    } finally { setLoading(false) }
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
      newOrderIds.current.add(order.id)
      setTimeout(() => newOrderIds.current.delete(order.id), 2000) // remove animation class after anim
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
    message: `Accept order from ${order.customerName} (Table #${order.tableNumber})? An OTP will be sent.`,
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
    title: 'Sign Out?', message: 'Sign out of the Kitchen Dashboard?',
    onConfirm: () => { logout(); navigate('/kitchen/login') },
    type: 'danger', confirmLabel: 'Sign Out',
  })

  const grouped = {}
  COLUMNS.forEach(col => { grouped[col.id] = orders.filter(o => o.status === col.id) })
  const cancelledOrders = orders.filter(o => o.status === 'CANCELLED')
  const stats = useStats(orders)

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">

      {/* ── Dark Header ────────────────────────────────────────────────────────── */}
      <header className="bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 flex-shrink-0 shadow-2xl shadow-black/30">
        <div className="px-5 py-3 flex items-center gap-4">

          {/* Brand mark */}
          <div className="flex items-center gap-3 min-w-0">
            {restaurant.logoUrl && !logoError
              ? <img src={restaurant.logoUrl} alt="" className="w-9 h-9 rounded-xl object-cover ring-2 ring-white/10 flex-shrink-0" onError={() => setLogoError(true)} />
              : <div className="w-9 h-9 bg-gradient-to-br from-brand-600 to-brand-800 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                  <ChefHat className="w-5 h-5 text-white" />
                </div>
            }
            <div className="min-w-0">
              <p className="font-display text-white font-extrabold text-sm leading-none truncate">{restaurant.name}</p>
              <p className="text-brand-400 text-[11px] font-semibold mt-0.5 tracking-wide">Kitchen Display System</p>
            </div>
          </div>

          {/* ── Live stats strip ── */}
          <div className="hidden md:flex items-center gap-2 flex-1 justify-center">
            <StatChip
              label="Pending"
              value={stats.pending}
              pulse={stats.pending > 0}
              cls={stats.pending > 0 ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' : 'border-white/10 bg-white/5 text-gray-500'}
            />
            <StatChip label="Active" value={stats.active} cls="border-white/10 bg-white/5 text-gray-300" />
            <StatChip label="Served Today" value={stats.servedToday} cls="border-green-500/30 bg-green-500/10 text-green-400" />
            {stats.avgWait !== null && (
              <StatChip
                label="Avg Wait"
                value={`${stats.avgWait}m`}
                cls={stats.avgWait >= 5 ? 'border-red-500/40 bg-red-500/10 text-red-400' : 'border-white/10 bg-white/5 text-gray-300'}
              />
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-1.5">
              {connected
                ? <><span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" /><span className="text-[11px] text-gray-400 font-medium">Live</span></>
                : <><WifiOff className="w-3.5 h-3.5 text-red-400 animate-pulse" /><span className="text-[11px] text-red-400">Reconnecting…</span></>
              }
            </div>
            <div className="h-4 w-px bg-white/10 hidden sm:block" />
            <div className="hidden md:block text-right">
              <p className="text-white text-[11px] font-semibold leading-none">{user?.name}</p>
              <p className="text-gray-600 text-[10px] mt-0.5">Kitchen Staff</p>
            </div>
            <button
              onClick={askLogout}
              className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-brand-400 transition-colors px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-medium">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Error banner */}
      {fetchError && (
        <div className="bg-red-50 border-b border-red-200 px-5 py-2 flex items-center justify-between gap-3 text-xs flex-shrink-0">
          <div className="flex items-center gap-2 text-red-600 font-medium">
            <XCircle className="w-4 h-4" />{fetchError}
          </div>
          <button onClick={fetchOrders} className="flex items-center gap-1 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 px-3 py-1.5 rounded-lg transition-colors">
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {/* ── Kanban Board ──────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center flex-col gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-4 border-gray-200 rounded-full" />
            <div className="absolute inset-0 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="font-display font-bold text-gray-600">Loading kitchen orders…</p>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-3.5 p-4 h-full" style={{ minWidth: 'max-content' }}>
            {COLUMNS.map(col => (
              <KanbanColumn
                key={col.id}
                col={col}
                orders={grouped[col.id] || []}
                newOrderIds={newOrderIds.current}
                onAccept={askAccept}
                onPrepare={id => doStatusUpdate(id, 'PREPARING')}
                onServe={id => doStatusUpdate(id, 'SERVED')}
                onCancel={askCancel}
              />
            ))}

            {/* Cancelled — narrow, only shows if any exist */}
            {cancelledOrders.length > 0 && (
              <div
                className="flex flex-col rounded-2xl border border-red-200 overflow-hidden shadow-sm border-t-4 border-t-red-400 flex-shrink-0"
                style={{ width: '12rem', height: 'calc(100vh - 92px)' }}
              >
                <div className="bg-red-400 px-3 py-2.5 flex items-center justify-between flex-shrink-0">
                  <span className="font-display font-extrabold text-white text-sm">Cancelled</span>
                  <span className="text-xs font-black px-2 py-0.5 rounded-full bg-white/25 text-white">{cancelledOrders.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-2.5 space-y-2 bg-red-50/40 scrollbar-none">
                  {cancelledOrders.map(order => (
                    <div key={order.id} className="bg-white/70 rounded-xl border border-red-100 border-l-4 border-l-red-400 px-3 py-2 opacity-60">
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

// ── Small stat chip for header ─────────────────────────────────────────────────
function StatChip({ label, value, cls, pulse }) {
  return (
    <div className={`flex items-center gap-2 border rounded-lg px-3 py-1.5 ${cls}`}>
      {pulse && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />}
      <span className="text-[10px] font-semibold opacity-60 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-extrabold font-display leading-none">{value}</span>
    </div>
  )
}
