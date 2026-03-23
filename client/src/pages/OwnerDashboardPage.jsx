/**
 * OwnerDashboardPage — Premium restaurant management panel
 * Features:
 *  - Real-time restaurant name/logo via socket
 *  - Animated red notification badge on Orders tab
 *  - Confirmation modals for status changes, deletions, logout
 *  - Premium dark tabbed layout with stats
 *  - Tabs: Orders, Menu Management, QR Codes, Staff
 */
import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { QRCodeSVG } from 'qrcode.react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import socket from '../lib/socket'
import ConfirmModal from '../components/ConfirmModal'

const TABS = [
  { id: 'orders', label: 'Orders',   icon: '📋' },
  { id: 'menu',   label: 'Menu',     icon: '🍽️' },
  { id: 'qr',     label: 'QR Codes', icon: '📱' },
  { id: 'staff',  label: 'Staff',    icon: '👥' },
]
const CATEGORIES = ['Drinks', 'Starters', 'Main Course', 'Desserts']
const EMPTY_ITEM = { name: '', description: '', price: '', category: 'Main Course', imageUrl: '', available: true }

const STATUS_CFG = {
  PENDING:   { border: 'border-l-yellow-400', bg: 'bg-yellow-400/10', text: 'text-yellow-400', dot: 'bg-yellow-400', next: 'ACCEPTED', nextLabel: '✓ Accept', nextStyle: 'bg-blue-600 hover:bg-blue-700 text-white' },
  ACCEPTED:  { border: 'border-l-blue-400',   bg: 'bg-blue-400/10',   text: 'text-blue-400',   dot: 'bg-blue-400',   next: 'PREPARING', nextLabel: '🔥 Preparing', nextStyle: 'bg-orange-500 hover:bg-orange-600 text-white' },
  PREPARING: { border: 'border-l-orange-400', bg: 'bg-orange-400/10', text: 'text-orange-400', dot: 'bg-orange-400', next: 'COMPLETED', nextLabel: '✓ Complete', nextStyle: 'bg-green-500 hover:bg-green-600 text-black' },
  COMPLETED: { border: 'border-l-green-400',  bg: 'bg-green-400/10',  text: 'text-green-400',  dot: 'bg-green-400' },
  CANCELLED: { border: 'border-l-red-500',    bg: 'bg-red-500/10',    text: 'text-red-500',    dot: 'bg-red-500' },
}

