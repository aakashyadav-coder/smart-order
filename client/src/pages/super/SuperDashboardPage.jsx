/**
 * SuperDashboardPage – Platform overview
 * - Professional dynamic line chart (bezier, Y-axis, tooltip, legend)
 * - Consistent section padding/spacing throughout
 * - No horizontal overflow / scroll
 */
import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import socket from '../../lib/socket'
import {
  FaBuilding,
  FaUsers,
  FaChartLine,
  FaShoppingBag,
  FaMoneyBillWave,
  FaTicketAlt,
  FaExclamationTriangle,
  FaArrowUp,
  FaArrowDown,
  FaMinus,
  FaCircle,
  FaFilePdf,
  FaPlus,
  FaBullhorn,
  FaDownload,
  FaSyncAlt,
  FaRocket,
  FaUserShield,
} from 'react-icons/fa'

/* ─────────────────── constants ─────────────────── */
const RANGE_OPTIONS = [
  { key: '24h', label: '24H', title: 'Last 24 Hours' },
  { key: '30d', label: '30D', title: 'Last 30 Days' },
  { key: '6m',  label: '6M',  title: 'Last 6 Months' },
]
const COLORS = ['#ef4444', '#0ea5e9', '#22c55e', '#f59e0b']

const fmtNum = (v) => (v || 0).toLocaleString()
const fmtVal = (v, metric) => metric === 'revenue' ? `Rs. ${fmtNum(v)}` : fmtNum(v)

/* ─────────────────── helpers ─────────────────── */
function niceMax(raw) {
  if (!raw || raw <= 0) return 10
  const exp = Math.pow(10, Math.floor(Math.log10(raw)))
  return Math.ceil(raw / exp) * exp
}

function yTicks(max, count = 4) {
  const step = max / count
  return Array.from({ length: count + 1 }, (_, i) => Math.round(step * i))
}

/* Build smooth cubic-bezier SVG path from data points */
function smoothPath(pts) {
  if (pts.length < 2) return pts.length === 1 ? `M ${pts[0].x},${pts[0].y}` : ''
  let d = `M ${pts[0].x},${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const cp1x = pts[i - 1].x + (pts[i].x - pts[i - 1].x) * 0.45
    const cp1y = pts[i - 1].y
    const cp2x = pts[i].x - (pts[i].x - pts[i - 1].x) * 0.45
    const cp2y = pts[i].y
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${pts[i].x},${pts[i].y}`
  }
  return d
}

