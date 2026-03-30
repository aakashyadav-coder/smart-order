/**
 * OwnerDashboardPage — Ultra-premium restaurant management panel
 * Features: dark sidebar, kanban live orders, push notifications,
 *           confetti on milestones, profile editor, keyboard shortcuts
 */
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import socket from '../lib/socket'
import ConfirmModal from '../components/ConfirmModal'
import {
  FaBuilding, FaSignOutAlt, FaChartLine, FaClipboardList,
  FaUtensils, FaQrcode, FaUsers, FaTimesCircle, FaSyncAlt, FaBars, FaTimes,
  FaCog, FaBell, FaInbox
} from 'react-icons/fa'
import { AnalyticsTab, OrderHistoryTab, MenuTab, QRTab, StaffTab, SupportTab } from './owner/OwnerTabComponents'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Loader2, X } from 'lucide-react'

// ── Confetti burst ─────────────────────────────────────────────────────────────
function spawnConfetti() {
  const colors = ['#e11d48', '#f97316', '#22c55e', '#3b82f6', '#a855f7', '#fbbf24']
  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden'
  document.body.appendChild(container)
  for (let i = 0; i < 80; i++) {
    const el = document.createElement('div')
    const color = colors[Math.floor(Math.random() * colors.length)]
    const size = 6 + Math.random() * 8
    el.style.cssText = `position:absolute;width:${size}px;height:${size}px;background:${color};border-radius:${Math.random() > 0.5 ? '50%' : '2px'};left:${Math.random() * 100}%;top:-10px;opacity:1;transition:transform 2.5s ease-in,opacity 2.5s ease-in;transform:translateY(0) rotate(0deg)`
    container.appendChild(el)
    requestAnimationFrame(() => {
      el.style.transform = `translateY(${window.innerHeight + 60}px) rotate(${720 + Math.random() * 720}deg) translateX(${(Math.random() - 0.5) * 400}px)`
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
function ProfileModal({ open, restaurant, user, onClose, onSaved }) {
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
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl">
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-5 text-white flex items-center justify-between">
          <div>
            <DialogTitle className="font-extrabold text-base text-white">Restaurant Profile</DialogTitle>
            <p className="text-gray-400 text-sm mt-0.5">Update your public info</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20 rounded-xl">
            <X className="w-4 h-4" />
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="prof-name">Restaurant Name</Label>
            <Input id="prof-name" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Email Address</Label>
            <div className="flex h-10 w-full rounded-md border border-input bg-gray-50 px-3 py-2 text-sm text-gray-400 items-center gap-2 cursor-not-allowed">
              <span className="flex-1 truncate">{user?.email || '—'}</span>
              <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider flex-shrink-0">Read only</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prof-logo">Logo URL</Label>
            <Input id="prof-logo" placeholder="https://..." value={form.logoUrl} onChange={e => setForm(p => ({ ...p, logoUrl: e.target.value }))} />
            {form.logoUrl && <img src={form.logoUrl} alt="" className="w-12 h-12 object-cover rounded-xl mt-2 border border-gray-100" onError={e => e.target.style.display = 'none'} />}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prof-address">Address</Label>
            <Input id="prof-address" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Phone Number</Label>
            <div className="flex h-10 w-full rounded-md border border-input bg-gray-50 px-3 py-2 text-sm text-gray-400 items-center gap-2 cursor-not-allowed">
              <span className="flex-1">{restaurant?.phone || '—'}</span>
              <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider flex-shrink-0">Read only</span>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Nav config ─────────────────────────────────────────────────────────────────
const NAV_GROUPS_OWNER = [
  {
    label: 'Navigation',
    items: [
      { id: 'analytics', label: 'Analytics', icon: FaChartLine, shortcut: 'A' },
      { id: 'history', label: 'Orders', icon: FaClipboardList, shortcut: 'O' },
      { id: 'menu', label: 'Menu', icon: FaUtensils, shortcut: 'M' },
      { id: 'qr', label: 'QR Codes', icon: FaQrcode, shortcut: 'Q' },
      { id: 'staff', label: 'Staff', icon: FaUsers, shortcut: 'S' },
    ],
  },
  {
    label: 'Account',
    items: [
      { id: 'support', label: 'Support', icon: FaInbox, shortcut: 'H' },
    ],
  },
]

// ── Sidebar ────────────────────────────────────────────────────────────────────
function Sidebar({ activeTab, onChange, user, restaurant, logoError, onLogoError, pendingCount, onLogout, onProfile, onClose }) {
  return (
    <div className="flex flex-col h-full" style={{ background: 'linear-gradient(180deg, #030712 0%, #0f172a 50%, #030712 100%)' }}>

      {/* Brand */}
      <div className="p-5 border-b border-white/[0.08] flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-600/25 flex-shrink-0">
            {restaurant?.logoUrl && !logoError
              ? <img src={restaurant.logoUrl} alt="" onError={onLogoError} className="w-full h-full rounded-xl object-cover" />
              : <FaBuilding className="w-4 h-4 text-white" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold text-white text-sm leading-none truncate">{restaurant?.name || 'Restaurant'}</p>
            <p className="text-brand-400 text-[11px] font-semibold mt-0.5 uppercase tracking-wider">Owner Portal</p>
          </div>
          {onClose && (
            <button onClick={onClose} className="w-7 h-7 bg-white/[0.07] hover:bg-white/[0.14] rounded-lg flex items-center justify-center transition-colors flex-shrink-0">
              <FaTimes className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 overflow-y-auto scrollbar-none mt-1">
        {NAV_GROUPS_OWNER.map(group => (
          <div key={group.label}>
            <p className="nav-section-label">{group.label}</p>
            <div className="space-y-0.5 mb-1">
              {group.items.map(({ id, label, icon: Icon, shortcut }) => {
                const isActive = activeTab === id
                const showBadge = id === 'history' && pendingCount > 0
                return (
                  <button key={id} onClick={() => { onChange(id); onClose?.() }}
                    className={`group relative w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${isActive
                      ? 'bg-white/[0.10] text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/[0.06]'
                      }`}>
                    {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-400 rounded-r-full" />}
                    <Icon className={`flex-shrink-0 transition-colors ${isActive ? 'text-brand-400' : 'text-gray-500 group-hover:text-gray-300'}`} style={{ width: 16, height: 16 }} />
                    <span className="flex-1 text-left">{label}</span>
                    {showBadge && (
                      <span className="relative flex h-5 w-5 items-center justify-center flex-shrink-0">
                        <span className="animate-ping absolute h-full w-full rounded-full bg-brand-400 opacity-40" />
                        <span className="relative bg-brand-500 text-white text-[9px] font-black rounded-full h-5 w-5 flex items-center justify-center">{pendingCount}</span>
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <Separator className="bg-white/[0.08] mx-3 w-auto" />

      {/* Footer — no user card, just actions */}
      <div className="p-3 space-y-1">
        <Button
          variant="ghost"
          onClick={onProfile}
          className="w-full justify-start gap-3 text-gray-400 hover:text-white hover:bg-white/[0.08] font-semibold text-sm h-9"
        >
          <FaCog className="w-4 h-4" />
          Edit Profile
        </Button>
        <Button
          variant="ghost"
          onClick={onLogout}
          className="w-full justify-start gap-3 text-gray-400 hover:text-white hover:bg-white/[0.08] font-semibold text-sm h-9"
        >
          <FaSignOutAlt className="w-4 h-4" />
          Sign Out
        </Button>
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
  const [restaurant, setRestaurant] = useState(() => { try { return JSON.parse(localStorage.getItem('owner_restaurant') || 'null') || {} } catch { return {} } })
  const [logoError, setLogoError] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [announcements, setAnnouncements] = useState([])
  const [announcementsOpen, setAnnouncementsOpen] = useState(false)
  const [readAnnIds, setReadAnnIds] = useState(new Set())
  const prevRevRef = useRef(null) // null = skip confetti on first load
  const notifiedOrderIds = useRef(new Set())

  const readKey = useMemo(() => {
    if (user?.id) return `owner_ann_read_${user.id}`
    if (user?.restaurantId) return `owner_ann_read_${user.restaurantId}`
    return null
  }, [user?.id, user?.restaurantId])

  const annLoadedRef = useRef(false)

  // Load persisted read IDs when user resolves
  useEffect(() => {
    if (!readKey) return
    annLoadedRef.current = false          // reset flag on key change
    try {
      const raw = localStorage.getItem(readKey)
      setReadAnnIds(new Set(raw ? JSON.parse(raw) : []))
    } catch { setReadAnnIds(new Set()) }
  }, [readKey])

  // Persist to localStorage — skip the very first run after readKey resolves
  // to avoid overwriting stored data with the empty initial state
  useEffect(() => {
    if (!readKey) return
    if (!annLoadedRef.current) { annLoadedRef.current = true; return }
    localStorage.setItem(readKey, JSON.stringify([...readAnnIds]))
  }, [readAnnIds, readKey])

  const fetchOrders = useCallback(async () => {
    try {
      setFetchError(null)
      const res = await api.get('/orders')
      setOrders(res.data)
      setPendingCount(res.data.filter(o => o.status === 'PENDING').length)
      res.data.forEach(o => notifiedOrderIds.current.add(o.id))
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
    }).catch(() => { })
    api.get('/restaurant/announcements')
      .then(r => setAnnouncements(r.data))
      .catch(() => setAnnouncements([]))
    requestPush()
  }, [authLoading, fetchOrders])

  // Keyboard shortcuts
  useEffect(() => {
    const allNavItems = NAV_GROUPS_OWNER.flatMap(g => g.items)
    const handler = e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return
      const nav = allNavItems.find(n => n.shortcut === e.key.toUpperCase())
      if (nav) changeTab(nav.id)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const totalRevenue = orders.filter(o => o.status === 'PAID').reduce((s, o) => s + (o.discountedTotal ?? o.totalPrice), 0)

  // Milestone confetti — only fires when revenue crosses a new threshold AFTER load
  useEffect(() => {
    // On first render, record baseline — no confetti
    if (prevRevRef.current === null) {
      prevRevRef.current = totalRevenue
      return
    }
    const prev = prevRevRef.current
    const crossed = Math.floor(totalRevenue / MILESTONE) > Math.floor(prev / MILESTONE)
    if (crossed && totalRevenue > 0) {
      spawnConfetti()
      toast.success(`🎉 Rs. ${(Math.floor(totalRevenue / MILESTONE) * MILESTONE).toLocaleString()} milestone reached!`, { duration: 5000 })
    }
    prevRevRef.current = totalRevenue
  }, [totalRevenue])


  useEffect(() => {
    const joinRooms = () => {
      if (user?.restaurantId) {
        socket.emit('join_restaurant', { restaurantId: user.restaurantId })
        socket.emit('join_owner', { restaurantId: user.restaurantId })
      }
    }

    joinRooms() // join immediately

    const onNew = order => {
      if (notifiedOrderIds.current.has(order.id)) return
      notifiedOrderIds.current.add(order.id)
      setOrders(p => {
        if (p.find(o => o.id === order.id)) return p
        const next = [order, ...p]
        setPendingCount(next.filter(o => o.status === 'PENDING').length)
        return next
      })
      sendPush('New Order!', `Table #${order.tableNumber} — Rs. ${order.totalPrice}`)
      toast(`New Order — Table #${order.tableNumber}!`, {
        icon: <FaBell className="w-4 h-4 text-brand-500" />,
        duration: 7000,
      })
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

    const onAnnouncement = (ann) => {
      if (ann.restaurantId && ann.restaurantId !== user?.restaurantId) return
      setAnnouncements(p => {
        if (p.some(a => a.id === ann.id)) return p
        return [ann, ...p]
      })
      setAnnouncementsOpen(true)
      const title = ann.title || 'Announcement'
      const msg = ann.message || ''
      sendPush(title, msg)
      toast(msg ? `${title} — ${msg}` : title, {
        icon: <FaBell className="w-4 h-4 text-brand-500" />,
        duration: 8000,
      })
    }

    // Re-join rooms if socket reconnects (e.g. server restart)
    const onReconnect = () => joinRooms()

    socket.on('new_order', onNew)
    socket.on('order_status_update', onStatus)
    socket.on('restaurant_updated', onBrand)
    socket.on('announcement', onAnnouncement)
    socket.on('connect', onReconnect)

    return () => {
      socket.off('new_order', onNew)
      socket.off('order_status_update', onStatus)
      socket.off('restaurant_updated', onBrand)
      socket.off('announcement', onAnnouncement)
      socket.off('connect', onReconnect)
    }
  }, [user?.id, user?.restaurantId])  // stable primitive deps — prevents duplicate listeners
  const unreadCount = useMemo(() => announcements.filter(a => !readAnnIds.has(a.id)).length, [announcements, readAnnIds])
  const markAnnouncementRead = (id) => setReadAnnIds(prev => new Set(prev).add(id))
  const markAllAnnouncementsRead = () => setReadAnnIds(new Set(announcements.map(a => a.id)))
  const fmtAnn = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })


  const handleStatusChange = (orderId, status) => {
    setOrders(p => {
      const next = p.map(o => o.id === orderId ? { ...o, status } : o)
      // Recalculate from fresh state — avoids double-decrement / negative counts
      setPendingCount(next.filter(o => o.status === 'PENDING').length)
      return next
    })
  }

  const askDeleteItem = (item, onSuccess) => setConfirm({
    title: 'Delete Item?', message: `Delete "${item.name}" permanently? This cannot be undone.`, type: 'danger', confirmLabel: 'Delete',
    onConfirm: async () => {
      try {
        await api.delete(`/menu/${item.id}`)
        onSuccess(item.id)
        toast.success('Item deleted')
        setConfirm(null) // only close on success
      } catch (err) {
        toast.error(err.message || 'Failed to delete item')
        // Modal stays open — user sees the failure and can retry or cancel
      }
    },
  })

  const askLogout = () => setConfirm({
    title: 'Sign Out?', message: 'Sign out of the Owner Portal?', type: 'danger', confirmLabel: 'Sign Out',
    onConfirm: () => { logout(); navigate('/owner/login') }
  })

  const LIVE_STATS = [
    { label: 'Pending', value: pendingCount, color: pendingCount > 0 ? 'text-amber-600' : 'text-gray-400', bg: pendingCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-100' },
  ]


  const sidebarProps = {
    activeTab, onChange: changeTab, user, restaurant,
    logoError, onLogoError: () => setLogoError(true),
    pendingCount, onLogout: askLogout,
    onProfile: () => setShowProfile(true),
  }

  const activeNav = NAV_GROUPS_OWNER.flatMap(g => g.items).find(n => n.id === activeTab)

  const TABS = {
    analytics: <AnalyticsTab allOrders={orders} />,
    history: <OrderHistoryTab orders={orders} loading={loading} restaurant={restaurant} onPaid={u => setOrders(p => p.map(o => o.id === u.id ? u : o))} onStatusChange={handleStatusChange} />,
    menu: <MenuTab restaurantId={user?.restaurantId} onDeleteItem={askDeleteItem} />,
    qr: <QRTab restaurantId={user?.restaurantId} />,
    staff: <StaffTab />,
    support: <SupportTab />,
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-60 flex-col flex-shrink-0 shadow-xl" style={{ height: '100vh', overflow: 'hidden' }}>
          <Sidebar {...sidebarProps} />
        </aside>

        {/* Mobile sidebar — Sheet */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent
            side="left"
            className="w-60 p-0 border-r border-white/[0.08] [&>button]:hidden"
            style={{ background: 'linear-gradient(180deg, #030712 0%, #0f172a 50%, #030712 100%)' }}
          >
            <Sidebar {...sidebarProps} onClose={() => setSidebarOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Main */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top bar */}
          <header className="bg-white/90 backdrop-blur-lg border-b border-gray-100 shadow-sm flex-shrink-0 z-20">
            <div className="px-4 sm:px-6 py-3 flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="lg:hidden w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-xl flex-shrink-0">
                <FaBars className="w-4 h-4 text-gray-600" />
              </Button>
              <div className="flex items-center gap-2.5 min-w-0">
                {activeNav && (
                  <div className="w-8 h-8 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <activeNav.icon className="w-4 h-4 text-brand-600" />
                  </div>
                )}
                <h1 className="font-extrabold text-gray-900 text-base truncate">{activeNav?.label}</h1>
              </div>
              <div className="ml-auto flex items-center gap-3">
                {/* Notifications — Popover */}
                <Popover open={announcementsOpen} onOpenChange={setAnnouncementsOpen}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <button
                          className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors relative"
                        >
                          <FaBell className="w-4 h-4 text-gray-600" />
                          {unreadCount > 0 && (
                            <Badge className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full flex items-center justify-center bg-red-500 text-white border-none">
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </Badge>
                          )}
                        </button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Announcements</TooltipContent>
                  </Tooltip>
                  <PopoverContent align="end" sideOffset={8} className="w-96 max-w-[90vw] p-0 rounded-2xl overflow-hidden shadow-2xl border border-gray-200">
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                      <div>
                        <p className="text-sm font-bold text-gray-900">Announcements</p>
                        <p className="text-[11px] text-gray-400">{unreadCount} unread</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <button onClick={markAllAnnouncementsRead} className="text-[10px] font-semibold text-brand-600 hover:text-brand-700">
                            Mark all read
                          </button>
                        )}
                      </div>
                    </div>
                    <ScrollArea className="max-h-80">
                      <div className="divide-y divide-gray-100">
                        {announcements.length === 0 ? (
                          <div className="p-6 text-center text-gray-400 text-sm">No announcements</div>
                        ) : (
                          announcements.map(a => {
                            const isRead = readAnnIds.has(a.id)
                            return (
                              <div key={a.id} className={`px-4 py-3 ${isRead ? 'bg-white' : 'bg-brand-50/40'}`}>
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="font-semibold text-gray-900 text-sm truncate">{a.title}</p>
                                    <p className="text-gray-500 text-xs mt-1">{a.message}</p>
                                    <p className="text-[10px] text-gray-400 mt-1">{fmtAnn(a.createdAt)}</p>
                                  </div>
                                  {!isRead && (
                                    <button
                                      onClick={() => markAnnouncementRead(a.id)}
                                      className="text-[10px] font-semibold text-brand-600 hover:text-brand-700 whitespace-nowrap"
                                    >
                                      Mark read
                                    </button>
                                  )}
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>

                {/* Live stats — Badge variant */}
                <div className="hidden md:flex items-center gap-2">
                  {LIVE_STATS.map(s => (
                    <Badge
                      key={s.label}
                      variant="outline"
                      className={`flex items-center gap-1.5 px-3 py-1.5 h-auto rounded-xl border font-semibold transition-all ${s.bg} ${s.color}`}
                    >
                      <span className="text-sm leading-none font-extrabold">{s.value}</span>
                      <span className="text-[9px] uppercase tracking-wider font-bold opacity-70">{s.label}</span>
                    </Badge>
                  ))}
                </div>
                {/* Keyboard shortcut hint */}
                <div className="hidden xl:flex items-center gap-1 text-[10px] text-gray-300">
                  <kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">A</kbd>
                  <kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">O</kbd>
                  <kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">M</kbd>
                </div>
              </div>

            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            {fetchError && (
              <Alert variant="destructive" className="mb-5">
                <AlertDescription className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2"><FaTimesCircle className="w-4 h-4" />{fetchError}</span>
                  <Button size="sm" onClick={fetchOrders} className="flex-shrink-0 gap-1.5">
                    <FaSyncAlt className="w-3 h-3" /> Retry
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            {TABS[activeTab] || null}
          </main>
        </div>

        <ConfirmModal open={!!confirm} title={confirm?.title} message={confirm?.message} confirmLabel={confirm?.confirmLabel || 'Confirm'} type={confirm?.type || 'danger'} onConfirm={confirm?.onConfirm} onCancel={() => setConfirm(null)} />
        <ProfileModal open={showProfile} restaurant={restaurant} user={user} onClose={() => setShowProfile(false)} onSaved={data => { setRestaurant(p => ({ ...p, ...data })); localStorage.setItem('owner_restaurant', JSON.stringify({ ...restaurant, ...data })) }} />
      </div>
    </TooltipProvider>
  )
}
