/**
 * OwnerTabComponents.jsx — All tab panels for OwnerDashboardPage
 * Includes: skeleton loaders, donut chart, top items, trend arrows, heatmap, quick actions
 */
import React, { useEffect, useState, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import Heatmap from './Heatmap'
import {
  FaChartLine, FaClipboardList, FaUtensils, FaUsers,
  FaTimesCircle, FaCheckCircle, FaPrint, FaPlus, FaTrash, FaInbox, FaPaperPlane
} from 'react-icons/fa'
import {
  StatCardSkeleton, ChartSkeleton, OrderRowSkeleton, MenuSkeleton
} from '../../components/Skeleton'

// ── Helpers ────────────────────────────────────────────────────────────────────
function downloadCSV(filename, rows) {
  const escape = v => { const s = String(v ?? ''); return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s }
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([rows.map(r => r.map(escape).join(',')).join('\n')], { type: 'text/csv' })), download: filename })
  document.body.appendChild(a); a.click(); setTimeout(() => document.body.removeChild(a), 100)
}

// Animated counter hook
function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(0)
  const prev = useRef(0)
  useEffect(() => {
    const start = prev.current
    const diff = target - start
    const startTime = performance.now()
    const step = now => {
      const p = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3) // ease-out cubic
      setVal(Math.round(start + diff * eased))
      if (p < 1) requestAnimationFrame(step)
      else prev.current = target
    }
    requestAnimationFrame(step)
  }, [target, duration])
  return val
}

// Bar chart (reusable)
function BarChart({ data, labels, color = '#e11d48' }) {
  const max = Math.max(...data, 1)
  const showEvery = data.length > 10 ? Math.ceil(data.length / 8) : 1
  return (
    <div className="relative h-44 flex flex-col gap-1 select-none">
      <svg viewBox={`0 0 ${data.length * 20} 100`} className="flex-1 w-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`bg${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.9" />
            <stop offset="100%" stopColor={color} stopOpacity="0.08" />
          </linearGradient>
        </defs>
        {data.map((v, i) => {
          const h = (v / max) * 88; return (
            <g key={i}><rect x={i * 20 + 2} y={100 - h} width={16} height={h} fill={`url(#bg${color.replace('#', '')})`} rx={3} className="hover:opacity-100 opacity-85 transition-opacity" /><title>{v}</title></g>
          )
        })}
      </svg>
      <div className="flex">{labels.map((l, i) => <div key={i} className="flex-1 text-center text-[9px] text-gray-400 truncate" style={{ display: (i % showEvery === 0 || i === labels.length - 1) ? 'block' : 'none' }}>{l}</div>)}</div>
    </div>
  )
}

