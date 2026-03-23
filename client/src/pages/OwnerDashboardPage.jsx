/**
 * OwnerDashboardPage — restaurant owner management panel
 * Features: Orders, Menu Management, QR Codes, Staff Overview
 */
import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { QRCodeSVG } from 'qrcode.react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import socket from '../lib/socket'
import KitchenOrderCard from '../components/KitchenOrderCard'

const TABS = [
  { id: 'orders',  label: 'Orders',        icon: '📋' },
  { id: 'menu',    label: 'Menu',          icon: '🍽️' },
  { id: 'qr',      label: 'QR Codes',      icon: '📱' },
  { id: 'staff',   label: 'Staff',         icon: '👥' },
]

// ── Menu Item Form ─────────────────────────────────────────────────────────────
const CATEGORIES = ['Drinks', 'Starters', 'Main Course', 'Desserts']
const EMPTY_ITEM = { name: '', description: '', price: '', category: 'Main Course', imageUrl: '', available: true }

function MenuTab({ restaurantId }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_ITEM)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get(`/menu?restaurantId=${restaurantId}`)
      .then(r => setItems(r.data.items || []))
      .finally(() => setLoading(false))
  }, [restaurantId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, price: parseFloat(form.price), restaurantId }
      if (editId) {
        const res = await api.put(`/menu/${editId}`, payload)
        setItems(p => p.map(i => i.id === editId ? res.data : i))
        toast.success('Item updated!')
      } else {
        const res = await api.post('/menu', payload)
        setItems(p => [...p, res.data])
        toast.success('Item added!')
      }
      setForm(EMPTY_ITEM)
      setEditId(null)
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

  const deleteItem = async (id) => {
    if (!window.confirm('Delete this menu item?')) return
    try {
      await api.delete(`/menu/${id}`)
      setItems(p => p.filter(i => i.id !== id))
      toast.success('Deleted')
    } catch (err) { toast.error(err.message) }
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Form */}
      <div className="lg:col-span-1">
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
          <h3 className="font-bold text-white mb-4">{editId ? '✏️ Edit Item' : '➕ Add Menu Item'}</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input required placeholder="Item name" className="input bg-gray-800 border-gray-700 text-white placeholder-gray-600 text-sm" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} />
            <textarea placeholder="Description (optional)" rows={2} className="input bg-gray-800 border-gray-700 text-white placeholder-gray-600 text-sm resize-none" value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} />
            <input required type="number" min="0" step="0.01" placeholder="Price (Rs.)" className="input bg-gray-800 border-gray-700 text-white placeholder-gray-600 text-sm" value={form.price} onChange={e => setForm(p => ({...p, price: e.target.value}))} />
            <select className="input bg-gray-800 border-gray-700 text-white text-sm" value={form.category} onChange={e => setForm(p => ({...p, category: e.target.value}))}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <input placeholder="Image URL (optional)" className="input bg-gray-800 border-gray-700 text-white placeholder-gray-600 text-sm" value={form.imageUrl} onChange={e => setForm(p => ({...p, imageUrl: e.target.value}))} />
            <div className="flex gap-2">
              {editId && <button type="button" onClick={cancelEdit} className="btn-secondary flex-1 py-2 text-sm">Cancel</button>}
              <button type="submit" disabled={saving} className="btn-primary flex-1 py-2 text-sm disabled:opacity-50">
                {saving ? 'Saving…' : editId ? 'Update' : 'Add Item'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Items list */}
      <div className="lg:col-span-2 space-y-2">
        {CATEGORIES.map(cat => {
          const catItems = items.filter(i => i.category === cat)
          if (!catItems.length) return null
          return (
            <div key={cat} className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-800/50 border-b border-gray-800">
                <p className="text-white font-semibold text-sm">{cat}</p>
              </div>
              {catItems.map(item => (
                <div key={item.id} className={`flex items-center gap-3 px-4 py-3 border-b border-gray-800/50 last:border-0 ${!item.available ? 'opacity-50' : ''}`}>
                  {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{item.name}</p>
                    <p className="text-gray-500 text-xs">Rs. {item.price}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => toggleAvailable(item)} className={`text-xs px-2 py-1 rounded-lg ${item.available ? 'bg-green-900/40 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                      {item.available ? '✓ On' : '✗ Off'}
                    </button>
                    <button onClick={() => startEdit(item)} className="text-xs p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">✏️</button>
                    <button onClick={() => deleteItem(item.id)} className="text-xs p-1.5 rounded-lg bg-red-900/30 hover:bg-red-900/60 text-red-400 transition-colors">🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )
        })}
        {items.length === 0 && <div className="text-center py-12 text-gray-500">No menu items yet. Add one!</div>}
      </div>
    </div>
  )
}

// ── QR Tab ─────────────────────────────────────────────────────────────────────
function QRTab() {
  const [baseUrl, setBaseUrl] = useState(window.location.origin)
  const [tables, setTables] = useState(10)

  return (
    <div>
      <div className="flex flex-wrap gap-4 mb-6 items-end">
        <div>
          <label className="label text-sm">Base URL</label>
          <input className="input bg-gray-800 border-gray-700 text-white w-72 text-sm" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} />
        </div>
        <div>
          <label className="label text-sm">Tables</label>
          <input type="number" min={1} max={100} className="input bg-gray-800 border-gray-700 text-white w-24 text-sm" value={tables} onChange={e => setTables(parseInt(e.target.value) || 1)} />
        </div>
        <button onClick={() => window.print()} className="btn-primary px-5 py-2.5 text-sm">🖨️ Print All</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 print:grid-cols-5">
        {Array.from({ length: tables }, (_, i) => i + 1).map(t => (
          <div key={t} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col items-center gap-2 print:break-inside-avoid">
            <p className="text-white font-bold text-sm">Table {t}</p>
            <QRCodeSVG value={`${baseUrl}/menu?table=${t}`} size={100} bgColor="transparent" fgColor="white" />
            <p className="text-gray-600 text-xs text-center break-all">/menu?table={t}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Staff Tab ──────────────────────────────────────────────────────────────────
function StaffTab({ restaurantId }) {
  const [users, setUsers] = useState([])
  useEffect(() => {
    api.get(`/super/users?restaurantId=${restaurantId}`).then(r => setUsers(r.data)).catch(() => {})
  }, [restaurantId])
  const ROLE_COLORS = { OWNER: 'badge-accepted', KITCHEN: 'badge-preparing', ADMIN: 'badge-pending' }
  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden max-w-2xl">
      {users.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No staff members found</div>
      ) : users.map(u => (
        <div key={u.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-800 last:border-0">
          <div className="w-9 h-9 bg-brand-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{u.name[0]}</div>
          <div className="flex-1">
            <p className="text-white font-medium text-sm">{u.name}</p>
            <p className="text-gray-500 text-xs">{u.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`badge text-xs ${ROLE_COLORS[u.role]}`}>{u.role}</span>
            <span className={`badge text-xs ${u.active ? 'badge-completed' : 'badge-cancelled'}`}>{u.active ? 'Active' : 'Inactive'}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function OwnerDashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('orders')
  const [orders, setOrders] = useState([])
  const [filter, setFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)

  const fetchOrders = useCallback(async () => {
    try {
      const res = await api.get('/orders')
      setOrders(res.data)
    } catch (err) { toast.error('Failed to load orders') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchOrders()
    socket.emit('join_kitchen')
    socket.on('new_order', (order) => {
      setOrders(prev => [order, ...prev.filter(o => o.id !== order.id)])
      toast('🔔 New order arrived!', { icon: '🍽️' })
    })
    socket.on('order_status_update', ({ orderId, status }) => {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
    })
    return () => { socket.off('new_order'); socket.off('order_status_update') }
  }, [fetchOrders])

  const handleStatusUpdate = async (orderId, status) => {
    try {
      const res = await api.put(`/orders/${orderId}/status`, { status })
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...res.data } : o))
      toast.success(`Order marked as ${status}`)
    } catch (err) { toast.error(err.message) }
  }

  const filteredOrders = filter === 'ALL' ? orders : orders.filter(o => o.status === filter)

  const stats = {
    pending:   orders.filter(o => o.status === 'PENDING').length,
    active:    orders.filter(o => ['ACCEPTED','PREPARING'].includes(o.status)).length,
    completed: orders.filter(o => o.status === 'COMPLETED').length,
    revenue:   orders.filter(o => o.status !== 'CANCELLED').reduce((s, o) => s + o.totalPrice, 0),
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Top Nav */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-orange-600 rounded-xl flex items-center justify-center text-sm">🏢</div>
          <div>
            <p className="text-white font-bold text-sm leading-none">Owner Portal</p>
            <p className="text-gray-500 text-xs">{user?.name}</p>
          </div>
        </div>
        <button onClick={() => { logout(); navigate('/owner/login') }} className="text-xs text-gray-500 hover:text-red-400 transition-colors">Sign out</button>
      </header>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-4 sm:px-6 py-4">
        {[
          { label: 'Pending',   value: stats.pending,              color: 'text-yellow-400' },
          { label: 'In Progress', value: stats.active,             color: 'text-blue-400'   },
          { label: 'Completed', value: stats.completed,            color: 'text-green-400'  },
          { label: 'Revenue',   value: `Rs. ${stats.revenue.toFixed(0)}`, color: 'text-brand-400' },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 rounded-xl border border-gray-800 px-4 py-3">
            <p className="text-gray-500 text-xs">{s.label}</p>
            <p className={`font-extrabold text-lg ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="px-4 sm:px-6 mb-5">
        <div className="flex gap-1 bg-gray-900 p-1 rounded-xl border border-gray-800 w-fit">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${activeTab === t.id ? 'bg-brand-500 text-white shadow' : 'text-gray-400 hover:text-white'}`}>
              <span>{t.icon}</span><span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-4 sm:px-6 pb-10">
        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div>
            <div className="flex flex-wrap gap-2 mb-5">
              {['ALL','PENDING','ACCEPTED','PREPARING','COMPLETED','CANCELLED'].map(s => (
                <button key={s} onClick={() => setFilter(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${filter===s ? 'bg-brand-500 text-white' : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'}`}>
                  {s}
                </button>
              ))}
            </div>
            {loading ? (
              <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-20 text-gray-500">No orders</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredOrders.map(order => (
                  <KitchenOrderCard key={order.id} order={order} onStatusUpdate={handleStatusUpdate} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Menu Tab */}
        {activeTab === 'menu' && <MenuTab restaurantId={user?.restaurantId} />}

        {/* QR Tab */}
        {activeTab === 'qr' && <QRTab />}

        {/* Staff Tab */}
        {activeTab === 'staff' && <StaffTab restaurantId={user?.restaurantId} />}
      </div>
    </div>
  )
}