// ── Order Card ──────────────────────────────────────────────────────────────
function OrderCard({ order, onNext, onCancel }) {
  const cfg = STATUS_CFG[order.status] || STATUS_CFG.PENDING
  const elapsed = Math.floor((Date.now() - new Date(order.createdAt)) / 60000)

  return (
    <div className={`bg-gray-900 rounded-2xl border border-gray-800 border-l-4 ${cfg.border} flex flex-col overflow-hidden hover:border-gray-700 transition-all`}>
      <div className={`px-4 py-2.5 ${cfg.bg} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${cfg.dot} ${order.status === 'PENDING' ? 'animate-pulse' : ''}`} />
          <span className={`text-xs font-bold uppercase tracking-widest ${cfg.text}`}>{order.status}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="font-black text-white text-sm">Table #{order.tableNumber}</span>
          <span className="text-gray-700">•</span>
          <span>{elapsed}m</span>
        </div>
      </div>
      <div className="px-4 py-2 flex items-center justify-between">
        <div>
          <p className="text-white font-bold text-sm">{order.customerName}</p>
          <p className="text-gray-500 text-xs">{order.phone}</p>
        </div>
        <p className="text-white font-extrabold">Rs. {order.totalPrice}</p>
      </div>
      <div className="px-4 pb-2 space-y-0.5 max-h-28 overflow-y-auto">
        {order.items?.map(i => (
          <div key={i.id} className="flex justify-between text-xs border-b border-gray-800/50 last:border-0 py-0.5">
            <span className="text-gray-400"><span className="text-gray-600 mr-1">×{i.quantity}</span>{i.menuItem?.name}</span>
            <span className="text-gray-500">Rs. {i.price * i.quantity}</span>
          </div>
        ))}
      </div>
      {cfg.next && (
        <div className="px-4 py-3 border-t border-gray-800 flex gap-2">
          <button onClick={() => onNext(order)} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${cfg.nextStyle}`}>{cfg.nextLabel}</button>
          {order.status === 'PENDING' && (
            <button onClick={() => onCancel(order)} className="py-2 px-3 rounded-xl text-xs font-bold text-red-400 bg-red-900/30 hover:bg-red-900/60 transition-colors">✕</button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Menu Tab ────────────────────────────────────────────────────────────────
function MenuTab({ restaurantId, onDeleteItem }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_ITEM)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!restaurantId) return
    api.get(`/menu?restaurantId=${restaurantId}&showAll=true`)
      .then(r => setItems(r.data.items || []))
      .finally(() => setLoading(false))
  }, [restaurantId])

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const payload = { ...form, price: parseFloat(form.price), restaurantId }
      if (editId) {
        const res = await api.put(`/menu/${editId}`, payload)
        setItems(p => p.map(i => i.id === editId ? res.data : i))
        toast.success('Item updated!')
      } else {
        const res = await api.post('/menu', payload)
        setItems(p => [...p, res.data])
        toast.success('Item added to menu!')
      }
      setForm(EMPTY_ITEM); setEditId(null)
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const startEdit = (item) => { setForm({ ...item, price: item.price.toString() }); setEditId(item.id) }
  const cancelEdit = () => { setForm(EMPTY_ITEM); setEditId(null) }

  const toggleAvailable = async (item) => {
    try {
      const res = await api.put(`/menu/${item.id}`, { available: !item.available })
      setItems(p => p.map(i => i.id === item.id ? res.data : i))
    } catch (err) { toast.error(err.message) }
  }

  const handleDelete = (item) => {
    onDeleteItem(item, (id) => { setItems(p => p.filter(i => i.id !== id)) })
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Form */}
      <div className="lg:col-span-1">
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 sticky top-24">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            {editId ? <><span>✏️</span> Edit Item</> : <><span>➕</span> Add Item</>}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            {[['name','Item name *','text'], ['price','Price (Rs.) *','number'], ['imageUrl','Image URL','text']].map(([key, ph, type]) => (
              <input key={key} type={type} required={key!=='imageUrl'} min={key==='price'?0:undefined} step={key==='price'?'0.01':undefined}
                placeholder={ph} className="input bg-gray-800 border-gray-700 text-white placeholder-gray-600 text-sm focus:ring-brand-500 focus:border-brand-500"
                value={form[key]} onChange={e => setForm(p => ({...p, [key]: e.target.value}))} />
            ))}
            <textarea placeholder="Description (optional)" rows={2}
              className="input bg-gray-800 border-gray-700 text-white placeholder-gray-600 text-sm resize-none focus:ring-brand-500 focus:border-brand-500"
              value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} />
            <select className="input bg-gray-800 border-gray-700 text-white text-sm"
              value={form.category} onChange={e => setForm(p => ({...p, category: e.target.value}))}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <div className="flex gap-2 pt-1">
              {editId && <button type="button" onClick={cancelEdit} className="btn-secondary flex-1 py-2.5 text-sm">Cancel</button>}
              <button type="submit" disabled={saving} className="btn-primary flex-1 py-2.5 text-sm disabled:opacity-50">
                {saving ? 'Saving…' : editId ? 'Update Item' : 'Add to Menu'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Item list */}
      <div className="lg:col-span-2 space-y-3">
        {items.length === 0 && <div className="text-center py-16 text-gray-500">No items yet. Add your first menu item!</div>}
        {CATEGORIES.map(cat => {
          const catItems = items.filter(i => i.category === cat)
          if (!catItems.length) return null
          return (
            <div key={cat} className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-800/60 border-b border-gray-800 flex items-center justify-between">
                <p className="text-white font-bold text-sm">{cat}</p>
                <span className="text-gray-500 text-xs">{catItems.length} items</span>
              </div>
              {catItems.map(item => (
                <div key={item.id} className={`flex items-center gap-3 px-4 py-3 border-b border-gray-800/50 last:border-0 transition-opacity ${!item.available ? 'opacity-40' : ''}`}>
                  {item.imageUrl
                    ? <img src={item.imageUrl} alt={item.name} className="w-11 h-11 rounded-xl object-cover flex-shrink-0 ring-1 ring-gray-700" />
                    : <div className="w-11 h-11 bg-gray-800 rounded-xl flex items-center justify-center text-xl flex-shrink-0">🍴</div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{item.name}</p>
                    {item.description && <p className="text-gray-500 text-xs truncate">{item.description}</p>}
                    <p className="text-brand-400 text-xs font-bold mt-0.5">Rs. {item.price}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => toggleAvailable(item)} className={`text-[10px] px-2 py-1 rounded-lg font-bold transition-colors ${item.available ? 'bg-green-900/40 text-green-400 hover:bg-green-900/70' : 'bg-gray-800 text-gray-500 hover:bg-gray-700'}`}>
                      {item.available ? 'ON' : 'OFF'}
                    </button>
                    <button onClick={() => startEdit(item)} className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors text-xs">✏️</button>
                    <button onClick={() => handleDelete(item)} className="p-1.5 rounded-lg bg-red-900/30 hover:bg-red-900/60 text-red-400 transition-colors text-xs">🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── QR Tab ──────────────────────────────────────────────────────────────────
function QRTab({ restaurantName }) {
  const [baseUrl, setBaseUrl] = useState(window.location.origin)
  const [tables, setTables] = useState(10)
  return (
    <div>
      <div className="flex flex-wrap gap-4 mb-6 items-end">
        <div><label className="label text-sm text-gray-300">Base URL</label>
          <input className="input bg-gray-800 border-gray-700 text-white w-72 text-sm" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} /></div>
        <div><label className="label text-sm text-gray-300">Tables</label>
          <input type="number" min={1} max={100} className="input bg-gray-800 border-gray-700 text-white w-24 text-sm" value={tables} onChange={e => setTables(parseInt(e.target.value) || 1)} /></div>
        <button onClick={() => window.print()} className="btn-primary px-5 py-2.5 text-sm print:hidden">🖨️ Print All</button>
      </div>
      <p className="text-gray-500 text-sm mb-4 print:hidden">Scan QR → Customer lands on menu page for that table</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
        {Array.from({ length: tables }, (_, i) => i + 1).map(t => (
          <div key={t} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col items-center gap-2 hover:border-gray-700 transition-colors">
            <p className="text-white font-extrabold text-sm">Table {t}</p>
            <div className="bg-white p-2 rounded-xl"><QRCodeSVG value={`${baseUrl}/menu?table=${t}`} size={96} /></div>
            <p className="text-gray-600 text-[9px] text-center">/menu?table={t}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Staff Tab ────────────────────────────────────────────────────────────────
function StaffTab({ restaurantId }) {
  const [users, setUsers] = useState([])
  useEffect(() => { api.get(`/super/users?restaurantId=${restaurantId}`).then(r => setUsers(r.data)).catch(() => {}) }, [restaurantId])
  const COLORS = { OWNER: 'text-brand-400 bg-brand-400/10', KITCHEN: 'text-blue-400 bg-blue-400/10', ADMIN: 'text-purple-400 bg-purple-400/10' }
  return (
    <div className="max-w-2xl">
      {users.length === 0
        ? <div className="text-center py-16 text-gray-500">No staff found</div>
        : <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            {users.map(u => (
              <div key={u.id} className="flex items-center gap-4 px-5 py-4 border-b border-gray-800 last:border-0 hover:bg-gray-800/40 transition-colors">
                <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{u.name[0].toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">{u.name}</p>
                  <p className="text-gray-500 text-xs truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${COLORS[u.role] || 'text-gray-400 bg-gray-800'}`}>{u.role}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${u.active ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>{u.active ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
            ))}
          </div>
      }
    </div>
  )
}