// Line chart (pro trend)
function LineChart({ data, labels, color = '#e11d48' }) {
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = Math.max(max - min, 1)
  const points = data.map((v, i) => {
    const x = data.length === 1 ? 50 : (i / (data.length - 1)) * 100
    const y = 92 - ((v - min) / range) * 72
    return { x, y, v }
  })
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ')
  const area = `${line} L 100,100 L 0,100 Z`
  const showEvery = data.length > 10 ? Math.ceil(data.length / 6) : 1
  const last = points[points.length - 1] || { x: 0, y: 0, v: 0 }
  const avg = Math.round(data.reduce((s, v) => s + v, 0) / Math.max(data.length, 1))
  const gradId = `linegrad-${color.replace('#', '')}`
  const glowId = `lineglow-${color.replace('#', '')}`

  return (
    <div className="relative">
      <div className="relative h-48 rounded-xl bg-gradient-to-b from-gray-50 to-white border border-gray-100 overflow-hidden">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
            <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {[20, 40, 60, 80].map(y => (
            <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="#eef2f7" strokeDasharray="2 3" />
          ))}
          <path d={area} fill={`url(#${gradId})`} />
          <path d={line} stroke={color} strokeWidth="2.6" fill="none" filter={`url(#${glowId})`} />
          <circle cx={last.x} cy={last.y} r="2.8" fill="white" stroke={color} strokeWidth="2" />
        </svg>
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2.5 py-1 rounded-lg border border-gray-100 text-[11px] font-bold text-gray-700 shadow-sm">
          {last.v}
        </div>
      </div>
      <div className="flex justify-between text-[9px] text-gray-400 mt-2">
        {labels.map((l, i) => (
          <span key={i} style={{ display: (i % showEvery === 0 || i === labels.length - 1) ? 'block' : 'none' }}>
            {l}
          </span>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-500">
        <span className="px-2 py-0.5 rounded-full bg-gray-100">Min {min}</span>
        <span className="px-2 py-0.5 rounded-full bg-gray-100">Avg {avg}</span>
        <span className="px-2 py-0.5 rounded-full bg-gray-100">Max {max}</span>
      </div>
    </div>
  )
}

// Donut chart (pure SVG)
function DonutChart({ slices }) {
  const total = slices.reduce((s, x) => s + x.value, 0)
  if (total === 0) return <div className="flex items-center justify-center h-40 text-gray-300 text-sm">No data</div>
  let cumAngle = -90
  const cx = 56, cy = 56, r = 40, stroke = 22
  const slicePaths = slices.filter(s => s.value > 0).map(s => {
    const angle = (s.value / total) * 360
    const startAngle = cumAngle; cumAngle += angle
    const rad = a => (a * Math.PI) / 180
    const x1 = cx + r * Math.cos(rad(startAngle)), y1 = cy + r * Math.sin(rad(startAngle))
    const x2 = cx + r * Math.cos(rad(startAngle + angle)), y2 = cy + r * Math.sin(rad(startAngle + angle))
    const large = angle > 180 ? 1 : 0
    return { ...s, d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`, angle }
  })
  return (
    <div className="flex items-center gap-5">
      <svg width={112} height={112} viewBox="0 0 112 112" className="flex-shrink-0">
        {slicePaths.map((s, i) => <path key={i} d={s.d} fill={s.color} className="hover:opacity-90 transition-opacity cursor-default"><title>{s.label}: {s.value}</title></path>)}
        <circle cx={cx} cy={cy} r={r - stroke} fill="white" />
        <text x={cx} y={cy - 5} textAnchor="middle" fontSize="14" fontWeight="800" fill="#111">{total}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize="7.5" fill="#9ca3af">orders</text>
      </svg>
      <div className="space-y-1.5 flex-1">
        {slices.filter(s => s.value > 0).map(s => (
          <div key={s.label} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <span className="text-gray-600 flex-1">{s.label}</span>
            <span className="font-bold text-gray-900">{s.value}</span>
            <span className="text-gray-400">({Math.round((s.value / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Stat card with animated counter + trend arrow
function StatCard({ icon: Icon, label, value, rawValue, trend, prefix = '', iconBg, iconColor }) {
  const counted = useCountUp(rawValue ?? 0)
  const displayValue = rawValue !== undefined ? `${prefix}${counted.toLocaleString()}` : value

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
      <div className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider truncate">{label}</p>
        <p className="font-display text-gray-900 text-2xl font-bold leading-tight tracking-tight">{displayValue}</p>
        {trend !== undefined && (
          <p className={`text-xs mt-0.5 font-semibold flex items-center gap-1 ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            <span>{trend >= 0 ? '↑' : '↓'}</span>
            <span>{Math.abs(trend)}% vs yesterday</span>
          </p>
        )}
      </div>
    </div>
  )
}

// Top-selling items widget
function TopItems({ orders }) {
  const counts = {}
  orders.forEach(o => o.items?.forEach(item => {
    const name = item.menuItem?.name || 'Unknown'
    counts[name] = (counts[name] || 0) + item.quantity
  }))
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const max = ranked[0]?.[1] || 1

  if (ranked.length === 0) return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="font-bold text-gray-900 mb-3">Top Items</h3>
      <p className="text-gray-400 text-sm text-center py-6">No orders yet</p>
    </div>
  )

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900">Top Selling</h3>
        <div className="w-7 h-7 bg-orange-50 rounded-lg flex items-center justify-center"><FaUtensils className="w-3.5 h-3.5 text-orange-500" /></div>
      </div>
      <div className="space-y-3">
        {ranked.map(([name, qty], i) => (
          <div key={name} className="flex items-center gap-3">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-amber-700 text-white' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-gray-800 text-sm font-semibold truncate">{name}</p>
              <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full transition-all duration-700" style={{ width: `${(qty / max) * 100}%` }} />
              </div>
            </div>
            <span className="text-gray-900 text-sm font-bold flex-shrink-0">{qty}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Analytics Tab ──────────────────────────────────────────────────────────────
export function AnalyticsTab({ allOrders = [] }) {
  const [range, setRange] = useState('30d')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const RANGES = [{ id: '24h', label: '24h' }, { id: '30d', label: '30 Days' }, { id: '6m', label: '6 Months' }]

  useEffect(() => {
    setLoading(true)
    api.get(`/restaurant/analytics?range=${range}`)
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false))
  }, [range])

  const donutSlices = [
    { label: 'Paid', value: allOrders.filter(o => o.status === 'PAID').length, color: '#22c55e' },
    { label: 'Served', value: allOrders.filter(o => o.status === 'SERVED').length, color: '#3b82f6' },
    { label: 'Preparing', value: allOrders.filter(o => o.status === 'PREPARING').length, color: '#f97316' },
    { label: 'Pending', value: allOrders.filter(o => o.status === 'PENDING').length, color: '#f59e0b' },
    { label: 'Cancelled', value: allOrders.filter(o => o.status === 'CANCELLED').length, color: '#ef4444' },
  ]

  const exportCSV = () => {
    if (!data) return
    downloadCSV(`analytics_${range}.csv`, [
      ['Period', 'Revenue (Rs.)', 'Orders'],
      ...data.labels.map((l, i) => [l, (data.revenue[i] || 0).toFixed(2), data.counts[i] || 0]),
      [], ['TOTAL', (data.totalRevenue || 0).toFixed(2), data.totalOrders],
    ])
  }

  return (
    <div className="space-y-5">
      {/* Range + export */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {RANGES.map(r => (
            <button key={r.id} onClick={() => setRange(r.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${range === r.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {r.label}
            </button>
          ))}
        </div>
        {data && <button onClick={exportCSV} className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 transition-colors">↓ Export CSV</button>}
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <StatCardSkeleton key={i} />)}
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard icon={FaClipboardList} label="Total Orders" rawValue={data.totalOrders} iconBg="bg-blue-50" iconColor="text-blue-600" trend={data.ordersTrend} />
          <StatCard icon={FaChartLine} label="Total Revenue" rawValue={data.totalRevenue || 0} prefix="Rs." iconBg="bg-brand-50" iconColor="text-brand-600" trend={data.revenueTrend} />
          <StatCard icon={FaCheckCircle} label="Paid Revenue" rawValue={data.totalPaidRevenue || 0} prefix="Rs." iconBg="bg-green-50" iconColor="text-green-600" />
          <StatCard icon={FaChartLine} label="Avg Order" rawValue={data.totalOrders ? Math.round((data.totalRevenue || 0) / data.totalOrders) : 0} prefix="Rs." iconBg="bg-purple-50" iconColor="text-purple-600" />
        </div>
      ) : null}

      {/* Charts row */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5"><ChartSkeleton /><ChartSkeleton /></div>
      ) : data ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div><h3 className="font-bold text-gray-800">Revenue</h3><p className="text-xs text-gray-400 mt-0.5">Rs. {(data.totalPaidRevenue || 0).toFixed(0)} paid</p></div>
              <div className="w-8 h-8 bg-green-50 rounded-xl flex items-center justify-center"><FaChartLine className="w-4 h-4 text-green-600" /></div>
            </div>
            <LineChart data={data.revenue} labels={data.labels} color="#22c55e" />
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div><h3 className="font-bold text-gray-800">Orders</h3><p className="text-xs text-gray-400 mt-0.5">{data.totalOrders} total</p></div>
              <div className="w-8 h-8 bg-brand-50 rounded-xl flex items-center justify-center"><FaClipboardList className="w-4 h-4 text-brand-600" /></div>
            </div>
            <LineChart data={data.counts} labels={data.labels} color="#e11d48" />
          </div>
        </div>
      ) : null}

      {/* Donut + Top Items + Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Order Status</h3>
            <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center"><FaClipboardList className="w-3.5 h-3.5 text-blue-500" /></div>
          </div>
          <DonutChart slices={donutSlices} />
        </div>
        <TopItems orders={allOrders} />
        <div className="lg:col-span-1">
          <Heatmap orders={allOrders} />
        </div>
      </div>
    </div>
  )
}

// ── Order History Tab ──────────────────────────────────────────────────────────
const STATUS_CFG = {
  PENDING: { border: 'border-l-amber-400', dot: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700 border-amber-200', next: 'ACCEPTED', nextBtn: 'bg-brand-600 text-white hover:bg-brand-700', nextLabel: 'Accept' },
  ACCEPTED: { border: 'border-l-blue-400', dot: 'bg-blue-400', badge: 'bg-blue-50 text-blue-700 border-blue-200', next: 'PREPARING', nextBtn: 'bg-orange-500 text-white hover:bg-orange-600', nextLabel: 'Prepare' },
  PREPARING: { border: 'border-l-orange-400', dot: 'bg-orange-400', badge: 'bg-orange-50 text-orange-700 border-orange-200', next: 'SERVED', nextBtn: 'bg-green-600 text-white hover:bg-green-700', nextLabel: 'Served' },
  SERVED: { border: 'border-l-green-400', dot: 'bg-green-400', badge: 'bg-green-50 text-green-700 border-green-200', next: null },
  CANCELLED: { border: 'border-l-red-400', dot: 'bg-red-400', badge: 'bg-red-50 text-red-700 border-red-200', next: null },
  PAID: { border: 'border-l-emerald-500', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', next: null },
}

function BillModal({ order, restaurant, onClose, onPaid }) {
  const [discount, setDiscount] = useState(0)
  const [paying, setPaying] = useState(false)
  const alreadyPaid = order.status === 'PAID'
  const subtotal = order.totalPrice
  const discAmt = +((subtotal * discount) / 100).toFixed(2)
  const finalAmt = +(subtotal - discAmt).toFixed(2)
  const fmt = d => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })

  const handlePay = async () => {
    setPaying(true)
    try {
      const res = await api.put(`/orders/${order.id}/status`, { status: 'PAID', discount, discountedTotal: finalAmt })
      onPaid(res.data); toast.success('Marked as PAID!'); onClose()
    } catch (err) { toast.error(err.message) } finally { setPaying(false) }
  }

  const handlePrint = () => {
    const rows = order.items?.map(i => `<tr><td style="padding:4px 0">${i.menuItem?.name} ×${i.quantity}</td><td style="text-align:right">Rs.${(i.price * i.quantity).toFixed(0)}</td></tr>`).join('')
    const w = window.open('', '_blank', 'width=400,height=600')
    w.document.write(`<!DOCTYPE html><html><head><title>Bill</title><style>body{font-family:Inter,sans-serif;max-width:360px;margin:0 auto;padding:20px}.total{font-size:18px;font-weight:900}.paid{background:#dcfce7;color:#166534;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700}</style></head><body><div style="text-align:center"><h2>${restaurant?.name}</h2><p>${fmt(order.createdAt)}</p></div><hr/><p><b>Customer:</b> ${order.customerName}</p><p><b>Table:</b> #${order.tableNumber}</p><table style="width:100%">${rows}</table><hr/>${discount > 0 ? `<p style="color:red">Discount ${discount}%: -Rs.${discAmt.toFixed(0)}</p>` : ''}<p class="total">TOTAL: Rs.${finalAmt.toFixed(0)}</p><div style="text-align:center"><span class="paid">✓ PAID</span></div><div style="text-align:center;margin-top:16px;color:#999;font-size:11px">Thank you! Powered by Smart Order</div><script>window.onload=()=>{window.print();setTimeout(()=>window.close(),1000)}<\/script></body></html>`)
    w.document.close()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden border border-gray-100 animate-bounce-in">
        <div className="bg-gradient-to-r from-brand-700 to-brand-500 p-5 text-white flex items-center justify-between flex-shrink-0">
          <div>
            <p className="font-extrabold text-lg leading-none">{order.customerName}</p>
            <p className="text-brand-200 text-sm mt-1">Table #{order.tableNumber} · {fmt(order.createdAt)}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center"><FaTimesCircle className="w-4 h-4" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div className="space-y-2">{order.items?.map(item => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-gray-700">{item.menuItem?.name} <span className="text-gray-400">×{item.quantity}</span></span>
              <span className="font-semibold">Rs. {(item.price * item.quantity).toFixed(0)}</span>
            </div>
          ))}</div>
          {!alreadyPaid && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Discount</p>
              <div className="flex flex-wrap gap-2">
                {[0, 5, 10, 15, 20].map(p => (
                  <button key={p} onClick={() => setDiscount(p)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${discount === p ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-800'}`}>{p === 0 ? 'None' : `${p}%`}</button>
                ))}
                <input type="number" min={0} max={100} placeholder="Custom %" className="w-24 px-2.5 py-1.5 rounded-xl text-xs border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-400" onChange={e => setDiscount(Math.min(100, Math.max(0, +e.target.value || 0)))} />
              </div>
            </div>
          )}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-1.5">
            <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span>Rs. {subtotal.toFixed(0)}</span></div>
            {discount > 0 && <div className="flex justify-between text-sm"><span className="text-green-600">Discount ({discount}%)</span><span className="text-green-600">- Rs. {discAmt.toFixed(0)}</span></div>}
            <div className="flex justify-between pt-2 border-t border-gray-200"><span className="font-bold text-gray-900">Total</span><span className="font-extrabold text-xl text-gray-900">Rs. {finalAmt.toFixed(0)}</span></div>
          </div>
        </div>
        <div className="p-5 border-t border-gray-100 flex gap-3">
          {!alreadyPaid ? (
            <>
              <button onClick={handlePay} disabled={paying} className="flex-1 py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50 text-sm">{paying ? 'Processing…' : '✓ Mark Paid'}</button>
              <button onClick={handlePrint} className="flex items-center gap-1.5 px-4 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-brand-600 to-brand-500 text-sm"><FaPrint className="w-4 h-4" /> Print</button>
            </>
          ) : (
            <button onClick={handlePrint} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-brand-600 to-brand-500 text-sm"><FaPrint className="w-4 h-4" /> Reprint Bill</button>
          )}
        </div>
      </div>
    </div>
  )
}

export function OrderHistoryTab({ orders, loading, restaurant, onPaid, onStatusChange }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selected, setSelected] = useState(null)

  const STATUS_TABS = ['ALL', 'PENDING', 'ACCEPTED', 'PREPARING', 'SERVED', 'PAID', 'CANCELLED']

  const filtered = orders.filter(o => {
    const matchStatus = statusFilter === 'ALL' || o.status === statusFilter
    const q = search.toLowerCase()
    return matchStatus && (!q || o.customerName.toLowerCase().includes(q) || o.phone?.includes(q) || String(o.tableNumber).includes(q))
  })
  const fmt = d => new Date(d).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
  const totalRev = filtered.filter(o => o.status === 'PAID').reduce((s, o) => s + (o.discountedTotal ?? o.totalPrice), 0)

  const exportCSV = () => downloadCSV(`orders_${new Date().toISOString().slice(0, 10)}.csv`, [
    ['ID', 'Date', 'Customer', 'Phone', 'Table', 'Total', 'Status'],
    ...filtered.map(o => [o.id, new Date(o.createdAt).toLocaleString(), o.customerName, o.phone, o.tableNumber, o.totalPrice, o.status])
  ])

  return (
    <div className="space-y-4">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <input
            type="text"
            placeholder="Search name, phone, table…"
            className="input text-sm w-full pl-9 focus:ring-brand-400 focus:border-brand-400"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx={11} cy={11} r={8}/><path d="m21 21-4.35-4.35"/>
          </svg>
        </div>
        <select
          className="input w-44 text-sm bg-white focus:ring-brand-400 focus:border-brand-400"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          {STATUS_TABS.map(s => <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s}</option>)}
        </select>
        <button
          onClick={exportCSV}
          disabled={!filtered.length}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 disabled:opacity-40 transition-colors"
        >
          ↓ Export
        </button>
      </div>

      {/* ── Summary pills ── */}
      <div className="flex gap-2.5 text-xs flex-wrap">
        <span className="bg-brand-50 border border-brand-200 text-brand-700 px-3 py-1.5 rounded-full font-bold">
          {filtered.length} orders
        </span>
        <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-full font-bold">
          Rs. {totalRev.toFixed(0)} paid
        </span>
      </div>

      {/* ── Table ── */}
      {loading ? <OrderRowSkeleton count={6} /> : filtered.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <FaClipboardList className="w-14 h-14 mx-auto mb-4 opacity-15" />
          <p className="font-display font-bold text-gray-500 text-base">No orders found</p>
          <p className="text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Header row — brand gradient */}
          <div className="grid grid-cols-[36px_2fr_1.5fr_1fr_1fr_140px] items-center px-6 py-3.5 bg-gradient-to-r from-brand-700 to-brand-600">
            <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">#</span>
            <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">Customer</span>
            <span className="text-[10px] font-black text-white/80 uppercase tracking-widest text-center">Items</span>
            <span className="text-[10px] font-black text-white/80 uppercase tracking-widest text-center">Status</span>
            <span className="text-[10px] font-black text-white/80 uppercase tracking-widest text-center">Amount</span>
            <span className="text-[10px] font-black text-white/80 uppercase tracking-widest text-center pl-4 border-l border-white/20">Action</span>
          </div>

          {/* Rows */}
          {filtered.map((o, idx) => {
            const cfg = STATUS_CFG[o.status] || STATUS_CFG.PENDING
            const preview = o.items?.slice(0, 2).map(it => it.menuItem?.name).filter(Boolean).join(', ') + (o.items?.length > 2 ? ` +${o.items.length - 2}` : '')
            const isCancelled = o.status === 'CANCELLED'
            const isPaid = o.status === 'PAID'
            const isServed = o.status === 'SERVED'
            const amount = isPaid && o.discountedTotal ? o.discountedTotal : o.totalPrice

            return (
              <div key={o.id}
                className={`grid grid-cols-[36px_2fr_1.5fr_1fr_1fr_140px] items-center px-6 py-4 border-b border-gray-50 last:border-0 transition-colors ${
                  isCancelled ? 'opacity-50' : 'hover:bg-brand-50/30'
                } ${isServed ? 'bg-green-50/20' : ''}`}
              >
                {/* Serial number */}
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 text-gray-500 font-bold text-xs">
                    {idx + 1}
                  </span>
                </div>
                {/* Customer */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm leading-none truncate">{o.customerName}</p>
                    <p className="text-gray-400 text-xs mt-0.5">Table #{o.tableNumber} · {fmt(o.createdAt)}</p>
                  </div>
                </div>

                {/* Items */}
                <p className="text-gray-500 text-xs text-center truncate px-2">{preview || '—'}</p>

                {/* Status */}
                <div className="flex justify-center">
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full border ${cfg.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${o.status === 'PENDING' ? cfg.dot + ' animate-pulse' : cfg.dot}`} />
                    {o.status}
                  </span>
                </div>

                {/* Amount */}
                <div className="text-center">
                  <p className={`font-bold text-sm ${isPaid ? 'text-emerald-600' : isCancelled ? 'text-gray-300 line-through' : 'text-gray-900'}`}>
                    Rs. {amount}
                  </p>
                  {isPaid && o.discount > 0 && (
                    <p className="text-emerald-500 text-[10px] font-semibold">{o.discount}% off</p>
                  )}
                </div>

                {/* Action */}
                <div className="flex justify-center pl-4 border-l border-gray-100">
                  {isServed && (
                    <button
                      onClick={() => setSelected(o)}
                      className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white hover:from-brand-700 hover:to-brand-600 transition-all shadow-sm whitespace-nowrap"
                    >
                      <FaPrint className="w-3.5 h-3.5 flex-shrink-0" /> Bill
                    </button>
                  )}
                  {isPaid && (
                    <button
                      onClick={() => setSelected(o)}
                      className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors whitespace-nowrap"
                    >
                      <FaPrint className="w-3.5 h-3.5 flex-shrink-0" /> Reprint
                    </button>
                  )}
                  {!isServed && !isPaid && !isCancelled && (
                    <span className="text-[10px] text-gray-300 font-medium">—</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selected && <BillModal order={selected} restaurant={restaurant} onClose={() => setSelected(null)} onPaid={updated => { onPaid(updated); setSelected(null) }} />}
    </div>
  )
}


// ── Menu Tab ───────────────────────────────────────────────────────────────────
const EMPTY = { name: '', description: '', price: '', category: 'Main Course', imageUrl: '', available: true }
const CATS = ['Drinks', 'Starters', 'Main Course', 'Desserts']

export function MenuTab({ restaurantId, onDeleteItem }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!restaurantId) return
    api.get(`/menu?restaurantId=${restaurantId}`).then(r => setItems(r.data.items || [])).finally(() => setLoading(false))
  }, [restaurantId])

  const handleSubmit = async e => {
    e.preventDefault(); setSaving(true)
    try {
      const payload = { ...form, price: parseFloat(form.price), restaurantId }
      if (editId) { const res = await api.put(`/menu/${editId}`, payload); setItems(p => p.map(i => i.id === editId ? res.data : i)); toast.success('Updated!') }
      else { const res = await api.post('/menu', payload); setItems(p => [...p, res.data]); toast.success('Added!') }
      setForm(EMPTY); setEditId(null)
    } catch (err) { toast.error(err.message) } finally { setSaving(false) }
  }

  const toggleAvailable = async item => {
    try { const res = await api.put(`/menu/${item.id}`, { available: !item.available }); setItems(p => p.map(i => i.id === item.id ? res.data : i)) }
    catch (err) { toast.error(err.message) }
  }

  const filtered = search ? items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase())) : items
  if (loading) return <MenuSkeleton />

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 sticky top-24 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-50 rounded-lg flex items-center justify-center"><FaPlus className="w-3.5 h-3.5 text-brand-600" /></div>
            {editId ? 'Edit Item' : 'Add New Item'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input required placeholder="Item name *" className="input text-sm" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            <input type="number" required min="0" step="0.01" placeholder="Price (Rs.) *" className="input text-sm" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} />
            <textarea placeholder="Description" rows={2} className="input text-sm resize-none" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            <select className="input text-sm" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
              {CATS.map(c => <option key={c}>{c}</option>)}
            </select>
            <input placeholder="Image URL (optional)" className="input text-sm" value={form.imageUrl} onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))} />
            <div className="flex gap-2 pt-1">
              {editId && <button type="button" onClick={() => { setForm(EMPTY); setEditId(null) }} className="btn-secondary flex-1 py-2.5 text-sm">Cancel</button>}
              <button type="submit" disabled={saving} className="btn-primary flex-1 py-2.5 text-sm">{saving ? 'Saving…' : editId ? 'Update' : 'Add Item'}</button>
            </div>
          </form>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-4">
        <div className="relative">
          <input type="text" placeholder="Search items or categories…" className="input text-sm pr-10" value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><FaTimesCircle className="w-4 h-4" /></button>}
        </div>
        <p className="text-gray-400 text-xs">{filtered.length} of {items.length} items</p>
        {CATS.map(cat => {
          const catItems = filtered.filter(i => i.category === cat)
          if (!catItems.length) return null
          return (
            <div key={cat} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between">
                <span className="font-bold text-gray-800 text-sm">{cat}</span>
                <span className="text-gray-400 text-xs font-medium">{catItems.length} items</span>
              </div>
              {catItems.map(item => (
                <div key={item.id} className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 transition-opacity ${!item.available ? 'opacity-40' : ''}`}>
                  {item.imageUrl
                    ? <img src={item.imageUrl} alt={item.name} className="w-11 h-11 rounded-xl object-cover flex-shrink-0 ring-1 ring-gray-100" />
                    : <div className="w-11 h-11 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0"><FaUtensils className="w-5 h-5 text-brand-300" /></div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 text-sm font-semibold truncate">{item.name}</p>
                    {item.description && <p className="text-gray-400 text-xs truncate mt-0.5">{item.description}</p>}
                    <p className="text-brand-600 text-xs font-bold mt-0.5">Rs. {item.price}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => toggleAvailable(item)} className={`text-[10px] px-2.5 py-1 rounded-lg font-bold border transition-colors ${item.available ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>{item.available ? 'ON' : 'OFF'}</button>
                    <button onClick={() => { setForm({ ...item, price: item.price.toString() }); setEditId(item.id) }} className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors text-xs font-bold">✏</button>
                    <button onClick={() => onDeleteItem(item, id => setItems(p => p.filter(i => i.id !== id)))} className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-100 transition-colors"><FaTrash className="w-3.5 h-3.5 text-red-500" /></button>
                  </div>
                </div>
              ))}
            </div>
          )
        })}
        {filtered.length === 0 && <div className="text-center py-12 text-gray-400"><FaUtensils className="w-10 h-10 mx-auto mb-2 opacity-20" /><p>{search ? 'No results.' : 'No items yet.'}</p></div>}
      </div>
    </div>
  )
}

// ── QR Tab ─────────────────────────────────────────────────────────────────────
export function QRTab({ restaurantId }) {
  const [baseUrl, setBaseUrl] = useState(window.location.origin)
  const [tables, setTables] = useState(10)
  const qrUrl = t => restaurantId ? `${baseUrl}/menu?table=${t}&rid=${restaurantId}` : `${baseUrl}/menu?table=${t}`
  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-wrap gap-4 items-end">
        <div><label className="label">Base URL</label><input className="input w-64 text-sm" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} /></div>
        <div><label className="label">Tables</label><input type="number" min={1} max={100} className="input w-24 text-sm" value={tables} onChange={e => setTables(parseInt(e.target.value) || 1)} /></div>
        <button onClick={() => window.print()} className="btn-primary px-5 py-2.5 text-sm print:hidden"><FaPrint className="w-4 h-4" /> Print All</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
        {Array.from({ length: tables }, (_, i) => i + 1).map(t => (
          <div key={t} className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col items-center gap-2.5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 shadow-sm">
            <p className="font-extrabold text-gray-900 text-sm">Table {t}</p>
            <div className="bg-gray-50 p-2 rounded-xl border border-gray-100"><QRCodeSVG value={qrUrl(t)} size={100} bgColor="#f9fafb" fgColor="#111111" level="M" /></div>
            <p className="text-gray-400 text-[9px] text-center break-all leading-tight">/menu?table={t}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// -- Support Tab (Owner) --
export function SupportTab() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ subject: '', message: '' })
  const [saving, setSaving] = useState(false)

  const STATUS = {
    OPEN: 'bg-red-50 text-red-600 border-red-200',
    IN_REVIEW: 'bg-amber-50 text-amber-600 border-amber-200',
    RESOLVED: 'bg-green-50 text-green-700 border-green-200',
  }

  useEffect(() => {
    api.get('/restaurant/tickets')
      .then(r => setTickets(r.data))
      .catch(() => setTickets([]))
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.subject.trim() || !form.message.trim()) return toast.error('Subject and message required')
    setSaving(true)
    try {
      const res = await api.post('/restaurant/tickets', {
        subject: form.subject.trim(),
        message: form.message.trim(),
      })
      setTickets(p => [res.data, ...p])
      setForm({ subject: '', message: '' })
      toast.success('Support ticket submitted')
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const fmt = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm sticky top-24">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-50 rounded-lg flex items-center justify-center">
              <FaPaperPlane className="w-3.5 h-3.5 text-brand-600" />
            </div>
            Submit Support Ticket
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              className="input text-sm"
              placeholder="Subject (e.g. Payment issue)"
              value={form.subject}
              onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
            />
            <textarea
              rows={5}
              className="input text-sm resize-none"
              placeholder="Describe your issue in detail..."
              value={form.message}
              onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
            />
            <button
              type="submit"
              disabled={saving}
              className="btn-primary w-full py-2.5 text-sm"
            >
              {saving ? 'Sending...' : 'Send Ticket'}
            </button>
          </form>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-4">
        <h3 className="font-bold text-gray-900">Your Tickets</h3>
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">Loading...</div>
        ) : tickets.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
            <FaInbox className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            No tickets yet
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map(t => (
              <div key={t.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{t.subject}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{fmt(t.createdAt)}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${STATUS[t.status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                    {t.status}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mt-2">{t.message}</p>
                {t.reply && (
                  <div className="mt-3 bg-brand-50 border border-brand-100 rounded-lg px-3 py-2">
                    <p className="text-xs font-semibold text-brand-600 mb-0.5">Reply from Super Admin:</p>
                    <p className="text-xs text-brand-800">{t.reply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
// -- Staff Tab --
export function StaffTab() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { api.get('/restaurant/staff').then(r => setUsers(r.data)).catch(() => setUsers([])).finally(() => setLoading(false)) }, [])
  const ROLE = { OWNER: 'bg-brand-50 text-brand-700 border-brand-200', KITCHEN: 'bg-blue-50 text-blue-700 border-blue-200', ADMIN: 'bg-purple-50 text-purple-700 border-purple-200' }
  return (
    <div className="max-w-2xl">
      {loading && <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4"><div className="relative overflow-hidden w-10 h-10 bg-gray-100 rounded-full"><div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" /></div><div className="flex-1 space-y-2"><div className="relative overflow-hidden h-3.5 w-32 bg-gray-100 rounded"><div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" /></div><div className="relative overflow-hidden h-2.5 w-48 bg-gray-100 rounded"><div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" /></div></div></div>)}</div>}
      {!loading && users.length === 0 && <div className="text-center py-16"><FaUsers className="w-12 h-12 mx-auto mb-3 text-gray-200" /><p className="font-semibold text-gray-500">No staff yet</p><p className="text-gray-400 text-sm mt-1">Add staff from Super Admin portal</p></div>}
      {!loading && users.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {users.map((u, i) => (
            <div key={u.id} className={`flex items-center gap-4 px-5 py-4 ${i > 0 ? 'border-t border-gray-50' : ''} hover:bg-gray-50 transition-colors`}>
              <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-700 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">{u.name[0].toUpperCase()}</div>
              <div className="flex-1 min-w-0"><p className="font-semibold text-gray-900 text-sm">{u.name}</p><p className="text-gray-400 text-xs truncate">{u.email}</p></div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${ROLE[u.role] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>{u.role}</span>
                <span className={`text-xs px-2.5 py-1 rounded-full border ${u.active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>{u.active ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