/* ─────────────────── Professional Line Chart ─────────────────── */
function LineChart({ labels, series, metric }) {
  const svgRef   = useRef(null)
  const [tooltip, setTooltip] = useState(null) // { x, y, label, values }

  const W = 600, H = 240
  const PAD = { top: 16, right: 16, bottom: 32, left: 56 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top  - PAD.bottom

  const allVals = series.flatMap(s => s.data)
  const rawMax  = Math.max(...allVals, 0)
  const maxVal  = niceMax(rawMax)
  const ticks   = yTicks(maxVal)

  const xOf = (i) => PAD.left + (labels.length > 1 ? (i / (labels.length - 1)) * chartW : chartW / 2)
  const yOf = (v) => PAD.top  + chartH - (v / maxVal) * chartH

  /* Build point arrays */
  const seriesPts = series.map(s => ({
    ...s,
    pts: s.data.map((v, i) => ({ x: xOf(i), y: yOf(v), v, label: labels[i] })),
  }))

  /* X-label skip */
  const showEvery = labels.length > 14 ? Math.ceil(labels.length / 7) : labels.length > 7 ? 2 : 1

  /* Mouse hover */
  const onMouseMove = useCallback((e) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const svgX = ((e.clientX - rect.left) / rect.width)  * W
    if (labels.length < 2) return
    const idx = Math.round(((svgX - PAD.left) / chartW) * (labels.length - 1))
    const clamped = Math.max(0, Math.min(labels.length - 1, idx))
    const x = xOf(clamped)
    const y = seriesPts[0]?.pts[clamped]?.y ?? PAD.top
    setTooltip({ idx: clamped, x, y, label: labels[clamped] })
  }, [labels, seriesPts, chartW])

  const onMouseLeave = () => setTooltip(null)

  return (
    <div className="w-full overflow-hidden">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full block"
        style={{ height: 240 }}
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
      >
        <defs>
          {COLORS.map((c, i) => (
            <linearGradient key={i} id={`area-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={c} stopOpacity="0.18" />
              <stop offset="100%" stopColor={c} stopOpacity="0.01" />
            </linearGradient>
          ))}
        </defs>

        {/* Y-axis grid + labels */}
        {ticks.map(t => {
          const y = yOf(t)
          return (
            <g key={t}>
              <line
                x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
                stroke="#f1f5f9" strokeWidth="1"
              />
              <text
                x={PAD.left - 8} y={y + 4}
                textAnchor="end" fontSize="10" fill="#94a3b8" fontFamily="inherit"
              >
                {t >= 1000 ? `${(t / 1000).toFixed(t % 1000 === 0 ? 0 : 1)}k` : t}
              </text>
            </g>
          )
        })}

        {/* X-axis baseline */}
        <line
          x1={PAD.left} y1={PAD.top + chartH}
          x2={W - PAD.right} y2={PAD.top + chartH}
          stroke="#e2e8f0" strokeWidth="1"
        />

        {/* X-axis labels */}
        {labels.map((lbl, i) => {
          if (i % showEvery !== 0 && i !== labels.length - 1) return null
          return (
            <text
              key={i}
              x={xOf(i)} y={H - 8}
              textAnchor="middle" fontSize="10" fill="#94a3b8" fontFamily="inherit"
            >{lbl}</text>
          )
        })}

        {/* Area fills */}
        {seriesPts.map((s, i) => {
          if (s.pts.length < 2) return null
          const line = smoothPath(s.pts)
          const last = s.pts[s.pts.length - 1]
          const first = s.pts[0]
          const area = `${line} L ${last.x},${PAD.top + chartH} L ${first.x},${PAD.top + chartH} Z`
          return <path key={i} d={area} fill={`url(#area-${i})`} />
        })}

        {/* Lines */}
        {seriesPts.map((s, i) => {
          if (s.pts.length < 1) return null
          return (
            <path
              key={i}
              d={smoothPath(s.pts)}
              fill="none"
              stroke={COLORS[i % COLORS.length]}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )
        })}

        {/* Tooltip vertical line */}
        {tooltip && (
          <line
            x1={tooltip.x} y1={PAD.top}
            x2={tooltip.x} y2={PAD.top + chartH}
            stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 3"
          />
        )}

        {/* Dots on hover */}
        {tooltip && seriesPts.map((s, i) => {
          const pt = s.pts[tooltip.idx]
          if (!pt) return null
          return (
            <g key={i}>
              <circle cx={pt.x} cy={pt.y} r="5" fill="white" stroke={COLORS[i % COLORS.length]} strokeWidth="2" />
              <circle cx={pt.x} cy={pt.y} r="2.5" fill={COLORS[i % COLORS.length]} />
            </g>
          )
        })}

        {/* Tooltip box */}
        {tooltip && (() => {
          const boxW = 160, boxH = 16 + seriesPts.length * 18 + 8
          let bx = tooltip.x + 10
          if (bx + boxW > W - PAD.right) bx = tooltip.x - boxW - 10
          const by = PAD.top + 8
          return (
            <g>
              <rect x={bx} y={by} width={boxW} height={boxH} rx="8" fill="white"
                stroke="#e2e8f0" strokeWidth="1"
                style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.10))' }}
              />
              <text x={bx + 10} y={by + 14} fontSize="10" fill="#64748b" fontFamily="inherit" fontWeight="600">
                {tooltip.label}
              </text>
              {seriesPts.map((s, i) => {
                const v = s.pts[tooltip.idx]?.v ?? 0
                return (
                  <g key={i}>
                    <circle cx={bx + 14} cy={by + 22 + i * 18} r="4" fill={COLORS[i % COLORS.length]} />
                    <text x={bx + 24} y={by + 26 + i * 18} fontSize="10" fill="#374151" fontFamily="inherit" fontWeight="500">
                      {s.name.length > 14 ? s.name.slice(0, 13) + '…' : s.name}
                    </text>
                    <text x={bx + boxW - 8} y={by + 26 + i * 18} fontSize="10" fill="#111827" fontFamily="inherit" fontWeight="700" textAnchor="end">
                      {metric === 'revenue' ? `Rs.${fmtNum(v)}` : fmtNum(v)}
                    </text>
                  </g>
                )
              })}
            </g>
          )
        })()}
      </svg>
    </div>
  )
}

