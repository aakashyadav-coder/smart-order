/**
 * OwnerDashboardPage — Premium restaurant management panel
 * Tabs: Analytics | Order History | Menu | QR Codes | Staff
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
  { id: 'analytics', label: 'Analytics',     icon: '📈' },
  { id: 'history',   label: 'Order History', icon: '📋' },
  { id: 'menu',      label: 'Menu',          icon: '🍽️' },
  { id: 'qr',        label: 'QR Codes',      icon: '📱' },
  { id: 'staff',     label: 'Staff',         icon: '👥' },
]
const CATEGORIES = ['Drinks', 'Starters', 'Main Course', 'Desserts']
const EMPTY_ITEM = { name: '', description: '', price: '', category: 'Main Course', imageUrl: '', available: true }
const STATUS_CFG = {
  PENDING:   { border: 'border-l-yellow-400', bg: 'bg-yellow-400/10', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  ACCEPTED:  { border: 'border-l-blue-400',   bg: 'bg-blue-400/10',   text: 'text-blue-400',   dot: 'bg-blue-400'   },
  PREPARING: { border: 'border-l-orange-400', bg: 'bg-orange-400/10', text: 'text-orange-400', dot: 'bg-orange-400' },
  COMPLETED: { border: 'border-l-green-400',  bg: 'bg-green-400/10',  text: 'text-green-400',  dot: 'bg-green-400'  },
  CANCELLED: { border: 'border-l-red-500',    bg: 'bg-red-500/10',    text: 'text-red-500',    dot: 'bg-red-500'    },
}

// ── CSV Export Utility ────────────────────────────────────────────────────────
function downloadCSV(filename, rows) {
  const escape = (v) => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  const csv = rows.map(r => r.map(escape).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a); a.click()
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url) }, 100)
}

// ── SVG Bar Chart ────────────────────────────────────────────────────────────
function BarChart({ data, labels, color = '#f97316', unit = 'Rs.' }) {
  const max = Math.max(...data, 1)
  const W = 100 / data.length
  const showEvery = data.length > 10 ? Math.ceil(data.length / 8) : 1
  return (
    <div className="relative h-48 flex flex-col gap-1 select-none">
      <svg viewBox={`0 0 ${data.length * 20} 100`} className="flex-1 w-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.85" />
            <stop offset="100%" stopColor={color} stopOpacity="0.15" />
          </linearGradient>
        </defs>
        {data.map((v, i) => {
          const h  = max > 0 ? (v / max) * 90 : 0
          const x  = i * 20 + 1
          return (
            <g key={i}>
              <rect x={x} y={100 - h} width={18} height={h}
                fill={`url(#grad-${color})`} rx={3} className="hover:opacity-100 opacity-80 transition-opacity cursor-pointer" />
              {v > 0 && (
                <title>{unit}{unit === 'Rs.' ? v.toFixed(0) : v}</title>
              )}
            </g>
          )
        })}
      </svg>
      {/* X labels */}
      <div className="flex" style={{ gap: 0 }}>
        {labels.map((l, i) => (
          <div key={i} className="text-center flex-1 text-gray-600 text-[9px] leading-tight truncate"
            style={{ display: (i % showEvery === 0 || i === labels.length - 1) ? 'block' : 'none' }}>
            {l}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Analytics Tab ─────────────────────────────────────────────────────────────
function AnalyticsTab() {
  const [range, setRange]   = useState('30d')
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.get(`/restaurant/analytics?range=${range}`)
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false))
  }, [range])

  const RANGES = [
    { id: '24h', label: 'Last 24 Hours' },
    { id: '30d', label: 'Last 30 Days'  },
    { id: '6m',  label: 'Last 6 Months' },
  ]

  const exportAnalytics = () => {
    if (!data) return
    const label = RANGES.find(r => r.id === range)?.label || range
    const rows  = [
      [`Smart Order — Analytics Export (${label})`, '', ''],
      ['Period', 'Revenue (Rs.)', 'Orders'],
      ...data.labels.map((l, i) => [l, (data.revenue[i] || 0).toFixed(2), data.counts[i] || 0]),
      [],
      ['TOTAL', (data.totalRevenue || 0).toFixed(2), data.totalOrders],
    ]
    downloadCSV(`analytics_${range}_${new Date().toISOString().slice(0,10)}.csv`, rows)
  }

  return (
    <div>
      {/* Range selector + export */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {RANGES.map(r => (
          <button key={r.id} onClick={() => setRange(r.id)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${range === r.id ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25' : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'}`}>
            {r.label}
          </button>
        ))}
        {data && (
          <button onClick={exportAnalytics}
            className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-green-900/40 border border-green-700/50 text-green-400 hover:bg-green-900/70 transition-colors">
            ⬇ Export CSV
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total Orders',  value: data.totalOrders,                     color: 'text-blue-400',  icon: '📋' },
              { label: 'Total Revenue', value: `Rs. ${(data.totalRevenue||0).toFixed(0)}`, color: 'text-green-400', icon: '💰' },
              { label: 'Avg Order',     value: data.totalOrders ? `Rs. ${(data.totalRevenue/data.totalOrders).toFixed(0)}` : '—', color: 'text-brand-400', icon: '📊' },
              { label: 'Peak',          value: (() => { const mx = Math.max(...data.revenue); const idx = data.revenue.indexOf(mx); return data.labels[idx] || '—' })(), color: 'text-purple-400', icon: '⚡' },
            ].map(s => (
              <div key={s.label} className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
                <p className="text-2xl mb-1">{s.icon}</p>
                <p className={`font-extrabold text-xl leading-none ${s.color}`}>{s.value}</p>
                <p className="text-gray-500 text-xs mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Revenue chart */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white font-bold">Revenue</h3>
                <p className="text-gray-500 text-xs mt-0.5">{RANGES.find(r => r.id === range)?.label}</p>
              </div>
              <p className="text-green-400 font-extrabold text-lg">Rs. {(data.totalRevenue||0).toFixed(0)}</p>
            </div>
            <BarChart data={data.revenue} labels={data.labels} color="#22c55e" unit="Rs." />
          </div>

          {/* Orders chart */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white font-bold">Orders</h3>
                <p className="text-gray-500 text-xs mt-0.5">{RANGES.find(r => r.id === range)?.label}</p>
              </div>
              <p className="text-brand-400 font-extrabold text-lg">{data.totalOrders} orders</p>
            </div>
            <BarChart data={data.counts} labels={data.labels} color="#f97316" unit="" />
          </div>
        </>
      ) : null}
    </div>
  )
}

// ── Order Detail Modal ────────────────────────────────────────────────────────
function OrderDetailModal({ order, onClose }) {
  if (!order) return null
  const cfg = STATUS_CFG[order.status] || STATUS_CFG.PENDING
  const fmt = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className={`px-5 py-4 ${cfg.bg} flex items-center justify-between border-b border-gray-800`}>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
            <span className={`font-extrabold text-sm ${cfg.text}`}>{order.status}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-xs font-mono">#{order.id.slice(-8).toUpperCase()}</span>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors text-sm">✕</button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Customer info */}
          <div className="px-5 py-4 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-bold">{order.customerName}</p>
                <p className="text-gray-500 text-sm">{order.phone}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-500 text-xs">Table</p>
                <p className="text-white font-extrabold text-2xl">#{order.tableNumber}</p>
              </div>
            </div>
            <p className="text-gray-600 text-xs mt-2">{fmt(order.createdAt)}</p>
          </div>

          {/* Items */}
          <div className="px-5 py-3 border-b border-gray-800">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Items Ordered</p>
            <div className="space-y-2">
              {order.items?.map(item => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-gray-800 rounded-lg flex items-center justify-center text-xs font-bold text-gray-400">×{item.quantity}</span>
                    <span className="text-white text-sm">{item.menuItem?.name}</span>
                  </div>
                  <span className="text-gray-400 text-sm font-medium">Rs. {(item.price * item.quantity).toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="px-5 py-4">
            <div className="flex items-center justify-between">
              <p className="text-gray-400 font-semibold">Total</p>
              <p className="text-white font-extrabold text-xl">Rs. {order.totalPrice}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Order History Tab ─────────────────────────────────────────────────────────
function OrderHistoryTab({ orders, loading }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedOrder, setSelectedOrder] = useState(null)

  const filtered = orders.filter(o => {
    const matchStatus = statusFilter === 'ALL' || o.status === statusFilter
    const q = search.toLowerCase()
    const matchSearch = !q || o.customerName.toLowerCase().includes(q) || o.phone.includes(q) || String(o.tableNumber).includes(q) || o.id.toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  const fmt = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })

  const exportOrders = () => {
    const rows = [
      ['Smart Order — Order History Export', '', '', '', '', '', ''],
      ['Order ID', 'Date', 'Customer', 'Phone', 'Table', 'Items', 'Total (Rs.)', 'Status'],
      ...filtered.map(o => [
        o.id,
        new Date(o.createdAt).toLocaleString('en-IN'),
        o.customerName,
        o.phone,
        o.tableNumber,
        o.items?.map(i => `${i.menuItem?.name} x${i.quantity}`).join(' | '),
        o.totalPrice,
        o.status,
      ]),
      [],
      ['', '', '', '', '', 'TOTAL REVENUE',
        filtered.filter(o => o.status !== 'CANCELLED').reduce((s, o) => s + o.totalPrice, 0).toFixed(2),
      ],
    ]
    downloadCSV(`orders_${new Date().toISOString().slice(0,10)}.csv`, rows)
  }

  return (
    <div>
      {/* Search + filter + export row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search by name, phone or table…"
            className="input bg-gray-900 border-gray-800 text-white placeholder-gray-600 pl-9 focus:ring-brand-500 focus:border-brand-500"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input bg-gray-900 border-gray-800 text-white w-full sm:w-44 focus:ring-brand-500"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          {['ALL','PENDING','ACCEPTED','PREPARING','COMPLETED','CANCELLED'].map(s => (
            <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s}</option>
          ))}
        </select>
        <button onClick={exportOrders}
          disabled={filtered.length === 0}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-green-900/40 border border-green-700/50 text-green-400 hover:bg-green-900/70 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0">
          ⬇ Export CSV
        </button>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-3 mb-5 text-xs text-gray-500">
        <span className="bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-full">
          {filtered.length} order{filtered.length !== 1 ? 's' : ''}
        </span>
        <span className="bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-full text-green-400">
          Revenue: Rs. {filtered.filter(o=>o.status!=='CANCELLED').reduce((s,o)=>s+o.totalPrice,0).toFixed(0)}
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center text-3xl border border-gray-800 mb-4">🔍</div>
          <p className="text-white font-bold">No orders found</p>
          <p className="text-gray-600 text-sm mt-1">Try a different search or filter</p>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          {filtered.map((o, i) => {
            const cfg = STATUS_CFG[o.status] || STATUS_CFG.PENDING
            return (
              <button
                key={o.id}
                onClick={() => setSelectedOrder(o)}
                className={`w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-800/60 transition-colors border-l-4 ${cfg.border} ${i > 0 ? 'border-t border-gray-800' : ''}`}
              >
                {/* Status dot */}
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white font-semibold text-sm">{o.customerName}</p>
                    <span className="text-gray-700">·</span>
                    <span className="text-gray-400 text-xs">Table #{o.tableNumber}</span>
                    <span className="text-gray-700">·</span>
                    <span className="text-gray-500 text-xs">{o.items?.length} item{o.items?.length !== 1 ? 's' : ''}</span>
                  </div>
                  <p className="text-gray-600 text-xs mt-0.5">{fmt(o.createdAt)}</p>
                </div>

                {/* Right side */}
                <div className="flex-shrink-0 text-right">
                  <p className="text-white font-bold text-sm">Rs. {o.totalPrice}</p>
                  <span className={`text-xs font-semibold ${cfg.text}`}>{o.status}</span>
                </div>

                <span className="text-gray-700 text-xs flex-shrink-0">›</span>
              </button>
            )
          })}
        </div>
      )}

      {selectedOrder && <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
    </div>
  )
}

// ── Menu Tab with Search ──────────────────────────────────────────────────────
function MenuTab({ restaurantId, onDeleteItem }) {
  const [items, setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [form, setForm]     = useState(EMPTY_ITEM)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!restaurantId) return
    api.get(`/menu?restaurantId=${restaurantId}`)
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
        toast.success('Item added!')
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

  // Filter items by search
  const filteredItems = search
    ? items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase()))
    : items

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Add/Edit form */}
      <div className="lg:col-span-1">
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 sticky top-24">
          <h3 className="font-bold text-white mb-4">{editId ? '✏️ Edit Item' : '➕ Add Item'}</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input required placeholder="Item name *" className="input bg-gray-800 border-gray-700 text-white placeholder-gray-600 text-sm focus:ring-brand-500 focus:border-brand-500"
              value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} />
            <input type="number" required min="0" step="0.01" placeholder="Price (Rs.) *"
              className="input bg-gray-800 border-gray-700 text-white placeholder-gray-600 text-sm focus:ring-brand-500 focus:border-brand-500"
              value={form.price} onChange={e => setForm(p => ({...p, price: e.target.value}))} />
            <textarea placeholder="Description (optional)" rows={2}
              className="input bg-gray-800 border-gray-700 text-white placeholder-gray-600 text-sm resize-none focus:ring-brand-500 focus:border-brand-500"
              value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} />
            <select className="input bg-gray-800 border-gray-700 text-white text-sm"
              value={form.category} onChange={e => setForm(p => ({...p, category: e.target.value}))}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <input placeholder="Image URL (optional)" className="input bg-gray-800 border-gray-700 text-white placeholder-gray-600 text-sm focus:ring-brand-500 focus:border-brand-500"
              value={form.imageUrl} onChange={e => setForm(p => ({...p, imageUrl: e.target.value}))} />
            <div className="flex gap-2 pt-1">
              {editId && <button type="button" onClick={cancelEdit} className="btn-secondary flex-1 py-2.5 text-sm">Cancel</button>}
              <button type="submit" disabled={saving} className="btn-primary flex-1 py-2.5 text-sm disabled:opacity-50">
                {saving ? 'Saving…' : editId ? 'Update' : 'Add Item'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Items list with search */}
      <div className="lg:col-span-2">
        {/* Search bar */}
        <div className="relative mb-4">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search menu items or categories…"
            className="input bg-gray-900 border-gray-800 text-white placeholder-gray-600 pl-9 focus:ring-brand-500 focus:border-brand-500"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-sm">✕</button>
          )}
        </div>
        <p className="text-gray-600 text-xs mb-3">{filteredItems.length} of {items.length} items</p>

        <div className="space-y-3">
          {CATEGORIES.map(cat => {
            const catItems = filteredItems.filter(i => i.category === cat)
            if (!catItems.length) return null
            return (
              <div key={cat} className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-800/60 border-b border-gray-800 flex items-center justify-between">
                  <p className="text-white font-bold text-sm">{cat}</p>
                  <span className="text-gray-500 text-xs">{catItems.length}</span>
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
                      <button onClick={() => toggleAvailable(item)}
                        className={`text-[10px] px-2 py-1 rounded-lg font-bold transition-colors ${item.available ? 'bg-green-900/40 text-green-400 hover:bg-green-900/70' : 'bg-gray-800 text-gray-500 hover:bg-gray-700'}`}>
                        {item.available ? 'ON' : 'OFF'}
                      </button>
                      <button onClick={() => startEdit(item)} className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors text-xs">✏️</button>
                      <button onClick={() => onDeleteItem(item, (id) => setItems(p => p.filter(i => i.id !== id)))}
                        className="p-1.5 rounded-lg bg-red-900/30 hover:bg-red-900/60 text-red-400 transition-colors text-xs">🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
          {filteredItems.length === 0 && (
            <div className="text-center py-12 text-gray-500">{search ? 'No results for that search.' : 'No menu items yet.'}</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── QR Tab ───────────────────────────────────────────────────────────────────
function QRTab({ restaurantId }) {
  const [baseUrl, setBaseUrl] = useState(window.location.origin)
  const [tables, setTables]   = useState(10)

  const qrUrl = (table) =>
    restaurantId
      ? `${baseUrl}/menu?table=${table}&rid=${restaurantId}`
      : `${baseUrl}/menu?table=${table}`

  return (
    <div>
      <div className="flex flex-wrap gap-4 mb-4 items-end">
        <div><label className="label text-sm text-gray-300">Base URL</label>
          <input className="input bg-gray-800 border-gray-700 text-white w-72 text-sm" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} /></div>
        <div><label className="label text-sm text-gray-300">Tables</label>
          <input type="number" min={1} max={100} className="input bg-gray-800 border-gray-700 text-white w-24 text-sm"
            value={tables} onChange={e => setTables(parseInt(e.target.value) || 1)} /></div>
        <button onClick={() => window.print()} className="btn-primary px-5 py-2.5 text-sm print:hidden">🖨️ Print All</button>
      </div>
      <p className="text-gray-600 text-xs mb-4">
        Each QR includes your restaurant ID — customers see your logo, name and table number automatically.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
        {Array.from({ length: tables }, (_, i) => i + 1).map(t => (
          <div key={t} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col items-center gap-2 hover:border-gray-700 transition-colors">
            <p className="text-white font-extrabold text-sm">Table {t}</p>
            <div className="bg-white p-2 rounded-xl"><QRCodeSVG value={qrUrl(t)} size={96} /></div>
            <p className="text-gray-600 text-[9px] text-center break-all">/menu?table={t}&rid=…</p>
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
                <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">{u.name[0].toUpperCase()}</div>
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

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function OwnerDashboardPage() {
  const { user, logout, loading: authLoading } = useAuth()
  const navigate          = useNavigate()

  // Tab persisted across refresh
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('owner_active_tab') || 'analytics')
  const changeTab = (id) => { setActiveTab(id); localStorage.setItem('owner_active_tab', id) }
  const [orders, setOrders]             = useState([])
  const [loading, setLoading]           = useState(true)
  const [fetchError, setFetchError]     = useState(null)
  // Instantly show cached branding from localStorage
  const [restaurant, setRestaurant]     = useState(() => {
    try { return JSON.parse(localStorage.getItem('owner_restaurant') || 'null') || { name: 'Restaurant', logoUrl: null } }
    catch { return { name: 'Restaurant', logoUrl: null } }
  })
  const [logoError, setLogoError]       = useState(false)
  const [confirm, setConfirm]           = useState(null)
  const [pendingCount, setPendingCount] = useState(0)
  const badgeRef = useRef(null)

  // Load orders with retry support
  const fetchOrders = useCallback(async () => {
    try {
      setFetchError(null)
      const res = await api.get('/orders')
      setOrders(res.data)
      setPendingCount(res.data.filter(o => o.status === 'PENDING').length)
    } catch (err) {
      setFetchError(err.message || 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [])

  // Single stable load — runs once after auth fully resolves
  useEffect(() => {
    if (authLoading) return
    fetchOrders()
    api.get('/restaurant/mine').then(r => {
      const data = { name: r.data.name, logoUrl: r.data.logoUrl }
      setRestaurant(data)
      setLogoError(false)
      localStorage.setItem('owner_restaurant', JSON.stringify(data))
    }).catch(() => {})
  }, [authLoading, fetchOrders])

  // Socket
  useEffect(() => {
    socket.emit('join_kitchen')
    if (user?.restaurantId) socket.emit('join_restaurant', { restaurantId: user.restaurantId })

    const onNewOrder = (order) => {
      setOrders(prev => prev.find(o => o.id === order.id) ? prev : [order, ...prev])
      setPendingCount(n => n + 1)
      clearTimeout(badgeRef.current)
      toast.success(`🆕 New order — Table #${order.tableNumber}!`, { duration: 6000 })
    }
    const onStatus    = ({ orderId, status }) => {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
      if (status !== 'PENDING') setPendingCount(n => Math.max(0, n - 1))
    }
    const onBranding  = (data) => {
      const branding = { name: data.name, logoUrl: data.logoUrl }
      setRestaurant(branding)
      setLogoError(false)
      localStorage.setItem('owner_restaurant', JSON.stringify(branding))
      toast.success(`Branding updated: "${data.name}"`, { icon: '✨' })
    }

    socket.on('new_order', onNewOrder)
    socket.on('order_status_update', onStatus)
    socket.on('restaurant_updated', onBranding)
    return () => { socket.off('new_order', onNewOrder); socket.off('order_status_update', onStatus); socket.off('restaurant_updated', onBranding) }
  }, [user])

  const askDeleteItem = (item, onSuccess) => setConfirm({
    title: 'Delete Menu Item?',
    message: `Permanently delete "${item.name}"?`,
    onConfirm: async () => {
      try { await api.delete(`/menu/${item.id}`); onSuccess(item.id); toast.success('Deleted') }
      catch (err) { toast.error(err.message) }
      finally { setConfirm(null) }
    },
    type: 'danger', confirmLabel: 'Delete',
  })

  const askLogout = () => setConfirm({ title: 'Sign Out?', message: 'Sign out of the Owner Portal?', onConfirm: () => { logout(); navigate('/owner/login') }, type: 'danger', confirmLabel: 'Sign Out' })

  const totalRevenue = orders.filter(o => o.status !== 'CANCELLED').reduce((s, o) => s + o.totalPrice, 0)

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-30 flex-shrink-0">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Logo (real-time) */}
          <div className="flex items-center gap-3 min-w-0">
            {restaurant.logoUrl && !logoError
              ? <img src={restaurant.logoUrl} alt="logo"
                  className="w-9 h-9 rounded-xl object-cover ring-2 ring-gray-700 flex-shrink-0"
                  onError={() => setLogoError(true)} />
              : <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-orange-600 rounded-xl flex items-center justify-center text-lg flex-shrink-0">🏢</div>
            }
            <div className="min-w-0">
              <p className="text-white font-extrabold text-sm leading-none truncate">{restaurant.name}</p>
              <p className="text-gray-500 text-xs mt-0.5">Owner Portal</p>
            </div>
          </div>

          {/* Stats summary */}
          <div className="hidden md:flex items-center gap-3">
            {[
              { label: 'Orders',  v: orders.length,          color: 'text-brand-400'  },
              { label: 'Revenue', v: `Rs.${totalRevenue.toFixed(0)}`, color: 'text-green-400' },
            ].map(s => (
              <div key={s.label} className="text-center px-3 py-1.5 bg-gray-800/60 rounded-xl">
                <p className={`font-extrabold text-base leading-none ${s.color}`}>{s.v}</p>
                <p className="text-gray-600 text-[9px] mt-0.5 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden sm:block text-right">
              <p className="text-white text-xs font-semibold">{user?.name}</p>
              <p className="text-gray-600 text-[10px]">Owner</p>
            </div>
            <button onClick={askLogout} className="text-xs text-gray-500 hover:text-red-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-800">Sign out</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 pb-3 flex gap-1 overflow-x-auto">
          {TABS.map(t => {
            const showBadge = t.id === 'history' && pendingCount > 0
            return (
              <button key={t.id} onClick={() => { changeTab(t.id); if (t.id === 'history') setPendingCount(0) }}
                className={`relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeTab === t.id ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                {showBadge && (
                  <span className="absolute -top-1.5 -right-1 flex h-5 w-5 items-center justify-center">
                    <span className="animate-ping absolute h-full w-full rounded-full bg-red-400 opacity-60" />
                    <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 text-white text-[9px] font-black items-center justify-center">{pendingCount}</span>
                  </span>
                )}
                <span>{t.icon}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            )
          })}
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-5">
        {/* Error banner */}
        {fetchError && (
          <div className="mb-4 bg-red-900/30 border border-red-700/50 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-red-300 text-sm">
              <span>⚠️</span>
              <span>{fetchError}</span>
            </div>
            <button onClick={fetchOrders} className="text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0">
              Retry
            </button>
          </div>
        )}
        {activeTab === 'analytics' && <AnalyticsTab />}
        {activeTab === 'history'   && <OrderHistoryTab orders={orders} loading={loading} />}
        {activeTab === 'menu'      && <MenuTab restaurantId={user?.restaurantId} onDeleteItem={askDeleteItem} />}
        {activeTab === 'qr'        && <QRTab restaurantId={user?.restaurantId} />}
        {activeTab === 'staff'     && <StaffTab restaurantId={user?.restaurantId} />}
      </main>

      {confirm && (
        <ConfirmModal open title={confirm.title} message={confirm.message}
          confirmLabel={confirm.confirmLabel || 'Confirm'} type={confirm.type || 'danger'}
          onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />
      )}
    </div>
  )
}
