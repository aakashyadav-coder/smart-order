/**
 * CentralDashboardPage — Multi-branch owner central command center
 * Premium obsidian dark sidebar + tabbed dashboard
 * Tabs: Overview · Branch Sales · Live Orders · Branches · Staff
 */
import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import api from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import socket from '../../lib/socket'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import {
  FaBuilding, FaSignOutAlt, FaChartLine, FaClipboardList,
  FaUsers, FaStore, FaBars, FaTimes, FaLayerGroup,
  FaChevronDown, FaEdit, FaTrash, FaCheckCircle, FaTimesCircle, FaCog,
  FaChartBar, FaFileAlt, FaHistory, FaLock, FaPlus, FaDownload, FaPrint,
  FaToggleOn, FaToggleOff, FaFilter, FaBell
} from 'react-icons/fa'
import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react'

// ── Color palette for branches ─────────────────────────────────────────────────
const BRANCH_COLORS = [
  '#8b5cf6', '#06b6d4', '#f97316', '#22c55e', '#e11d48',
  '#3b82f6', '#f59e0b', '#ec4899', '#10b981', '#6366f1'
]

const NAV_GROUPS_CENTRAL = [
  {
    label: 'Navigation',
    items: [
      { id: 'overview', label: 'Overview', icon: FaChartLine, shortcut: 'O' },
      { id: 'sales', label: 'Branch Sales', icon: TrendingUp, shortcut: 'S' },
      { id: 'orders', label: 'Live Orders', icon: FaClipboardList, shortcut: 'L' },
      { id: 'branches', label: 'My Branches', icon: FaStore, shortcut: 'B' },
      { id: 'staff', label: 'Staff', icon: FaUsers, shortcut: 'T' },
    ],
  },
  {
    label: 'Management',
    items: [
      { id: 'reports', label: 'Reports', icon: FaFileAlt, shortcut: 'R' },
      { id: 'audit', label: 'Audit Log', icon: FaHistory, shortcut: 'U' },
    ],
  },
]

