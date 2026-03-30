// ownerTabHelpers.jsx
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

// Dual-series pulse chart (orders bars + revenue line)
function PulseChart({ labels = [], revenue = [], counts = [] }) {
  const n = Math.max(revenue.length, counts.length, 1)
  const rev = revenue.length ? revenue : Array(n).fill(0)
  const cnt = counts.length ? counts : Array(n).fill(0)
  const maxRev = Math.max(...rev, 1)
  const maxCnt = Math.max(...cnt, 1)
  const showEvery = n > 12 ? Math.ceil(n / 6) : 1

  const points = rev.map((v, i) => {
    const x = n === 1 ? 50 : (i / (n - 1)) * 100
    const y = 86 - (v / maxRev) * 56
    return { x, y, v }
  })
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ')
  const area = `${line} L 100,92 L 0,92 Z`
  const last = points[points.length - 1] || { x: 0, y: 0, v: 0 }
  const barW = 100 / n

  return (
    <div className="relative">
      <div className="relative h-56 rounded-2xl bg-gradient-to-b from-white to-slate-50 border border-gray-100 overflow-hidden">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <linearGradient id="pulseArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="pulseBars" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e11d48" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#e11d48" stopOpacity="0.1" />
            </linearGradient>
            <filter id="pulseGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {[20, 40, 60, 80].map(y => (
            <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="#eef2f7" strokeDasharray="2 3" />
          ))}

          {cnt.map((v, i) => {
            const h = (v / maxCnt) * 26
            const x = i * barW + barW * 0.2
            const w = barW * 0.6
            const y = 92 - h
            return <rect key={i} x={x} y={y} width={w} height={h} rx="1.6" fill="url(#pulseBars)" />
          })}

          <path d={area} fill="url(#pulseArea)" />
          <path d={line} stroke="#22c55e" strokeWidth="2.4" fill="none" filter="url(#pulseGlow)" />
          <circle cx={last.x} cy={last.y} r="2.6" fill="white" stroke="#22c55e" strokeWidth="2" />
        </svg>

        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[10px] font-bold text-gray-600 bg-white/90 border border-gray-100 shadow-sm">
          24h Pulse
        </div>
        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[10px] font-bold text-gray-700 bg-white/90 border border-gray-100 shadow-sm">
          Rs. {Math.round(last.v).toLocaleString()}
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
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#e11d48]" /> Orders</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" /> Revenue</span>
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


export { downloadCSV, useCountUp, BarChart, LineChart, PulseChart, DonutChart, StatCard, TopItems }