// ── Main Dashboard ───────────────────────────────────────────────────────────
export default function OwnerDashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab]     = useState('orders')
  const [orders, setOrders]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [orderFilter, setOrderFilter] = useState('ALL')
  const [restaurant, setRestaurant]   = useState({ name: 'Restaurant', logoUrl: null })
  const [confirm, setConfirm]         = useState(null)
  const [pendingBadge, setPendingBadge] = useState(0)
  const badgeRef = useRef(null)

  const bumpBadge = useCallback(() => {
    setPendingBadge(n => n + 1)
    clearTimeout(badgeRef.current)
    badgeRef.current = setTimeout(() => setPendingBadge(0), 10000)
  }, [])

  // Load initial data
  useEffect(() => {
    api.get('/orders').then(r => setOrders(r.data))
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false))

    if (user?.restaurantId) {
      api.get('/restaurant/mine').then(r => {
        setRestaurant({ name: r.data.name, logoUrl: r.data.logoUrl })
      }).catch(() => {})
    }
  }, [user])

  // Socket
  useEffect(() => {
    socket.emit('join_kitchen')
    if (user?.restaurantId) socket.emit('join_restaurant', { restaurantId: user.restaurantId })

    const onNewOrder = (order) => {
      setOrders(prev => prev.find(o => o.id === order.id) ? prev : [order, ...prev])
      bumpBadge()
      toast.success(`🆕 New order — Table #${order.tableNumber}!`, { duration: 6000 })
    }
    const onStatus = ({ orderId, status }) => setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
    const onBranding = (data) => {
      setRestaurant({ name: data.name, logoUrl: data.logoUrl })
      toast.success(`Branding updated: "${data.name}"`, { icon: '✨' })
    }

    socket.on('new_order', onNewOrder)
    socket.on('order_status_update', onStatus)
    socket.on('restaurant_updated', onBranding)
    return () => { socket.off('new_order', onNewOrder); socket.off('order_status_update', onStatus); socket.off('restaurant_updated', onBranding) }
  }, [user, bumpBadge])

  // Status change
  const doStatusChange = async (orderId, status) => {
    try {
      const res = await api.put(`/orders/${orderId}/status`, { status })
      setOrders(prev => prev.map(o => o.id === orderId ? res.data : o))
      if (status === 'PENDING') setPendingBadge(n => Math.max(0, n - 1))
      toast.success(`Order → ${status.toLowerCase()}`)
      if (status === 'ACCEPTED') api.post('/otp/send', { orderId }).catch(() => {})
    } catch (err) { toast.error(err.message) }
    finally { setConfirm(null) }
  }

  const askNext = (order) => {
    const cfg = STATUS_CFG[order.status]
    if (!cfg?.next) return
    const labels = { ACCEPTED: 'Accept this order?', PREPARING: 'Start preparing?', COMPLETED: 'Mark as complete?' }
    setConfirm({
      title: labels[cfg.next] || 'Confirm',
      message: `${order.customerName} — Table #${order.tableNumber} — Rs. ${order.totalPrice}`,
      onConfirm: () => doStatusChange(order.id, cfg.next),
      type: cfg.next === 'COMPLETED' ? 'info' : 'warning',
      confirmLabel: cfg.nextLabel,
    })
  }

  const askCancel = (order) => setConfirm({
    title: 'Cancel Order?',
    message: `Cancel order from ${order.customerName} (Table #${order.tableNumber})?`,
    onConfirm: () => doStatusChange(order.id, 'CANCELLED'),
    type: 'danger', confirmLabel: 'Cancel Order',
  })

  const askDeleteItem = (item, onSuccess) => setConfirm({
    title: 'Delete Menu Item?',
    message: `Permanently delete "${item.name}" from the menu? This cannot be undone.`,
    onConfirm: async () => {
      try { await api.delete(`/menu/${item.id}`); onSuccess(item.id); toast.success('Item deleted') }
      catch (err) { toast.error(err.message) }
      finally { setConfirm(null) }
    },
    type: 'danger', confirmLabel: 'Delete Item',
  })

  const askLogout = () => setConfirm({ title: 'Sign Out?', message: 'Sign out of the Owner Portal?', onConfirm: () => { logout(); navigate('/owner/login') }, type: 'danger', confirmLabel: 'Sign Out' })

  const filteredOrders = orderFilter === 'ALL' ? orders : orders.filter(o => o.status === orderFilter)
  const counts = {
    pending:   orders.filter(o => o.status === 'PENDING').length,
    active:    orders.filter(o => ['ACCEPTED','PREPARING'].includes(o.status)).length,
    completed: orders.filter(o => o.status === 'COMPLETED').length,
    revenue:   orders.filter(o => o.status !== 'CANCELLED').reduce((s, o) => s + o.totalPrice, 0),
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-30 flex-shrink-0">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Logo (real-time) */}
          <div className="flex items-center gap-3 min-w-0">
            {restaurant.logoUrl
              ? <img src={restaurant.logoUrl} alt="logo" className="w-9 h-9 rounded-xl object-cover ring-2 ring-gray-700 flex-shrink-0" />
              : <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-orange-600 rounded-xl flex items-center justify-center text-lg flex-shrink-0">🏢</div>
            }
            <div className="min-w-0">
              <p className="text-white font-extrabold text-sm leading-none truncate">{restaurant.name}</p>
              <p className="text-gray-500 text-xs mt-0.5">Owner Portal</p>
            </div>
          </div>

          {/* Stats (desktop) */}
          <div className="hidden md:flex items-center gap-3">
            {[
              { label: 'Pending', v: counts.pending,   color: 'text-yellow-400' },
              { label: 'Active',  v: counts.active,    color: 'text-blue-400'   },
              { label: 'Done',    v: counts.completed, color: 'text-green-400'  },
              { label: 'Revenue', v: `Rs.${counts.revenue.toFixed(0)}`, color: 'text-brand-400' },
            ].map(s => (
              <div key={s.label} className="text-center px-3 py-1.5 bg-gray-800/60 rounded-xl min-w-[60px]">
                <p className={`font-extrabold text-base leading-none ${s.color}`}>{s.v}</p>
                <p className="text-gray-600 text-[9px] mt-0.5 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Right */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden sm:block text-right">
              <p className="text-white text-xs font-semibold">{user?.name}</p>
              <p className="text-gray-600 text-[10px]">Owner</p>
            </div>
            <button onClick={askLogout} className="text-xs text-gray-500 hover:text-red-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-800">Sign out</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 pb-3">
          <div className="flex gap-1">
            {TABS.map(t => {
              const showBadge = t.id === 'orders' && counts.pending > 0
              return (
                <button key={t.id} onClick={() => { setActiveTab(t.id); if(t.id==='orders') setPendingBadge(0) }}
                  className={`relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${
                    activeTab === t.id ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}>
                  {showBadge && (
                    <span className="absolute -top-1.5 -right-1 flex h-5 w-5 items-center justify-center">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
                      <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 text-white text-[9px] font-black items-center justify-center">{counts.pending}</span>
                    </span>
                  )}
                  <span>{t.icon}</span>
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </header>

      {/* ── Content ────────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-5">
        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div>
            <div className="flex flex-wrap gap-2 mb-5">
              {['ALL','PENDING','ACCEPTED','PREPARING','COMPLETED','CANCELLED'].map(s => (
                <button key={s} onClick={() => setOrderFilter(s)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
                    orderFilter===s ? 'bg-white text-gray-900' : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
                  }`}>
                  {s} <span className="opacity-60">({s==='ALL' ? orders.length : orders.filter(o=>o.status===s).length})</span>
                </button>
              ))}
            </div>
            {loading ? (
              <div className="flex justify-center py-28"><div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-28 text-center">
                <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center text-4xl mb-4 border border-gray-800">📋</div>
                <p className="text-white font-bold">No orders yet</p>
                <p className="text-gray-600 text-sm mt-1">New orders appear in real-time</p>
              </div>
            ) : (
              <div className="columns-1 sm:columns-2 xl:columns-3 gap-4 space-y-4">
                {filteredOrders.map(o => (
                  <div key={o.id} className="break-inside-avoid">
                    <OrderCard order={o} onNext={askNext} onCancel={askCancel} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'menu'  && <MenuTab restaurantId={user?.restaurantId} onDeleteItem={askDeleteItem} />}
        {activeTab === 'qr'    && <QRTab restaurantName={restaurant.name} />}
        {activeTab === 'staff' && <StaffTab restaurantId={user?.restaurantId} />}
      </main>

      {/* ── Confirm Modal ──────────────────────────────────────────────────────── */}
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