// Flat list for shortcut handler & active nav lookup
const NAV_ITEMS = NAV_GROUPS_CENTRAL.flatMap(g => g.items)

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtRs(v) {
  if (v >= 100000) return `Rs. ${(v / 100000).toFixed(1)}L`
  if (v >= 1000) return `Rs. ${(v / 1000).toFixed(1)}K`
  return `Rs. ${(v || 0).toLocaleString()}`
}
function fmtDate(d) {
  return new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, iconBg, trend }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend != null && (
          <span className={`text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 ${trend > 0 ? 'bg-green-50 text-green-700' :
            trend < 0 ? 'bg-red-50 text-red-600' :
              'bg-gray-50 text-gray-500'
            }`}>
            {trend > 0 ? <TrendingUp className="w-3 h-3" /> : trend < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-extrabold text-gray-900 leading-none mb-1">{value}</p>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

// ── Status badge helper ────────────────────────────────────────────────────────
const STATUS_STYLES = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  ACCEPTED: 'bg-blue-50 text-blue-700 border-blue-200',
  PREPARING: 'bg-brand-50 text-brand-700 border-brand-200',
  SERVED: 'bg-green-50 text-green-700 border-green-200',
  CANCELLED: 'bg-red-50 text-red-600 border-red-200',
  PAID: 'bg-green-50 text-green-700 border-green-200',
}

// ── Sidebar component ──────────────────────────────────────────────────────────
function Sidebar({ activeTab, onChange, user, pendingCount, onLogout, onProfile, onClose }) {
  return (
    <div className="flex flex-col h-full" style={{ background: 'linear-gradient(180deg, #030712 0%, #0f172a 50%, #030712 100%)' }}>

      {/* Brand */}
      <div className="p-5 border-b border-white/[0.08] flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl flex items-center justify-center shadow-lg shadow-brand-600/25 flex-shrink-0">
            <FaLayerGroup className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold text-white text-sm leading-none truncate">Central Admin</p>
            <p className="text-brand-400 text-[11px] font-semibold mt-0.5 uppercase tracking-wider">Multi-Branch Dashboard</p>
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
        {NAV_GROUPS_CENTRAL.map(group => (
          <div key={group.label}>
            <p className="nav-section-label">{group.label}</p>
            <div className="space-y-0.5 mb-1">
              {group.items.map(({ id, label, icon: Icon, shortcut }) => {
                const isActive = activeTab === id
                const showBadge = id === 'orders' && pendingCount > 0
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

      {/* Footer — matching owner: Edit Profile + Sign Out */}
      <div className="p-3 space-y-1">
        {onProfile && (
          <Button
            variant="ghost"
            onClick={onProfile}
            className="w-full justify-start gap-3 text-gray-400 hover:text-white hover:bg-white/[0.08] font-semibold text-sm h-9"
          >
            <FaCog className="w-4 h-4" />
            Edit Profile
          </Button>
        )}
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

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({ summary, branches }) {
  if (!summary) return <div className="flex items-center justify-center h-48"><Loader2 className="animate-spin text-brand-500 w-8 h-8" /></div>
  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Revenue" value={fmtRs(summary.totalRevenue)} sub={`Today: ${fmtRs(summary.todayRevenue)}`} icon={TrendingUp} iconBg="bg-gradient-to-br from-brand-500 to-brand-700" />
        <KpiCard label="Live Orders" value={summary.pendingOrders} sub="Currently pending" icon={FaClipboardList} iconBg="bg-gradient-to-br from-amber-500 to-orange-600" />
        <KpiCard label="Active Branches" value={`${summary.activeBranches} / ${summary.branchCount}`} sub="Online now" icon={FaStore} iconBg="bg-gradient-to-br from-green-500 to-teal-600" />
        <KpiCard label="Total Staff" value={summary.totalStaff} sub="Kitchen + Owners" icon={FaUsers} iconBg="bg-gradient-to-br from-blue-500 to-indigo-600" />
      </div>



      {/* Analytics embedded */}
      <div className="pt-6 border-t border-gray-100 mt-6">
        <AdvancedAnalyticsTab branches={branches} />
      </div>
    </div>
  )
}

// ── Branch Sales Tab ──────────────────────────────────────────────────────────
function BranchSalesTab({ branches }) {
  const [range, setRange] = useState('24h')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(`/central/analytics?range=${range}`)
      setData(res.data)
    } catch (e) { toast.error('Failed to load analytics') }
    finally { setLoading(false) }
  }, [range])

  useEffect(() => { fetchAnalytics() }, [fetchAnalytics])

  const chartData = useMemo(() => {
    if (!data) return []
    return data.labels.map((label, i) => {
      let formattedLabel = label;
      if (range === '24h' && typeof label === 'string' && label.includes(':00')) {
        const hr = parseInt(label.split(':')[0], 10);
        const ampm = hr >= 12 ? 'PM' : 'AM';
        const h12 = hr % 12 || 12;
        formattedLabel = `${h12} ${ampm}`;
      }
      const point = { label: formattedLabel }
      data.branches.forEach(b => { point[b.name] = b.revenue[i] })
      return point
    })
  }, [data, range])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
          <TrendingUp className="text-brand-500 w-4 h-4" /> Branch-wise Revenue
        </h2>
        <div className="flex gap-2">
          {['24h', '30d', '6m'].map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${range === r ? 'bg-brand-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {r === '24h' ? '24 Hours' : r === '30d' ? '30 Days' : '6 Months'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-brand-500 w-8 h-8" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {chartData.length > 0 && data?.branches?.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  {data.branches.map((b, i) => (
                    <linearGradient key={b.id} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={BRANCH_COLORS[i % BRANCH_COLORS.length]} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={BRANCH_COLORS[i % BRANCH_COLORS.length]} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                <Tooltip
                  contentStyle={{ background: '#1e1b4b', border: 'none', borderRadius: 12, color: '#fff', fontSize: 12 }}
                  formatter={(v, name) => [fmtRs(v), name]} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                {data.branches.map((b, i) => (
                  <Area key={b.id} type="monotone" dataKey={b.name}
                    stroke={BRANCH_COLORS[i % BRANCH_COLORS.length]}
                    fill={`url(#grad-${i})`}
                    strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <TrendingUp className="w-12 h-12 mb-3 opacity-20" />
              <p className="font-semibold">No revenue data for this period</p>
            </div>
          )}
        </div>
      )}

      {/* Summary table */}
      {data?.branches?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="font-bold text-gray-900 text-sm">Branch Summary</p>
          </div>
          <div className="divide-y divide-gray-50">
            {data.branches.map((b, i) => (
              <div key={b.id} className="flex items-center gap-4 px-5 py-3">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: BRANCH_COLORS[i % BRANCH_COLORS.length] }} />
                <span className="font-semibold text-gray-900 text-sm flex-1 truncate">
                  {b.branchName ? `${b.name} - ${b.branchName}` : b.name}
                </span>
                <span className="font-extrabold text-brand-600 text-sm">{fmtRs(b.totalRevenue)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Live Orders Tab ───────────────────────────────────────────────────────────
function LiveOrdersTab({ orders, loading, branches }) {
  const [branchFilter, setBranchFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = useMemo(() => {
    return orders.filter(o => {
      if (branchFilter !== 'all' && o.restaurantId !== branchFilter) return false
      if (statusFilter !== 'all' && o.status !== statusFilter) return false
      return true
    })
  }, [orders, branchFilter, statusFilter])

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="font-extrabold text-gray-900 text-base flex items-center gap-2 flex-1">
          <FaClipboardList className="text-brand-500 w-4 h-4" /> Live Orders
          {orders.filter(o => o.status === 'PENDING').length > 0 && (
            <span className="relative flex h-5 w-auto px-2 items-center justify-center">
              <span className="animate-ping absolute inset-0 rounded-full bg-amber-400 opacity-40" />
              <span className="relative bg-amber-500 text-white text-[9px] font-black rounded-full px-2 py-0.5">
                {orders.filter(o => o.status === 'PENDING').length} pending
              </span>
            </span>
          )}
        </h2>
        {/* Branch filter */}
        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="w-[180px] bg-white rounded-xl border-gray-200 h-9 font-semibold text-gray-700 text-sm">
            <SelectValue placeholder="All Branches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {/* Status filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] bg-white rounded-xl border-gray-200 h-9 font-semibold text-gray-700 text-sm">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {['PENDING', 'ACCEPTED', 'PREPARING', 'SERVED', 'PAID', 'CANCELLED'].map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="animate-spin text-brand-500 w-8 h-8" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
          <FaClipboardList className="w-12 h-12 mb-3 opacity-20" />
          <p className="font-semibold">No orders found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.slice(0, 50).map(order => (
            <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="font-extrabold text-gray-900 text-sm">#{order.tableNumber} — {order.customerName}</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLES[order.status] || 'bg-gray-50 text-gray-500'}`}>
                    {order.status}
                  </span>
                  <span className="text-[11px] text-gray-400 font-semibold">
                    {order.restaurant?.branchName ? `${order.restaurant.name} - ${order.restaurant.branchName}` : (order.restaurant?.name || 'Unknown')}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate">
                  {order.items?.map(i => `${i.menuItem?.name} ×${i.quantity}`).join(' · ')}
                </p>
                <p className="text-[11px] text-gray-400 mt-1">{fmtDate(order.createdAt)}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-extrabold text-brand-700 text-sm">{fmtRs(order.discountedTotal ?? order.totalPrice)}</p>
                <p className="text-[11px] text-gray-400">{order.phone}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Branches Tab ──────────────────────────────────────────────────────────────
function BranchesTab({ branches, loading }) {
  return (
    <div className="space-y-5">
      <h2 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
        <FaStore className="text-brand-500 w-4 h-4" /> My Branches ({branches.length})
      </h2>
      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="animate-spin text-brand-500 w-8 h-8" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {branches.map((b, i) => (
            <div key={b.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-lg transition-all duration-200">
              {/* Header stripe */}
              <div className="h-2" style={{ background: BRANCH_COLORS[i % BRANCH_COLORS.length] }} />
              <div className="p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: BRANCH_COLORS[i % BRANCH_COLORS.length] + '18' }}>
                    {b.logoUrl
                      ? <img src={b.logoUrl} alt="" className="w-full h-full rounded-xl object-cover" onError={e => e.target.style.display = 'none'} />
                      : <FaBuilding style={{ color: BRANCH_COLORS[i % BRANCH_COLORS.length] }} className="w-5 h-5" />
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold text-gray-900 text-sm truncate">{b.branchName ? `${b.name} - ${b.branchName}` : b.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{b.address || 'No address set'}</p>
                    <p className="text-xs text-gray-400">{b.phone || ''}</p>
                  </div>
                  <span className={`flex-shrink-0 text-[10px] font-extrabold px-2 py-1 rounded-full ${b.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {b.active ? '● LIVE' : '○ OFFLINE'}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { l: 'Revenue', v: fmtRs(b.totalRevenue) },
                    { l: 'Orders', v: b._count?.orders || 0 },
                    { l: 'Menu', v: b._count?.menuItems || 0 },
                    { l: 'Staff', v: b._count?.users || 0 },
                  ].map(({ l, v }) => (
                    <div key={l} className="bg-gray-50 rounded-xl py-2">
                      <p className="font-extrabold text-gray-900 text-xs leading-none">{v}</p>
                      <p className="text-[9px] text-gray-400 font-bold mt-0.5">{l}</p>
                    </div>
                  ))}
                </div>
                {b.cuisineType && (
                  <p className="text-[11px] text-brand-600 font-semibold mt-3 bg-brand-50 rounded-lg px-2 py-1 inline-block">
                    {b.cuisineType}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Edit Staff Modal ───────────────────────────────────────────────────────────
function EditStaffModal({ member, onClose, onSaved }) {
  const [form, setForm] = useState({ name: member.name, role: member.role, active: member.active })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await api.put(`/central/staff/${member.id}`, form)
      onSaved(res.data)
      toast.success('Staff member updated!')
      onClose()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-extrabold">Edit Staff Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v }))}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="OWNER">Owner</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="KITCHEN">Kitchen</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={form.active} onChange={e => setForm(p => ({ ...p, active: e.target.checked }))} />
                <div className="w-10 h-5 rounded-full transition-all" style={{ background: form.active ? '#7c3aed' : '#d1d5db' }}>
                  <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all" style={{ left: form.active ? '22px' : '2px' }} />
                </div>
              </div>
              <span className="text-sm font-semibold text-gray-700">Account Active</span>
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="flex-1 bg-brand-600 hover:bg-brand-700">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Staff Tab ─────────────────────────────────────────────────────────────────
function StaffTab({ branches }) {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [branchFilter, setBranchFilter] = useState('all')
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const fetchStaff = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/central/staff')
      setStaff(res.data)
    } catch { toast.error('Failed to load staff') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchStaff() }, [fetchStaff])

  const filtered = useMemo(() =>
    branchFilter === 'all' ? staff : staff.filter(s => s.restaurantId === branchFilter)
    , [staff, branchFilter])

  const handleDelete = async id => {
    try {
      await api.delete(`/central/staff/${id}`)
      setStaff(p => p.filter(s => s.id !== id))
      toast.success('Staff member deleted')
      setDeleting(null)
    } catch (err) { toast.error(err.message) }
  }

  const ROLE_COLORS = {
    OWNER: 'bg-brand-50 text-brand-700',
    ADMIN: 'bg-blue-50 text-blue-700',
    KITCHEN: 'bg-amber-50 text-amber-700',
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="font-extrabold text-gray-900 text-base flex items-center gap-2 flex-1">
          <FaUsers className="text-brand-500 w-4 h-4" /> All Staff ({filtered.length})
        </h2>
        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="w-[180px] bg-white rounded-xl border-gray-200 h-9 font-semibold text-gray-700 text-sm">
            <SelectValue placeholder="All Branches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="animate-spin text-brand-500 w-8 h-8" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
          <FaUsers className="w-12 h-12 mb-3 opacity-20" />
          <p className="font-semibold">No staff found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Name', 'Email', 'Role', 'Branch', 'Status', 'Last Login', 'Actions'].map(h => (
                    <th key={h} className="text-left text-[11px] font-extrabold text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-[10px] font-extrabold">{s.name[0]?.toUpperCase()}</span>
                        </div>
                        <span className="font-semibold text-gray-900 truncate max-w-[100px]">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 truncate max-w-[140px]">{s.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-extrabold px-2 py-1 rounded-full ${ROLE_COLORS[s.role] || 'bg-gray-50 text-gray-500'}`}>
                        {s.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-medium truncate max-w-[120px]">{s.restaurant?.name || '—'}</td>
                    <td className="px-4 py-3">
                      {s.active
                        ? <span className="flex items-center gap-1 text-green-600 font-semibold text-[11px]"><FaCheckCircle className="w-3 h-3" /> Active</span>
                        : <span className="flex items-center gap-1 text-red-500 font-semibold text-[11px]"><FaTimesCircle className="w-3 h-3" /> Inactive</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-[11px] whitespace-nowrap">
                      {s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleDateString('en-IN') : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setEditing(s)}
                          className="w-7 h-7 rounded-lg bg-brand-50 hover:bg-brand-100 flex items-center justify-center transition-colors">
                          <FaEdit className="w-3 h-3 text-brand-600" />
                        </button>
                        <button onClick={() => setDeleting(s)}
                          className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors">
                          <FaTrash className="w-3 h-3 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <EditStaffModal
          member={editing}
          onClose={() => setEditing(null)}
          onSaved={updated => setStaff(p => p.map(s => s.id === updated.id ? updated : s))}
        />
      )}

      {/* Delete confirm */}
      {deleting && (
        <Dialog open onOpenChange={() => setDeleting(null)}>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-extrabold text-red-600">Delete Staff Member?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-600 mt-2">
              This will permanently delete <strong>{deleting.name}</strong> from <strong>{deleting.restaurant?.name}</strong>. This cannot be undone.
            </p>
            <div className="flex gap-3 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => setDeleting(null)}>Cancel</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={() => handleDelete(deleting.id)}>
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// ── CSV export helper ──────────────────────────────────────────────────────────
function exportCSV(rows, filename) {
  if (!rows.length) return toast.error('No data to export')
  const headers = Object.keys(rows[0])
  const body = rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))
  const csv = [headers.join(','), ...body].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ── Advanced Analytics Tab ─────────────────────────────────────────────────────
function AdvancedAnalyticsTab({ branches }) {
  const [peakData, setPeakData] = useState([])
  const [bestSellers, setBestSellers] = useState([])
  const [staffPerf, setStaffPerf] = useState([])
  const [loading, setLoading] = useState(true)
  const [branchFilter, setBranchFilter] = useState('all')

  useEffect(() => {
    setLoading(true)
    const q = branchFilter !== 'all' ? `?branchId=${branchFilter}` : ''
    Promise.all([
      api.get(`/central/analytics/peak-hours${q}`),
      api.get(`/central/analytics/best-sellers${q}`),
      api.get(`/central/analytics/staff-performance`),
    ]).then(([ph, bs, sp]) => {
      setPeakData((ph.data.data || []).map(d => {
        const hr = d.hour;
        const ampm = hr >= 12 ? 'PM' : 'AM';
        const h12 = hr % 12 || 12;
        return { ...d, label: `${h12} ${ampm}` };
      }))
      setBestSellers(bs.data.data || [])
      setStaffPerf(sp.data.data || [])
    }).catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false))
  }, [branchFilter])

  const maxPeak = Math.max(...peakData.map(h => h.count), 1)
  const maxSales = Math.max(...bestSellers.map(b => b.count), 1)

  const ROLE_COLORS = { OWNER: 'bg-brand-50 text-brand-700', ADMIN: 'bg-blue-50 text-blue-700', KITCHEN: 'bg-amber-50 text-amber-700' }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-brand-500 w-8 h-8" /></div>

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="font-extrabold text-gray-900 text-base flex items-center gap-2 flex-1">
          <FaChartBar className="text-brand-500 w-4 h-4" /> Advanced Analytics
          <span className="text-xs font-normal text-gray-400">(last 30 days)</span>
        </h2>
        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="w-[180px] bg-white rounded-xl border-gray-200 h-9 font-semibold text-gray-700 text-sm">
            <SelectValue placeholder="All Branches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Peak Hours Heatmap */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-brand-500 rounded-full" /> Peak Hours Heatmap
          <span className="text-xs text-gray-400 font-normal">— Order activity by hour of day</span>
        </p>
        <ChartContainer config={{ count: { label: "Orders", color: "#e11d48" } }} className="h-64 w-full mt-4">
          <BarChart data={peakData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
            <ChartTooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} content={<ChartTooltipContent />} />
            <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </div>

      {/* Best Sellers */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-amber-500 rounded-full" /> Top 10 Best Sellers
        </p>
        {bestSellers.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No order data yet</p>
        ) : (
          <div className="space-y-2">
            {bestSellers.map((b, i) => (
              <div key={b.menuItemId} className="flex items-center gap-3">
                <span className="text-[11px] font-black text-gray-400 w-5 flex-shrink-0">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-900 truncate">{b.item.name}</span>
                    <span className="text-xs font-bold text-gray-500 flex-shrink-0 ml-2">{b.count} sold</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all"
                      style={{ width: `${(b.count / maxSales) * 100}%` }} />
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-gray-400 w-16 text-right flex-shrink-0">{b.item.category}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Staff Performance */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full" /> Staff Overview
            <span className="text-xs text-gray-400 font-normal">— Branch throughput (last 30 days)</span>
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Name', 'Branch', 'Role', 'Status', 'Last Login', 'Branch Orders (30d)'].map(h => (
                  <th key={h} className="text-left text-[11px] font-extrabold text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {staffPerf.map(s => (
                <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-[10px] font-extrabold">{s.name[0]?.toUpperCase()}</span>
                      </div>
                      <span className="font-semibold text-gray-900 truncate max-w-[100px]">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-medium truncate max-w-[120px]">{s.restaurant?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-extrabold px-2 py-1 rounded-full ${ROLE_COLORS[s.role] || 'bg-gray-50 text-gray-500'}`}>{s.role}</span>
                  </td>
                  <td className="px-4 py-3">
                    {s.active ? <span className="flex items-center gap-1 text-green-600 font-semibold text-[11px]"><FaCheckCircle className="w-3 h-3" />Active</span>
                      : <span className="flex items-center gap-1 text-red-500 font-semibold text-[11px]"><FaTimesCircle className="w-3 h-3" />Inactive</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-[11px] whitespace-nowrap">
                    {s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleDateString('en-IN') : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${Math.min(100, (s.branchOrders / 100) * 100)}%` }} />
                      </div>
                      <span className="text-xs font-bold text-gray-700">{s.branchOrders}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {staffPerf.length === 0 && <div className="text-center py-10 text-gray-400 text-sm">No staff data found</div>}
        </div>
      </div>
    </div>
  )
}


function ReportsTab({ branches }) {
  const todayStr = new Date().toISOString().slice(0, 10)
  const thirtyAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const [from, setFrom] = useState(thirtyAgo)
  const [to, setTo] = useState(todayStr)
  const [branchFilter, setBranchFilter] = useState('all')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchReport = async () => {
    setLoading(true)
    try {
      const q = new URLSearchParams({ from, to, ...(branchFilter !== 'all' && { branchId: branchFilter }) })
      const res = await api.get(`/central/reports?${q}`)
      setData(res.data)
    } catch { toast.error('Failed to load report') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchReport() }, []) // eslint-disable-line

  const handleExportCSV = () => {
    if (!data?.orders?.length) return toast.error('No data to export')
    const rows = data.orders.map(o => ({
      Date: new Date(o.createdAt).toLocaleDateString('en-IN'),
      Branch: o.restaurant?.name || '—',
      'Order#': o.id.slice(-8),
      Customer: o.customerName,
      Table: o.tableNumber,
      Status: o.status,
      'Total (Rs.)': o.discountedTotal ?? o.totalPrice,
    }))
    exportCSV(rows, `report_${from}_to_${to}.csv`)
  }

  const handlePrint = () => window.print()

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
          <FaFileAlt className="text-brand-500 w-4 h-4" /> Revenue & Order Reports
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} className="gap-2 rounded-xl text-xs h-9 border-gray-200">
            <FaDownload className="w-3 h-3" /> Export CSV
          </Button>
          <Button variant="outline" onClick={handlePrint} className="gap-2 rounded-xl text-xs h-9 border-gray-200">
            <FaPrint className="w-3 h-3" /> Print PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-end gap-3 flex-wrap">
          <div className="space-y-1">
            <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">From</Label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-brand-400 bg-white" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">To</Label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-brand-400 bg-white" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Branch</Label>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-[180px] bg-white rounded-xl border-gray-200 h-10 font-semibold text-gray-700 text-sm">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={fetchReport} disabled={loading} className="bg-brand-600 hover:bg-brand-700 text-white rounded-xl gap-2 h-10">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FaFilter className="w-3 h-3" />} Generate
          </Button>
        </div>
      </div>

      {/* Summary KPIs */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Orders', value: data.summary.totalOrders, color: 'bg-blue-50 text-blue-700' },
            { label: 'Paid Orders', value: data.summary.paidOrders, color: 'bg-green-50 text-green-700' },
            { label: 'Total Revenue', value: `Rs. ${(data.summary.totalRevenue || 0).toLocaleString()}`, color: 'bg-brand-50 text-brand-700' },
            { label: 'GST (5%)', value: `Rs. ${(data.summary.gstAmount || 0).toLocaleString()}`, color: 'bg-amber-50 text-amber-700' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`rounded-2xl p-4 font-bold ${color}`}>
              <p className="text-2xl font-extrabold leading-none mb-1">{value}</p>
              <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Orders Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="animate-spin text-brand-500 w-8 h-8" /></div>
      ) : data?.orders?.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
          <FaFileAlt className="w-10 h-10 mb-3 opacity-20" />
          <p className="font-semibold">No orders in this date range</p>
        </div>
      ) : (
        <div id="printable-report" className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <p className="font-bold text-gray-900 text-sm">Orders — {from} to {to}</p>
            <p className="text-xs text-gray-400">{data?.orders?.length} orders</p>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 z-10">
                <tr>
                  {['Date', 'Branch', 'Customer', 'Table', 'Items', 'Status', 'Amount'].map(h => (
                    <th key={h} className="text-left text-[11px] font-extrabold text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data?.orders?.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-[11px] text-gray-500 whitespace-nowrap">{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900 text-xs truncate max-w-[100px]">{o.restaurant?.name}</td>
                    <td className="px-4 py-3 text-gray-700 text-xs truncate max-w-[100px]">{o.customerName}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">#{o.tableNumber}</td>
                    <td className="px-4 py-3 text-gray-500 text-[11px] truncate max-w-[140px]">{o.items?.map(i => i.menuItem?.name).join(', ')}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLES[o.status] || 'bg-gray-50 text-gray-500'}`}>{o.status}</span>
                    </td>
                    <td className="px-4 py-3 font-extrabold text-brand-700 text-xs whitespace-nowrap">Rs. {(o.discountedTotal ?? o.totalPrice).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Audit Log Tab ──────────────────────────────────────────────────────────────
const ACTION_STYLES = {
  BRANCH_CREATED: 'bg-green-50 text-green-700 border-green-200',
  BRANCH_UPDATED: 'bg-blue-50 text-blue-700 border-blue-200',
  BRANCH_ACTIVATED: 'bg-green-50 text-green-700 border-green-200',
  BRANCH_DEACTIVATED: 'bg-red-50 text-red-600 border-red-200',
  STAFF_UPDATED_BY_CENTRAL_ADMIN: 'bg-amber-50 text-amber-700 border-amber-200',
  STAFF_DELETED_BY_CENTRAL_ADMIN: 'bg-red-50 text-red-600 border-red-200',
}

function AuditLogTab() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState('all')

  const fetchLogs = useCallback(async (pg = 1) => {
    setLoading(true)
    try {
      const q = new URLSearchParams({ page: pg, limit: 20, ...(actionFilter && actionFilter !== 'all' && { action: actionFilter }) })
      const res = await api.get(`/central/audit-log?${q}`)
      setLogs(res.data.data); setTotal(res.data.total)
      setPage(res.data.page); setTotalPages(res.data.totalPages)
    } catch { toast.error('Failed to load audit log') }
    finally { setLoading(false) }
  }, [actionFilter])

  useEffect(() => { fetchLogs(1) }, [fetchLogs])

  const ACTION_LABELS = ['all', 'BRANCH_CREATED', 'BRANCH_UPDATED', 'BRANCH_ACTIVATED', 'BRANCH_DEACTIVATED', 'STAFF_UPDATED_BY_CENTRAL_ADMIN', 'STAFF_DELETED_BY_CENTRAL_ADMIN']

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="font-extrabold text-gray-900 text-base flex items-center gap-2 flex-1">
          <FaHistory className="text-brand-500 w-4 h-4" /> Audit Log
          <span className="text-xs text-gray-400 font-normal">({total} entries)</span>
        </h2>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[180px] bg-white rounded-xl border-gray-200 h-9 font-semibold text-gray-700 text-sm">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            {ACTION_LABELS.map(a => <SelectItem key={a} value={a}>{a === 'all' ? 'All Actions' : a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="animate-spin text-brand-500 w-8 h-8" /></div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
          <FaHistory className="w-10 h-10 mb-3 opacity-20" />
          <p className="font-semibold">No activity recorded yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Timestamp', 'Action', 'Entity', 'Details'].map(h => (
                    <th key={h} className="text-left text-[11px] font-extrabold text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-[11px] text-gray-500 whitespace-nowrap">{fmtDate(log.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ACTION_STYLES[log.action] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs font-medium">{log.entity || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-[11px] max-w-[200px] truncate">
                      {log.metadata ? Object.entries(log.metadata).map(([k, v]) => `${k}: ${v}`).join(' · ') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => fetchLogs(page - 1)} className="h-7 px-3 rounded-lg text-xs">← Prev</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => fetchLogs(page + 1)} className="h-7 px-3 rounded-lg text-xs">Next →</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}


// ── Profile Edit Form ──────────────────────────────────────────────────────────
function ProfileEditForm({ user, onSaved, onClose }) {
  const [name, setName] = useState(user?.name || '')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    if (!name.trim()) return toast.error('Full name cannot be empty')
    setSaving(true)
    try {
      const res = await api.patch('/central/profile', { name: name.trim() })
      onSaved({ name: res.data.name })
      toast.success('Profile updated!')
      onClose()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-4">
      {/* Full Name — editable */}
      <div className="space-y-1.5">
        <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Full Name</Label>
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your full name"
          className="rounded-xl border-gray-200 focus-visible:ring-brand-500"
          required
        />
      </div>

      {/* Email — read-only */}
      <div className="space-y-1.5">
        <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email Address</Label>
        <div className="flex h-10 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400 items-center gap-2">
          <span className="flex-1 truncate">{user?.email || '—'}</span>
          <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider flex-shrink-0">Read only</span>
        </div>
      </div>

      {/* Role — read-only */}
      <div className="space-y-1.5">
        <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Role</Label>
        <div className="flex h-10 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm items-center">
          <span className="text-[11px] font-extrabold px-2 py-1 rounded-full bg-brand-50 text-brand-700">
            Central Admin
          </span>
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={saving} className="flex-1 bg-brand-600 hover:bg-brand-700 text-white rounded-xl">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />Saving…</> : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function CentralDashboardPage() {
  const { user, logout, loading: authLoading, updateUser } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('central_tab') || 'overview')
  const changeTab = id => { setActiveTab(id); localStorage.setItem('central_tab', id) }

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [summary, setSummary] = useState(null)
  const [branches, setBranches] = useState([])
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(true)

  const pendingCount = useMemo(() => orders.filter(o => o.status === 'PENDING').length, [orders])

  const fetchAll = useCallback(async () => {
    try {
      const [sumRes, bRes, oRes] = await Promise.all([
        api.get('/central/summary'),
        api.get('/central/branches'),
        api.get('/central/orders?limit=100'),
      ])
      setSummary(sumRes.data)
      setBranches(bRes.data)
      setOrders(oRes.data.data || [])
    } catch (e) {
      toast.error('Failed to load dashboard data')
    } finally {
      setOrdersLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading) fetchAll()
  }, [authLoading, fetchAll])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      const nav = NAV_ITEMS.find(n => n.shortcut === e.key.toUpperCase())
      if (nav) changeTab(nav.id)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Real-time: join all branch rooms
  useEffect(() => {
    if (!branches.length) return
    branches.forEach(b => {
      socket.emit('join_restaurant', { restaurantId: b.id })
      socket.emit('join_owner', { restaurantId: b.id })
    })
    const onNew = order => {
      setOrders(p => p.find(o => o.id === order.id) ? p : [order, ...p])
      setSummary(prev => prev ? { ...prev, pendingOrders: prev.pendingOrders + 1, todayOrders: prev.todayOrders + 1 } : prev)
      toast(`New Order — ${order.restaurant?.name || ''} Table #${order.tableNumber}!`, { icon: <FaBell className="text-amber-500" />, duration: 7000 })
    }
    const onStatus = ({ orderId, status }) => {
      setOrders(p => p.map(o => o.id === orderId ? { ...o, status } : o))
    }
    socket.on('new_order', onNew)
    socket.on('order_status_update', onStatus)
    return () => {
      socket.off('new_order', onNew)
      socket.off('order_status_update', onStatus)
    }
  }, [branches])

  const handleLogout = () => { logout(); navigate('/owner/login') }

  const activeNav = NAV_ITEMS.find(n => n.id === activeTab)

  const TABS = {
    overview: <OverviewTab summary={summary} branches={branches} />,
    sales: <BranchSalesTab branches={branches} />,
    orders: <LiveOrdersTab orders={orders} loading={ordersLoading} branches={branches} />,
    branches: <BranchesTab branches={branches} loading={!summary} />,
    staff: <StaffTab branches={branches} />,
    reports: <ReportsTab branches={branches} />,
    audit: <AuditLogTab />,
  }

  const sidebarProps = { activeTab, onChange: changeTab, user, pendingCount, onLogout: handleLogout, onProfile: () => setShowProfile(true) }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 flex-col flex-shrink-0 shadow-xl" style={{ height: '100vh', overflow: 'hidden' }}>
        <Sidebar {...sidebarProps} />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent
          side="left"
          className="w-60 p-0 border-r border-white/[0.08] [&>button]:hidden"
          style={{ background: 'linear-gradient(180deg, #030712 0%, #0f172a 50%, #030712 100%)' }}
        >
          <Sidebar {...sidebarProps} onClose={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white/90 backdrop-blur-lg border-b border-gray-100 shadow-sm flex-shrink-0 z-20">
          <div className="px-4 sm:px-6 py-3.5 flex items-center gap-3">
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
              {pendingCount > 0 && (
                <button onClick={() => changeTab('orders')}
                  className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-extrabold px-3 py-1.5 rounded-xl hover:bg-amber-100 transition-colors">
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  {pendingCount} Pending
                </button>
              )}
              <Badge variant="outline" className="bg-brand-50 border-brand-200 text-brand-700 font-bold text-[11px] rounded-xl">
                {branches.length} Branches
              </Badge>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {TABS[activeTab] || null}
        </main>

        {/* Footer */}
        <footer className="flex-shrink-0 border-t border-gray-100 bg-white/80 py-3 px-6 text-center">
          <p className="text-[11px] text-gray-400 font-medium">
            © 2026 CodeYatra PVT.LTD. All Rights Reserved
          </p>
        </footer>
      </div>

      {/* Profile edit dialog */}
      <Dialog open={showProfile} onOpenChange={v => { if (!v) setShowProfile(false) }}>
        <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-5 text-white">
            <DialogTitle className="font-extrabold text-base text-white">Edit Profile</DialogTitle>
            <p className="text-gray-400 text-sm mt-0.5">Central Admin Account</p>
          </div>
          <ProfileEditForm user={user} onSaved={updateUser} onClose={() => setShowProfile(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