/* ─────────────────── Analytics Dashboard Card ─────────────────── */
function AnalyticsDashboard({ analytics, analyticsLoading, analyticsError }) {
  const [range,  setRange]  = React.useState('30d')
  const [metric, setMetric] = React.useState('revenue')

  const data        = analytics[range] || {}
  const restaurants = data.restaurants || []
  const labels      = data.labels      || []

  const series = restaurants.map(r => ({
    name:  r.name,
    data:  metric === 'revenue' ? (r.series?.revenue   || []) : (r.series?.customers   || []),
    total: metric === 'revenue' ? (r.totals?.revenue   || 0)  : (r.totals?.customers   || 0),
  }))

  const grandTotal = series.reduce((s, r) => s + r.total, 0)
  const topRest    = series[0] || null

  return (
    <div className="super-card overflow-hidden">
      {/* ── Header ── */}
      <div className="px-6 pt-6 pb-5 border-b border-gray-100">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">Analytics Pulse</h2>
            <p className="text-xs text-gray-400 mt-0.5">Top restaurant performance · hover chart for details</p>
          </div>

          {/* Range pill tabs */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5 flex-shrink-0">
            {RANGE_OPTIONS.map(opt => (
              <button key={opt.key} type="button"
                onClick={() => setRange(opt.key)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  range === opt.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-400 hover:text-gray-700'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Metric + summary */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {['revenue', 'customers'].map(m => (
              <button key={m} type="button" onClick={() => setMetric(m)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all capitalize ${
                  metric === m
                    ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}>
                {m}
              </button>
            ))}
          </div>
          {!analyticsLoading && !analyticsError && restaurants.length > 0 && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">
                  Total · {RANGE_OPTIONS.find(o => o.key === range)?.title}
                </p>
                <p className="text-xl font-extrabold text-gray-900 leading-tight">
                  {metric === 'revenue' ? `Rs. ${fmtNum(grandTotal)}` : fmtNum(grandTotal)}
                </p>
              </div>
              {topRest && (
                <div className="text-right border-l border-gray-200 pl-4">
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">Top Performer</p>
                  <p className="text-sm font-bold text-gray-900 leading-tight truncate max-w-[160px]">{topRest.name}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Chart body ── */}
      <div className="px-6 pt-5 pb-2">
        {analyticsLoading ? (
          <div className="h-60 flex items-center justify-center">
            <div className="w-7 h-7 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : analyticsError ? (
          <div className="h-60 flex items-center justify-center text-sm text-gray-400">
            Unable to load analytics right now.
          </div>
        ) : restaurants.length === 0 ? (
          <div className="h-60 flex flex-col items-center justify-center text-gray-300 gap-2">
            <FaChartLine className="w-9 h-9" />
            <p className="text-sm font-medium text-gray-400">No analytics data yet</p>
            <p className="text-xs text-gray-300">Data will appear once orders are placed</p>
          </div>
        ) : (
          <LineChart labels={labels} series={series} metric={metric} />
        )}
      </div>

      {/* ── Legend + leaderboard ── */}
      {!analyticsLoading && !analyticsError && restaurants.length > 0 && (
        <div className="px-6 pt-2 pb-6 space-y-3">
          {series.map((s, i) => {
            const pct = grandTotal > 0 ? Math.round((s.total / grandTotal) * 100) : 0
            return (
              <div key={s.name} className="flex items-center gap-3">
                <span className="w-6 text-[10px] font-black text-gray-300 flex-shrink-0">#{i + 1}</span>
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-gray-700 truncate">{s.name}</p>
                    <p className="text-xs font-bold text-gray-900 ml-2 whitespace-nowrap flex-shrink-0">
                      {fmtVal(s.total, metric)}
                      <span className="text-[10px] text-gray-400 font-medium ml-1">{pct}%</span>
                    </p>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─────────────────── Delta badge ─────────────────── */
function DeltaBadge({ delta }) {
  if (delta === null || delta === undefined) return null
  if (delta > 0) return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
      <FaArrowUp className="w-2 h-2" />{delta}%
    </span>
  )
  if (delta < 0) return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">
      <FaArrowDown className="w-2 h-2" />{Math.abs(delta)}%
    </span>
  )
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-gray-400 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded-full">
      <FaMinus className="w-2 h-2" /> 0%
    </span>
  )
}

/* ─────────────────── Activity feed ─────────────────── */
const FEED_MAX = 50
const FEED_EVENT_TYPES = {
  new_order:           { icon: FaShoppingBag, label: 'New order placed', color: 'bg-blue-50 text-blue-600' },
  order_status_update: { icon: FaSyncAlt,     label: 'Order updated',    color: 'bg-indigo-50 text-indigo-600' },
  support_ticket_new:  { icon: FaTicketAlt,   label: 'Support ticket',   color: 'bg-rose-50 text-rose-600' },
  user_last_login:     { icon: FaUsers,       label: 'User logged in',   color: 'bg-green-50 text-green-600' },
}

function relativeTime(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 5)    return 'just now'
  if (diff < 60)   return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

/* ─────────────────── Main Page ─────────────────── */
export default function SuperDashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats]                       = useState(null)
  const [kpis, setKpis]                         = useState(null)
  const [loading, setLoading]                   = useState(true)
  const [analytics, setAnalytics]               = useState({})
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [analyticsError, setAnalyticsError]     = useState(false)
  const [feed, setFeed]                         = useState([])
  const [, setTick]                             = useState(0)
  const feedRef = useRef(null)

  useEffect(() => {
    Promise.all([api.get('/super/stats'), api.get('/super/dashboard-kpis')])
      .then(([s, k]) => { setStats(s.data); setKpis(k.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    let mounted = true
    setAnalyticsLoading(true); setAnalyticsError(false)
    Promise.all(['24h', '30d', '6m'].map(r => api.get(`/super/analytics?range=${r}`)))
      .then(responses => {
        if (!mounted) return
        const next = {}
        responses.forEach((res, i) => { next[['24h', '30d', '6m'][i]] = res.data })
        setAnalytics(next)
      })
      .catch(() => { if (mounted) setAnalyticsError(true) })
      .finally(() => { if (mounted) setAnalyticsLoading(false) })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    socket.emit('join_super_admin')
    const addEntry = (type, data) => {
      const cfg = FEED_EVENT_TYPES[type]; if (!cfg) return
      let detail = ''
      if (type === 'new_order')           detail = `Order #${String(data.id || '').slice(-6).toUpperCase()} – Rs. ${(data.totalPrice || 0).toFixed(0)}`
      else if (type === 'order_status_update') detail = `Order #${String(data.orderId || '').slice(-6).toUpperCase()} → ${data.status}`
      else if (type === 'support_ticket_new')  detail = `"${data.title || 'New ticket'}"${data.restaurant?.name ? ` from ${data.restaurant.name}` : ''}`
      else if (type === 'user_last_login')     detail = `${data.name || 'User'} (${data.role || ''})`
      const entry = { id: `${type}-${Date.now()}-${Math.random()}`, type, ...cfg, detail, ts: Date.now() }
      setFeed(prev => [entry, ...prev].slice(0, FEED_MAX))
    }
    const handlers = {
      new_order:           d => addEntry('new_order', d),
      order_status_update: d => addEntry('order_status_update', d),
      support_ticket_new:  d => addEntry('support_ticket_new', d),
      user_last_login:     d => addEntry('user_last_login', d),
    }
    Object.entries(handlers).forEach(([ev, h]) => socket.on(ev, h))
    const ticker = setInterval(() => setTick(t => t + 1), 30000)
    return () => { Object.entries(handlers).forEach(([ev, h]) => socket.off(ev, h)); clearInterval(ticker) }
  }, [])

  /* ── KPI cards ── */
  const kpiCards = [
    {
      key: 'totalRestaurants', label: 'Total Restaurants', icon: FaBuilding,
      value: stats?.totalRestaurants ?? '-',
      sub:   `${stats?.activeRestaurants ?? 0} active`,
      accent: '#8b5cf6',
    },
    {
      key: 'totalUsers', label: 'Total Users', icon: FaUsers,
      value: stats?.totalUsers ?? '-',
      accent: '#0ea5e9',
    },
    {
      key: 'totalRevenue', label: 'Total Revenue', icon: FaChartLine,
      value: `Rs. ${(stats?.totalRevenue || 0).toLocaleString()}`,
      accent: '#22c55e',
    },
    {
      key: 'todayOrders', label: "Today's Orders", icon: FaShoppingBag,
      value: kpis?.todayOrders ?? '-',
      sub:   `vs ${kpis?.yesterdayOrders ?? 0} yesterday`,
      delta: kpis?.orderDelta,
      accent: '#f59e0b',
    },
    {
      key: 'todayRevenue', label: "Today's Revenue", icon: FaMoneyBillWave,
      value: kpis != null ? `Rs. ${(kpis.todayRevenue || 0).toLocaleString()}` : '-',
      sub:   `vs Rs. ${(kpis?.yesterdayRevenue || 0).toLocaleString()} yesterday`,
      delta: kpis?.revenueDelta,
      accent: '#10b981',
    },
    {
      key: 'openTickets', label: 'Open Tickets', icon: FaTicketAlt,
      value: kpis?.openTickets ?? '-',
      sub:   'support requests',
      clickTo: '/super/tickets',
      urgent: (kpis?.openTickets || 0) > 0,
      accent: '#ef4444',
    },
    {
      key: 'inactiveRestaurants', label: 'Inactive', icon: FaExclamationTriangle,
      value: kpis?.inactiveRestaurants ?? '-',
      sub:   'need attention',
      clickTo: '/super/restaurants',
      accent: '#f97316',
    },
  ]

  /* ── PDF report ── */
  const generatePDFReport = () => {
    const now = new Date()
    const month = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' })
    const html = `<!DOCTYPE html><html><head><title>Code Yatra – Platform Report ${month}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111;padding:40px}
h1{font-size:24px;font-weight:900;color:#dc2626;margin-bottom:4px}.subtitle{color:#6b7280;font-size:13px;margin-bottom:32px}
.section{margin-bottom:28px}.section h2{font-size:14px;font-weight:700;color:#374151;border-bottom:2px solid #f3f4f6;padding-bottom:6px;margin-bottom:14px;text-transform:uppercase;letter-spacing:.05em}
.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.kpi{background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:14px}
.kpi-label{font-size:11px;color:#9ca3af;font-weight:600;margin-bottom:4px}.kpi-value{font-size:20px;font-weight:900;color:#111}
.footer{margin-top:40px;font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:12px}@media print{body{padding:28px}}</style></head>
<body><h1>Code Yatra – Platform Report</h1><p class="subtitle">Generated: ${now.toLocaleString('en-IN')} · Period: ${month}</p>
<div class="section"><h2>Platform KPIs</h2><div class="kpi-grid">
<div class="kpi"><div class="kpi-label">Total Restaurants</div><div class="kpi-value">${stats?.totalRestaurants ?? '-'}</div></div>
<div class="kpi"><div class="kpi-label">Active Restaurants</div><div class="kpi-value">${stats?.activeRestaurants ?? '-'}</div></div>
<div class="kpi"><div class="kpi-label">Total Users</div><div class="kpi-value">${stats?.totalUsers ?? '-'}</div></div>
<div class="kpi"><div class="kpi-label">Total Revenue</div><div class="kpi-value">Rs. ${(stats?.totalRevenue || 0).toLocaleString()}</div></div>
<div class="kpi"><div class="kpi-label">Today's Orders</div><div class="kpi-value">${kpis?.todayOrders ?? '-'}</div></div>
<div class="kpi"><div class="kpi-label">Today's Revenue</div><div class="kpi-value">Rs. ${(kpis?.todayRevenue || 0).toLocaleString()}</div></div>
<div class="kpi"><div class="kpi-label">Open Tickets</div><div class="kpi-value">${kpis?.openTickets ?? '-'}</div></div>
<div class="kpi"><div class="kpi-label">Inactive Restaurants</div><div class="kpi-value">${kpis?.inactiveRestaurants ?? '-'}</div></div>
</div></div><div class="footer">Code Yatra SaaS – Super Admin Platform Report – ${now.toISOString()} – Confidential</div></body></html>`
    // Use Blob URL instead of deprecated document.write()
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:absolute;left:-9999px;width:0;height:0;border:0;'
    document.body.appendChild(iframe)
    iframe.onload = () => {
      iframe.contentWindow.print()
      setTimeout(() => { document.body.removeChild(iframe); URL.revokeObjectURL(url) }, 1000)
    }
    iframe.src = url
  }

  return (
    <div className="min-w-0 w-full space-y-6">

      {/* ── Hero header banner ── */}
      <div className="super-card p-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
          <div className="absolute -right-20 -top-20 w-56 h-56 rounded-full bg-brand-100/50 blur-3xl" />
          <div className="absolute -left-16 -bottom-16 w-48 h-48 rounded-full bg-sky-100/50 blur-3xl" />
        </div>
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-600/30 flex-shrink-0">
              <FaUserShield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Super Admin Dashboard</h1>
              <p className="text-gray-500 text-sm mt-0.5">Real-time platform intelligence and system health</p>
            </div>
          </div>
          {!loading && stats && (
            <div className="flex items-center gap-3 flex-wrap">
              {[
                { label: 'Restaurants', val: stats.totalRestaurants },
                { label: 'Users', val: stats.totalUsers },
                { label: 'Revenue', val: `Rs. ${(stats.totalRevenue || 0).toLocaleString()}` },
              ].map(b => (
                <span key={b.label} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/80 border border-gray-200 text-gray-700">
                  {b.label}: {b.val}
                </span>
              ))}
              {kpis?.openTickets > 0 && (
                <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700">
                  Open tickets: {kpis.openTickets}
                </span>
              )}
              <button onClick={generatePDFReport}
                className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold px-4 py-2 rounded-xl text-sm shadow-sm transition-colors">
                <FaFilePdf className="w-3.5 h-3.5 text-red-500" /> Report
              </button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-[2.5px] border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {kpiCards.map(card => {
              const Icon = card.icon
              const Tag  = card.clickTo ? 'button' : 'div'
              return (
                <Tag
                  key={card.key}
                  onClick={card.clickTo ? () => navigate(card.clickTo) : undefined}
                  className={[
                    'super-card-hover relative p-5 flex items-center gap-3.5 w-full text-left min-w-0',
                    card.urgent ? 'border-rose-200 ring-1 ring-rose-100' : '',
                    card.clickTo ? 'cursor-pointer' : '',
                  ].join(' ')}
                >
                  {/* Accent top bar */}
                  <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl" style={{ background: card.accent }} />
                  <div
                    className="relative z-10 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${card.accent}18` }}
                  >
                    <Icon className="w-4.5 h-4.5" style={{ color: card.accent, width: 18, height: 18 }} />
                  </div>
                  <div className="relative z-10 min-w-0 flex-1">
                    <p className="text-gray-400 text-xs font-medium truncate">{card.label}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <p className="text-gray-900 text-xl font-extrabold leading-tight truncate">{card.value}</p>
                      {card.delta !== undefined && <DeltaBadge delta={card.delta} />}
                    </div>
                    {card.sub && <p className="text-gray-400 text-[11px] mt-0.5 truncate">{card.sub}</p>}
                  </div>
                </Tag>
              )
            })}
          </div>

          {/* ── Quick Actions ── */}
          <div className="super-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Quick Actions</h2>
                <p className="text-xs text-gray-300 mt-0.5">Shortcuts for daily admin work</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => navigate('/super/restaurants', { state: { openCreate: true } })}
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all shadow-sm hover:shadow-md">
                <FaPlus className="w-3 h-3" /> New Restaurant
              </button>
              <button onClick={() => navigate('/super/announcements')}
                className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-purple-50 hover:border-purple-200 text-gray-700 hover:text-purple-700 font-semibold px-4 py-2 rounded-xl text-sm transition-all shadow-sm">
                <FaBullhorn className="w-3.5 h-3.5" /> Send Announcement
              </button>
              <button onClick={() => {
                if (!stats) return
                const rows = [
                  ['Metric','Value'],
                  ['Total Restaurants', stats.totalRestaurants],
                  ['Active Restaurants', stats.activeRestaurants],
                  ['Total Users', stats.totalUsers],
                  ['Total Orders', stats.totalOrders],
                  ['Total Revenue (Rs.)', stats.totalRevenue],
                  ["Today's Orders", kpis?.todayOrders ?? 0],
                  ["Today's Revenue (Rs.)", kpis?.todayRevenue ?? 0],
                  ['Open Tickets', kpis?.openTickets ?? 0],
                  ['Inactive Restaurants', kpis?.inactiveRestaurants ?? 0],
                ]
                const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
                const url  = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
                const a    = document.createElement('a'); a.href = url; a.download = `platform_stats_${Date.now()}.csv`; a.click()
                URL.revokeObjectURL(url)
              }}
                className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-green-50 hover:border-green-200 text-gray-700 hover:text-green-700 font-semibold px-4 py-2 rounded-xl text-sm transition-all shadow-sm">
                <FaDownload className="w-3.5 h-3.5" /> Export CSV
              </button>
              <button onClick={() => navigate('/super/health')}
                className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-blue-50 hover:border-blue-200 text-gray-700 hover:text-blue-700 font-semibold px-4 py-2 rounded-xl text-sm transition-all shadow-sm">
                <FaSyncAlt className="w-3.5 h-3.5" /> System Health
              </button>
              <button onClick={() => navigate('/super/onboarding')}
                className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-amber-50 hover:border-amber-200 text-gray-700 hover:text-amber-700 font-semibold px-4 py-2 rounded-xl text-sm transition-all shadow-sm">
                <FaRocket className="w-3.5 h-3.5" /> Onboarding
              </button>
              <button onClick={() => navigate('/super/tickets')}
                className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-rose-50 hover:border-rose-200 text-gray-700 hover:text-rose-700 font-semibold px-4 py-2 rounded-xl text-sm transition-all shadow-sm">
                <FaTicketAlt className="w-3.5 h-3.5" /> Support Tickets
                {kpis?.openTickets > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{kpis.openTickets}</span>
                )}
              </button>
            </div>
          </div>

          {/* ── Analytics ── */}
          <AnalyticsDashboard
            analytics={analytics}
            analyticsLoading={analyticsLoading}
            analyticsError={analyticsError}
          />

          {/* ── Live Activity Feed ── */}
          <div className="super-card overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                  <FaCircle className="w-2.5 h-2.5 text-green-500 animate-pulse" />
                  Live Activity Feed
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Real-time platform events via WebSocket</p>
              </div>
              {feed.length > 0 && (
                <button onClick={() => setFeed([])}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors font-medium px-3 py-1.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-50">
                  Clear
                </button>
              )}
            </div>
            <div ref={feedRef}>
              {feed.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-gray-300 gap-2">
                  <FaCircle className="w-4 h-4 animate-pulse text-green-300" />
                  <p className="text-sm font-medium text-gray-400">Listening for platform events…</p>
                  <p className="text-xs text-gray-300">Orders, tickets, and logins will appear here in real time</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                  {feed.map(entry => {
                    const Icon = entry.icon
                    return (
                      <div key={entry.id}
                        className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 transition-colors">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 ${entry.color}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{entry.label}</p>
                          <p className="text-xs text-gray-400 truncate">{entry.detail}</p>
                        </div>
                        <span className="text-xs text-gray-300 whitespace-nowrap flex-shrink-0">{relativeTime(entry.ts)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
