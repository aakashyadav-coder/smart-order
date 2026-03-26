/**
 * OwnerDashboardPage — Ultra-premium restaurant management panel
 * Features: dark sidebar, kanban live orders, push notifications,
 *           confetti on milestones, profile editor, keyboard shortcuts
 */
import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import socket from '../lib/socket'
import ConfirmModal from '../components/ConfirmModal'
import {
  FaBuilding, FaSignOutAlt, FaChartLine, FaClipboardList,
  FaUtensils, FaQrcode, FaUsers, FaTimesCircle, FaSyncAlt, FaBars, FaTimes,
  FaCog
} from 'react-icons/fa'
import {
  AnalyticsTab, OrderHistoryTab, MenuTab, QRTab, StaffTab
} from './owner/OwnerTabComponents'

// ── Confetti burst ─────────────────────────────────────────────────────────────
function spawnConfetti() {
  const colors = ['#e11d48','#f97316','#22c55e','#3b82f6','#a855f7','#fbbf24']
  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden'
  document.body.appendChild(container)
  for (let i = 0; i < 80; i++) {
    const el = document.createElement('div')
    const color = colors[Math.floor(Math.random() * colors.length)]
    const size = 6 + Math.random() * 8
    el.style.cssText = `position:absolute;width:${size}px;height:${size}px;background:${color};border-radius:${Math.random()>0.5?'50%':'2px'};left:${Math.random()*100}%;top:-10px;opacity:1;transition:transform 2.5s ease-in,opacity 2.5s ease-in;transform:translateY(0) rotate(0deg)`
    container.appendChild(el)
    requestAnimationFrame(() => {
      el.style.transform = `translateY(${window.innerHeight + 60}px) rotate(${720 + Math.random()*720}deg) translateX(${(Math.random()-0.5)*400}px)`
      el.style.opacity = '0'
    })
  }
  setTimeout(() => document.body.removeChild(container), 2600)
}

// ── Push notification helper ───────────────────────────────────────────────────
function sendPush(title, body) {
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico', badge: '/favicon.ico' })
  }
}
function requestPush() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

// ── Profile Editor Modal ───────────────────────────────────────────────────────
function ProfileModal({ restaurant, user, onClose, onSaved }) {
  const [form, setForm] = useState({ name: restaurant?.name || '', logoUrl: restaurant?.logoUrl || '', address: restaurant?.address || '' })
  const [saving, setSaving] = useState(false)
  const handleSubmit = async e => {
    e.preventDefault(); setSaving(true)
    try {
      const res = await api.put('/restaurant/mine', form)
      onSaved(res.data); toast.success('Profile updated!'); onClose()
    } catch (err) { toast.error(err.message) } finally { setSaving(false) }
  }
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-5 text-white flex items-center justify-between">
          <div><p className="font-extrabold text-base">Restaurant Profile</p><p className="text-gray-400 text-sm mt-0.5">Update your public info</p></div>
          <button onClick={onClose} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors"><FaTimes className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div><label className="label">Restaurant Name</label><input required className="input text-sm" value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} /></div>
          {/* Read-only account email */}
          <div>
            <label className="label">Email Address</label>
            <div className="input text-sm bg-gray-50 text-gray-400 cursor-not-allowed select-none flex items-center gap-2">
              <span className="flex-1 truncate">{user?.email || '—'}</span>
              <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider flex-shrink-0">Read only</span>
            </div>
          </div>
          <div><label className="label">Logo URL</label><input className="input text-sm" placeholder="https://..." value={form.logoUrl} onChange={e => setForm(p=>({...p,logoUrl:e.target.value}))} />
            {form.logoUrl && <img src={form.logoUrl} alt="" className="w-12 h-12 object-cover rounded-xl mt-2 border border-gray-100" onError={e => e.target.style.display='none'} />}
          </div>
          <div><label className="label">Address</label><input className="input text-sm" value={form.address} onChange={e => setForm(p=>({...p,address:e.target.value}))} /></div>
          {/* Read-only phone */}
          <div>
            <label className="label">Phone Number</label>
            <div className="input text-sm bg-gray-50 text-gray-400 cursor-not-allowed select-none flex items-center gap-2">
              <span className="flex-1">{restaurant?.phone || '—'}</span>
              <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider flex-shrink-0">Read only</span>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 py-2.5 text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 py-2.5 text-sm">{saving?'Saving…':'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Nav config ─────────────────────────────────────────────────────────────────
const NAV = [
  { id:'analytics', label:'Analytics',   icon:FaChartLine,   shortcut:'A' },
  { id:'history',   label:'Orders',      icon:FaClipboardList,shortcut:'O' },
  { id:'menu',      label:'Menu',        icon:FaUtensils,     shortcut:'M' },
  { id:'qr',        label:'QR Codes',    icon:FaQrcode,       shortcut:'Q' },
  { id:'staff',     label:'Staff',       icon:FaUsers,        shortcut:'S' },
]

// ── Sidebar ────────────────────────────────────────────────────────────────────
function Sidebar({ activeTab, onChange, user, restaurant, logoError, onLogoError, pendingCount, onLogout, onProfile, onClose }) {
  return (
    <div className="flex flex-col h-full bg-gray-950 text-white">
      {/* Brand */}
      <div className="p-5 border-b border-white/8 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-brand-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-600/25 flex-shrink-0">
            {restaurant?.logoUrl && !logoError
              ? <img src={restaurant.logoUrl} alt="" onError={onLogoError} className="w-full h-full rounded-2xl object-cover" />
              : <FaBuilding className="w-5 h-5 text-white" />}
          </div>
          <div className="min-w-0">
            <p className="font-extrabold text-white text-sm leading-none truncate">{restaurant?.name || 'Restaurant'}</p>
            <p className="text-orange-400 text-xs font-semibold mt-0.5">Owner Portal</p>
          </div>
        </div>
        {onClose && <button onClick={onClose} className="w-7 h-7 bg-white/8 hover:bg-white/15 rounded-lg flex items-center justify-center transition-colors ml-2 flex-shrink-0"><FaTimes className="w-4 h-4 text-gray-400" /></button>}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest px-3 py-2">Navigation</p>
        {NAV.map(({ id, label, icon: Icon, shortcut }) => {
          const isActive = activeTab === id
          const showBadge = id === 'history' && pendingCount > 0
          const isLive = id === 'kanban' && pendingCount > 0
          return (
            <button key={id} onClick={() => { onChange(id); onClose?.() }}
              className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 relative ${
                isActive
                  ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-md shadow-brand-600/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/8'
              }`}>
              <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive?'text-white':'text-gray-500 group-hover:text-white'}`} />
              <span className="flex-1 text-left">{label}</span>
              {isLive && !isActive && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />}
              {showBadge && (
                <span className="relative flex h-5 w-5 items-center justify-center flex-shrink-0">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-brand-400 opacity-50" />
                  <span className="relative bg-brand-500 text-white text-[9px] font-black rounded-full h-5 w-5 flex items-center justify-center">{pendingCount}</span>
                </span>
              )}
              {!showBadge && !isLive && <kbd className="hidden group-hover:flex text-[9px] bg-white/10 px-1.5 py-0.5 rounded font-mono text-gray-400">{shortcut}</kbd>}
            </button>
          )
        })}
      </nav>

      {/* Footer — Profile + Sign Out */}
      <div className="p-4 border-t border-white/8 flex-shrink-0 space-y-1">
        <button onClick={onProfile} className="w-full flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors py-2.5 px-3 rounded-xl hover:bg-white/8 font-semibold">
          <FaCog className="w-4 h-4" /> Edit Profile
        </button>
        <button onClick={onLogout} className="w-full flex items-center gap-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 transition-colors py-2.5 px-3 rounded-xl shadow-sm shadow-brand-600/20">
          <FaSignOutAlt className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
const MILESTONE = 10000 // Rs. revenue milestone for confetti

export default function OwnerDashboardPage() {
  const { user, logout, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('owner_tab') || 'analytics')
  const changeTab = id => { setActiveTab(id); localStorage.setItem('owner_tab', id) }

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [restaurant, setRestaurant] = useState(() => { try { return JSON.parse(localStorage.getItem('owner_restaurant')||'null')||{} } catch { return {} } })
  const [logoError, setLogoError] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const prevRevRef = useRef(0)

  const fetchOrders = useCallback(async () => {
    try {
      setFetchError(null)
      const res = await api.get('/orders')
      setOrders(res.data)
      setPendingCount(res.data.filter(o => o.status === 'PENDING').length)
    } catch (err) { setFetchError(err.message || 'Could not load orders') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (authLoading) return
    fetchOrders()
    api.get('/restaurant/mine').then(r => {
      const d = { name: r.data.name, logoUrl: r.data.logoUrl, address: r.data.address, phone: r.data.phone }
      setRestaurant(d); setLogoError(false)
      localStorage.setItem('owner_restaurant', JSON.stringify(d))
    }).catch(() => {})
    requestPush()
  }, [authLoading, fetchOrders])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return
      const nav = NAV.find(n => n.shortcut === e.key.toUpperCase())
      if (nav) changeTab(nav.id)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Check confetti milestone
  const totalRevenue = orders.filter(o => o.status === 'PAID').reduce((s, o) => s + (o.discountedTotal ?? o.totalPrice), 0)
  useEffect(() => {
    const prev = prevRevRef.current
    const crossed = Math.floor(totalRevenue / MILESTONE) > Math.floor(prev / MILESTONE)
    if (crossed && totalRevenue > 0) {
      spawnConfetti()
      toast.success(`🎉 Rs. ${(Math.floor(totalRevenue/MILESTONE)*MILESTONE).toLocaleString()} milestone reached!`, { duration: 5000 })
    }
    prevRevRef.current = totalRevenue
  }, [totalRevenue])


  useEffect(() => {
    const joinRooms = () => {
      socket.emit('join_kitchen')
      if (user?.restaurantId) socket.emit('join_restaurant', { restaurantId: user.restaurantId })
    }

    joinRooms() // join immediately

    const onNew = order => {
      setOrders(p => {
        if (p.find(o => o.id === order.id)) return p
        const next = [order, ...p]
        setPendingCount(next.filter(o => o.status === 'PENDING').length)
        return next
      })
      sendPush('New Order!', `Table #${order.tableNumber} — Rs. ${order.totalPrice}`)
      toast(`New Order — Table #${order.tableNumber}!`, { icon: '🔔', duration: 7000 })
    }

    const onStatus = ({ orderId, status }) => {
      setOrders(p => {
        const next = p.map(o => o.id === orderId ? { ...o, status } : o)
        // Recalculate pending count from fresh state — avoids double-decrement bugs
        setPendingCount(next.filter(o => o.status === 'PENDING').length)
        return next
      })
    }

    const onBrand = data => {
      const d = { name: data.name, logoUrl: data.logoUrl }
      setRestaurant(p => ({ ...p, ...d })); setLogoError(false)
      localStorage.setItem('owner_restaurant', JSON.stringify({ ...restaurant, ...d }))
    }

    // Re-join rooms if socket reconnects (e.g. server restart)
    const onReconnect = () => joinRooms()

    socket.on('new_order', onNew)
    socket.on('order_status_update', onStatus)
    socket.on('restaurant_updated', onBrand)
    socket.on('connect', onReconnect)

    return () => {
      socket.off('new_order', onNew)
      socket.off('order_status_update', onStatus)
      socket.off('restaurant_updated', onBrand)
      socket.off('connect', onReconnect)
    }
  }, [user?.id, user?.restaurantId])  // stable primitive deps — prevents duplicate listeners


  const handleStatusChange = (orderId, status) => {
    setOrders(p => p.map(o => o.id === orderId ? { ...o, status } : o))
    if (status !== 'PENDING') setPendingCount(n => Math.max(0, n - 1))
  }

  const askDeleteItem = (item, onSuccess) => setConfirm({
    title: 'Delete Item?', message: `Delete "${item.name}" permanently?`, type: 'danger', confirmLabel: 'Delete',
    onConfirm: async () => {
      try { await api.delete(`/menu/${item.id}`); onSuccess(item.id); toast.success('Deleted') }
      catch (err) { toast.error(err.message) } finally { setConfirm(null) }
    },
  })

  const askLogout = () => setConfirm({
    title: 'Sign Out?', message: 'Sign out of the Owner Portal?', type: 'danger', confirmLabel: 'Sign Out',
    onConfirm: () => { logout(); navigate('/owner/login') }
  })

  const LIVE_STATS = [
    { label: 'Orders',  value: orders.length,                 color: 'text-blue-600',  bg: 'bg-blue-50 border-blue-100' },
    { label: 'Paid',    value: `Rs.${totalRevenue.toFixed(0)}`, color: 'text-green-600', bg: 'bg-green-50 border-green-100' },
    { label: 'Pending', value: pendingCount, color: pendingCount>0?'text-amber-600':'text-gray-400', bg: pendingCount>0?'bg-amber-50 border-amber-200':'bg-gray-50 border-gray-100' },
  ]

  const sidebarProps = {
    activeTab, onChange: changeTab, user, restaurant,
    logoError, onLogoError: () => setLogoError(true),
    pendingCount, onLogout: askLogout,
    onProfile: () => setShowProfile(true),
  }

  const activeNav = NAV.find(n => n.id === activeTab)

  const TABS = {
    analytics: <AnalyticsTab allOrders={orders} />,
    history:   <OrderHistoryTab orders={orders} loading={loading} restaurant={restaurant} onPaid={u => setOrders(p => p.map(o => o.id===u.id?u:o))} onStatusChange={handleStatusChange} />,
    menu:      <MenuTab restaurantId={user?.restaurantId} onDeleteItem={askDeleteItem} />,
    qr:        <QRTab restaurantId={user?.restaurantId} />,
    staff:     <StaffTab />,
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 flex-col flex-shrink-0 shadow-xl" style={{ height: '100vh', overflow: 'hidden' }}>
        <Sidebar {...sidebarProps} />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col shadow-2xl transform transition-transform duration-300 lg:hidden ${sidebarOpen?'translate-x-0':'-translate-x-full'}`}>
        <Sidebar {...sidebarProps} onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white/90 backdrop-blur-lg border-b border-gray-100 shadow-sm flex-shrink-0 z-20">
          <div className="px-4 sm:px-6 py-3 flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors flex-shrink-0">
              <FaBars className="w-4 h-4 text-gray-600" />
            </button>
            <div className="flex items-center gap-2.5 min-w-0">
              {activeNav && (
                <div className="w-8 h-8 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <activeNav.icon className="w-4 h-4 text-brand-600" />
                </div>
              )}
              <h1 className="font-extrabold text-gray-900 text-base truncate">{activeNav?.label}</h1>
              <span className="hidden sm:flex items-center gap-1 text-xs text-gray-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Live
              </span>
            </div>
            {/* Live stats */}
            <div className="ml-auto hidden md:flex items-center gap-2">
              {LIVE_STATS.map(s => (
                <div key={s.label} className={`flex flex-col items-center px-3 py-1.5 rounded-xl border transition-all ${s.bg}`}>
                  <span className={`font-extrabold text-sm leading-none ${s.color}`}>{s.value}</span>
                  <span className="text-gray-400 text-[9px] uppercase tracking-wider mt-0.5">{s.label}</span>
                </div>
              ))}
            </div>
            {/* Keyboard shortcut hint */}
            <div className="hidden xl:flex items-center gap-1 text-[10px] text-gray-300 ml-2">
              <kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">A</kbd>
              <kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">O</kbd>
              <kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">M</kbd>
            </div>

          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {fetchError && (
            <div className="mb-5 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-red-600 text-sm"><FaTimesCircle className="w-4 h-4" /><span>{fetchError}</span></div>
              <button onClick={fetchOrders} className="flex items-center gap-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0">
                <FaSyncAlt className="w-3 h-3" /> Retry
              </button>
            </div>
          )}
          {TABS[activeTab] || null}
        </main>
      </div>

      {confirm && <ConfirmModal open title={confirm.title} message={confirm.message} confirmLabel={confirm.confirmLabel||'Confirm'} type={confirm.type||'danger'} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}
      {showProfile && <ProfileModal restaurant={restaurant} user={user} onClose={() => setShowProfile(false)} onSaved={data => { setRestaurant(p=>({...p,...data})); localStorage.setItem('owner_restaurant', JSON.stringify({...restaurant,...data})) }} />}
    </div>
  )
}
