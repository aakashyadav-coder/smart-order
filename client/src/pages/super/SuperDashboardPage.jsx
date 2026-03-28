/**
 * SuperDashboardPage - Platform overview with enhanced KPI cards
 * Theme: Soft gradients, premium white cards, bold accents
 */
import React, { useEffect, useState, useRef } from 'react'
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


/* ---------------- Analytics chart helpers ---------------- */
const RANGE_OPTIONS = [
  { key: '24h', label: '24H', title: 'Last 24 Hours' },
  { key: '30d', label: '30D', title: 'Last 30 Days' },
  { key: '6m',  label: '6M',  title: 'Last 6 Months' },
]
const CHART_COLORS = ['#ef4444', '#0ea5e9', '#22c55e', '#f59e0b']

function formatNumber(value) { return (value || 0).toLocaleString() }
function formatMetric(value, metric) {
  return metric === 'revenue' ? `Rs. ${formatNumber(value)}` : `${formatNumber(value)}`
}

/* Single unified analytics dashboard card */
function AnalyticsDashboard({ analytics, analyticsLoading, analyticsError }) {
  const [range, setRange]   = React.useState('30d')
  const [metric, setMetric] = React.useState('revenue')

  const data        = analytics[range] || {}
  const restaurants = data.restaurants || []
  const labels      = data.labels || []

  const series = restaurants.map(r => ({
    name:  r.name,
    data:  metric === 'revenue' ? (r.series?.revenue || []) : (r.series?.customers || []),
    total: metric === 'revenue' ? (r.totals?.revenue  || 0)  : (r.totals?.customers  || 0),
  }))

  /* aggregate total across all top restaurantss */
  const grandTotal = series.reduce((s, r) => s + r.total, 0)
  const topRest    = series[0] || null

  /* chart geometry */
  const allValues = series.flatMap(s => s.data)
  const max   = Math.max(...allValues, 1)
  const min   = Math.min(...allValues, 0)
  const range_ = Math.max(max - min, 1)
  const showEvery = labels.length > 12 ? Math.ceil(labels.length / 6) : 1

  const buildPath = (data, forArea = false) => {
    if (!data.length) return ''
    const pts = data.map((v, i) => {
      const x = data.length === 1 ? 50 : (i / (data.length - 1)) * 100
      const y = 88 - ((v - min) / range_) * 75
      return { x, y }
    })
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
    if (forArea) return `${line} L ${pts[pts.length - 1].x.toFixed(2)},96 L 0,96 Z`
    return line
  }

  return (
    <div className="super-card overflow-hidden">
      {/* Card header */}
      <div className="px-6 pt-5 pb-4 border-b border-gray-100">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900">Analytics Pulse</h2>
            <p className="text-xs text-gray-400 mt-0.5">Top restaurant performance across time windows</p>
          </div>
          {/* Range tabs */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
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

        {/* Metric toggle + aggregate summary */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => setMetric('revenue')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all ${
                metric === 'revenue'
                  ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}>Revenue</button>
            <button type="button" onClick={() => setMetric('customers')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all ${
                metric === 'customers'
                  ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}>Customers</button>
          </div>
          {/* Summary pills */}
          {!analyticsLoading && !analyticsError && restaurants.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Total ({RANGE_OPTIONS.find(o=>o.key===range)?.title})</p>
                <p className="text-base font-extrabold text-gray-900 leading-tight">
                  {metric === 'revenue' ? `Rs. ${formatNumber(grandTotal)}` : formatNumber(grandTotal)}
                </p>
              </div>
              {topRest && (
                <div className="text-right border-l border-gray-200 pl-3">
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Top Performer</p>
                  <p className="text-sm font-bold text-gray-900 leading-tight truncate max-w-[140px]">{topRest.name}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chart body */}
      <div className="px-6 py-5">
        {analyticsLoading ? (
          <div className="h-52 flex items-center justify-center">
            <div className="w-7 h-7 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : analyticsError ? (
          <div className="h-52 flex items-center justify-center text-sm text-gray-400">Unable to load analytics right now.</div>
        ) : restaurants.length === 0 ? (
          <div className="h-52 flex flex-col items-center justify-center text-gray-300 gap-2">
            <FaChartLine className="w-8 h-8" />
            <p className="text-sm font-medium">No analytics data yet</p>
          </div>
        ) : (
          <>
            {/* SVG chart with area fill */}
            <div className="relative h-52 rounded-2xl bg-gradient-to-b from-gray-50/60 to-white border border-gray-100 overflow-hidden">
              <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                <defs>
                  {CHART_COLORS.map((color, i) => (
                    <linearGradient key={i} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={color} stopOpacity="0.22" />
                      <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                  ))}
                </defs>
                {/* Grid lines */}
                {[25, 50, 75].map(y => (
                  <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="#f1f5f9" strokeWidth="0.5" />
                ))}
                {/* Area fills then lines */}
                {series.map((s, i) => (
                  <g key={s.name}>
                    <path d={buildPath(s.data, true)} fill={`url(#grad-${i})`} />
                    <path d={buildPath(s.data)}       fill="none" stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    {/* End dot */}
                    {s.data.length > 0 && (() => {
                      const lastIdx = s.data.length - 1
                      const x = lastIdx === 0 ? 50 : (lastIdx / (s.data.length - 1)) * 100
                      const y = 88 - ((s.data[lastIdx] - min) / range_) * 75
                      return <circle cx={x.toFixed(2)} cy={y.toFixed(2)} r="1.4" fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    })()}
                  </g>
                ))}
              </svg>
            </div>
            {/* X-axis labels */}
            <div className="flex justify-between text-[10px] text-gray-400 mt-2 px-0.5">
              {labels.map((l, i) => (
                <span key={i} style={{ visibility: (i % showEvery === 0 || i === labels.length - 1) ? 'visible' : 'hidden' }}>{l}</span>
              ))}
            </div>

            {/* Restaurant leaderboard */}
            <div className="mt-5 space-y-2">
              {series.map((s, i) => {
                const pct = grandTotal > 0 ? Math.round((s.total / grandTotal) * 100) : 0
                return (
                  <div key={s.name} className="flex items-center gap-3">
                    <span className="w-5 text-[10px] font-black text-gray-300">#{i + 1}</span>
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-xs font-semibold text-gray-700 truncate">{s.name}</p>
                        <p className="text-xs font-bold text-gray-900 ml-2 whitespace-nowrap">
                          {metric === 'revenue' ? `Rs. ${formatNumber(s.total)}` : formatNumber(s.total)}
                          <span className="text-[10px] text-gray-400 font-medium ml-1">{pct}%</span>
                        </p>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1">
                        <div className="h-1 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ---------------- Delta badge ---------------- */
function DeltaBadge({ delta }) {
  if (delta === null || delta === undefined) return null
  if (delta > 0) return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
      <FaArrowUp className="w-2.5 h-2.5" />{delta}%
    </span>
  )
  if (delta < 0) return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">
      <FaArrowDown className="w-2.5 h-2.5" />{Math.abs(delta)}%
    </span>
  )
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-gray-400 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded-full">
      <FaMinus className="w-2.5 h-2.5" /> 0%
    </span>
  )
}

/* ---------------- Activity feed helpers ---------------- */
const FEED_MAX = 50
const FEED_EVENT_TYPES = {
  new_order:           { icon: FaShoppingBag, label: 'New order placed', color: 'bg-blue-50 text-blue-600' },
  order_status_update: { icon: FaSyncAlt,     label: 'Order updated',    color: 'bg-indigo-50 text-indigo-600' },
  support_ticket_new:  { icon: FaTicketAlt,   label: 'Support ticket',   color: 'bg-rose-50 text-rose-600' },
  user_last_login:     { icon: FaUsers,       label: 'User logged in',   color: 'bg-green-50 text-green-600' },
}

function relativeTime(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 5)  return 'just now'
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

/* ---------------- Main page ---------------- */
export default function SuperDashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats]                   = useState(null)
  const [kpis, setKpis]                     = useState(null)
  const [loading, setLoading]               = useState(true)
  const [analytics, setAnalytics]           = useState({})
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [analyticsError, setAnalyticsError] = useState(false)
  const [feed, setFeed]                     = useState([])
  const [, setTick]                         = useState(0) // force re-render for relative timestamps
  const feedRef = useRef(null)

  useEffect(() => {
    Promise.all([api.get('/super/stats'), api.get('/super/dashboard-kpis')])
      .then(([s, k]) => { setStats(s.data); setKpis(k.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    let mounted = true
    const ranges = ['24h', '30d', '6m']
    setAnalyticsLoading(true); setAnalyticsError(false)
    Promise.all(ranges.map(r => api.get(`/super/analytics?range=${r}`)))
      .then(responses => {
        if (!mounted) return
        const next = {}
        responses.forEach((res, i) => { next[ranges[i]] = res.data })
        setAnalytics(next)
      })
      .catch(() => { if (mounted) setAnalyticsError(true) })
      .finally(() => { if (mounted) setAnalyticsLoading(false) })
    return () => { mounted = false }
  }, [])

  // Live Activity Feed - socket subscriptions
  useEffect(() => {
    socket.emit('join_super_admin')

    const addEntry = (type, data) => {
      const cfg = FEED_EVENT_TYPES[type]
      if (!cfg) return
      let detail = ''
      if (type === 'new_order') detail = `Order #${String(data.id || '').slice(-6).toUpperCase()} - Rs. ${(data.totalPrice || 0).toFixed(0)}`
      else if (type === 'order_status_update') detail = `Order #${String(data.orderId || '').slice(-6).toUpperCase()} -> ${data.status}`
      else if (type === 'support_ticket_new') detail = `"${data.title || 'New ticket'}"${data.restaurant?.name ? ` from ${data.restaurant.name}` : ''}`
      else if (type === 'user_last_login') detail = `${data.name || 'User'} (${data.role || ''})`

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

    // Refresh relative timestamps every 30s
    const ticker = setInterval(() => setTick(t => t + 1), 30000)

    return () => {
      Object.entries(handlers).forEach(([ev, h]) => socket.off(ev, h))
      clearInterval(ticker)
    }
  }, [])

  /* ---------------- KPI card definitions ---------------- */
  const kpiCards = [
    {
      key: 'totalRestaurants', label: 'Total Restaurants', icon: FaBuilding,
      iconBg: 'bg-purple-50 text-purple-600',
      value: stats?.totalRestaurants ?? '-',
      sub: `${stats?.activeRestaurants ?? 0} active`,
    },
    {
      key: 'totalUsers', label: 'Total Users', icon: FaUsers,
      iconBg: 'bg-blue-50 text-blue-600',
      value: stats?.totalUsers ?? '-',
    },
    {
      key: 'totalRevenue', label: 'Total Revenue', icon: FaChartLine,
      iconBg: 'bg-green-50 text-green-600',
      value: `Rs. ${(stats?.totalRevenue || 0).toLocaleString()}`,
    },
    {
      key: 'todayOrders', label: "Today's Orders", icon: FaShoppingBag,
      iconBg: 'bg-amber-50 text-amber-600',
      value: kpis?.todayOrders ?? '-',
      sub: `vs ${kpis?.yesterdayOrders ?? 0} yesterday`,
      delta: kpis?.orderDelta,
    },
    {
      key: 'todayRevenue', label: "Today's Revenue", icon: FaMoneyBillWave,
      iconBg: 'bg-emerald-50 text-emerald-600',
      value: kpis != null ? `Rs. ${(kpis.todayRevenue || 0).toLocaleString()}` : '-',
      sub: `vs Rs. ${(kpis?.yesterdayRevenue || 0).toLocaleString()} yesterday`,
      delta: kpis?.revenueDelta,
    },
    {
      key: 'openTickets', label: 'Open Tickets', icon: FaTicketAlt,
      iconBg: 'bg-rose-50 text-rose-600',
      value: kpis?.openTickets ?? '-',
      sub: 'support requests',
      clickTo: '/super/tickets',
      urgent: (kpis?.openTickets || 0) > 0,
    },
    {
      key: 'inactiveRestaurants', label: 'Inactive Restaurants', icon: FaExclamationTriangle,
      iconBg: 'bg-orange-50 text-orange-600',
      value: kpis?.inactiveRestaurants ?? '-',
      sub: 'need attention',
      clickTo: '/super/restaurants',
    },
  ]

  /* ---------------- PDF Report generator ---------------- */
  const generatePDFReport = () => {
    const now = new Date()
    const month = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' })
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Smart Order - Platform Report ${month}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; padding: 40px; }
    h1 { font-size: 24px; font-weight: 900; color: #dc2626; margin-bottom: 4px; }
    .subtitle { color: #6b7280; font-size: 13px; margin-bottom: 32px; }
    .section { margin-bottom: 28px; }
    .section h2 { font-size: 14px; font-weight: 700; color: #374151; border-bottom: 2px solid #f3f4f6; padding-bottom: 6px; margin-bottom: 14px; text-transform: uppercase; letter-spacing: 0.05em; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .kpi { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; }
    .kpi-label { font-size: 11px; color: #9ca3af; font-weight: 600; margin-bottom: 4px; }
    .kpi-value { font-size: 20px; font-weight: 900; color: #111; }
    .footer { margin-top: 40px; font-size: 11px; color: #9ca3af; border-top: 1px solid #f3f4f6; padding-top: 12px; }
    @media print { body { padding: 28px; } }
  </style>
</head>
<body>
  <h1>Smart Order - Platform Report</h1>
  <p class="subtitle">Generated: ${now.toLocaleString('en-IN')} - Period: ${month}</p>

  <div class="section">
    <h2>Platform KPIs</h2>
    <div class="kpi-grid">
      <div class="kpi"><div class="kpi-label">Total Restaurants</div><div class="kpi-value">${stats?.totalRestaurants ?? '-'}</div></div>
      <div class="kpi"><div class="kpi-label">Active Restaurants</div><div class="kpi-value">${stats?.activeRestaurants ?? '-'}</div></div>
      <div class="kpi"><div class="kpi-label">Total Users</div><div class="kpi-value">${stats?.totalUsers ?? '-'}</div></div>
      <div class="kpi"><div class="kpi-label">Total Revenue</div><div class="kpi-value">Rs. ${(stats?.totalRevenue || 0).toLocaleString()}</div></div>
      <div class="kpi"><div class="kpi-label">Today's Orders</div><div class="kpi-value">${kpis?.todayOrders ?? '-'}</div></div>
      <div class="kpi"><div class="kpi-label">Today's Revenue</div><div class="kpi-value">Rs. ${(kpis?.todayRevenue || 0).toLocaleString()}</div></div>
      <div class="kpi"><div class="kpi-label">Open Tickets</div><div class="kpi-value">${kpis?.openTickets ?? '-'}</div></div>
      <div class="kpi"><div class="kpi-label">Inactive Restaurants</div><div class="kpi-value">${kpis?.inactiveRestaurants ?? '-'}</div></div>
    </div>
  </div>

  <div class="footer">
    Smart Order SaaS - Super Admin Platform Report - ${now.toISOString()} - Confidential
  </div>
</body>
</html>`
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:absolute;left:-9999px;width:0;height:0;border:0;'
    document.body.appendChild(iframe)
    iframe.contentDocument.open()
    iframe.contentDocument.write(html)
    iframe.contentDocument.close()
    setTimeout(() => { iframe.contentWindow.print(); document.body.removeChild(iframe) }, 300)
  }

  return (
    <div className="relative">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-20 -right-16 h-64 w-64 rounded-full bg-brand-100 blur-3xl opacity-60" />
        <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-amber-100 blur-3xl opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-brand-50" />
      </div>

      <div className="super-card p-6 md:p-7 mb-8 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-brand-100/70 blur-3xl" />
        <div className="absolute -left-10 -bottom-10 w-56 h-56 rounded-full bg-sky-100/70 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-600/30">
              <FaUserShield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">Super Admin Dashboard</h1>
              <p className="text-gray-500 text-sm mt-1">Real-time platform intelligence and system health</p>
            </div>
          </div>
          {!loading && stats && (
            <button onClick={generatePDFReport}
              className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold px-4 py-2.5 rounded-xl text-sm shadow-sm transition-colors">
              <FaFilePdf className="w-3.5 h-3.5 text-red-500" /> Monthly Report
            </button>
          )}
        </div>
        {!loading && stats && (
          <div className="relative mt-4 flex flex-wrap gap-2">
            <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/80 border border-gray-200 text-gray-700">
              Restaurants: {stats.totalRestaurants}
            </span>
            <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/80 border border-gray-200 text-gray-700">
              Users: {stats.totalUsers}
            </span>
            <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/80 border border-gray-200 text-gray-700">
              Revenue: Rs. {(stats.totalRevenue || 0).toLocaleString()}
            </span>
            {kpis?.openTickets > 0 && (
              <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700">
                Open tickets: {kpis.openTickets}
              </span>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" style={{ borderWidth: '2.5px' }} />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
            {kpiCards.map(card => {
              const Icon = card.icon
              const isClickable = !!card.clickTo
              const Tag = isClickable ? 'button' : 'div'
              return (
                <Tag
                  key={card.key}
                  onClick={isClickable ? () => navigate(card.clickTo) : undefined}
                  className={[
                    'super-card-hover relative p-5 flex items-center gap-4 w-full text-left',
                    card.urgent ? 'border-rose-200 ring-1 ring-rose-100' : 'border-gray-100',
                    isClickable ? 'cursor-pointer' : '',
                  ].join(' ')}
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-500 via-amber-400 to-sky-400 opacity-70" />
                  <div className="absolute -right-10 -top-10 w-24 h-24 bg-brand-100/60 rounded-full blur-2xl" />
                  <div className="relative z-10 w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/80 border border-gray-200">
                    <Icon className="w-5 h-5 text-gray-700" />
                  </div>
                  <div className="relative z-10 min-w-0 flex-1">
                    <p className="text-gray-400 text-xs font-medium truncate">{card.label}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-gray-900 text-2xl font-extrabold leading-none">{card.value}</p>
                      {card.delta !== undefined && <DeltaBadge delta={card.delta} />}
                    </div>
                    {card.sub && <p className="text-gray-400 text-xs mt-1 truncate">{card.sub}</p>}
                  </div>
                </Tag>
              )
            })}
          </div>

          {/* Quick Actions */}
          <div className="super-card p-5 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Quick Actions</h2>
              <span className="text-xs text-gray-400">Shortcuts for daily admin work</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => navigate('/super/restaurants', { state: { openCreate: true } })}
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all shadow-sm hover:shadow-md"
              >
                <FaPlus className="w-3 h-3" /> New Restaurant
              </button>

              <button
                onClick={() => navigate('/super/announcements')}
                className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-purple-50 hover:border-purple-200 text-gray-700 hover:text-purple-700 font-semibold px-4 py-2.5 rounded-xl text-sm transition-all shadow-sm"
              >
                <FaBullhorn className="w-3.5 h-3.5" /> Send Announcement
              </button>

              <button
                onClick={() => {
                  if (!stats) return
                  const headers = ['Metric', 'Value']
                  const rows = [
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
                  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
                  const blob = new Blob([csv], { type: 'text/csv' })
                  const url  = URL.createObjectURL(blob)
                  const a    = document.createElement('a'); a.href = url; a.download = `platform_stats_${Date.now()}.csv`; a.click()
                  URL.revokeObjectURL(url)
                }}
                className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-green-50 hover:border-green-200 text-gray-700 hover:text-green-700 font-semibold px-4 py-2.5 rounded-xl text-sm transition-all shadow-sm"
              >
                <FaDownload className="w-3.5 h-3.5" /> Export Stats CSV
              </button>

              <button
                onClick={() => navigate('/super/health')}
                className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-blue-50 hover:border-blue-200 text-gray-700 hover:text-blue-700 font-semibold px-4 py-2.5 rounded-xl text-sm transition-all shadow-sm"
              >
                <FaSyncAlt className="w-3.5 h-3.5" /> System Health
              </button>

              <button
                onClick={() => navigate('/super/onboarding')}
                className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-amber-50 hover:border-amber-200 text-gray-700 hover:text-amber-700 font-semibold px-4 py-2.5 rounded-xl text-sm transition-all shadow-sm"
              >
                <FaRocket className="w-3.5 h-3.5" /> Onboarding Pipeline
              </button>

              <button
                onClick={() => navigate('/super/tickets')}
                className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-rose-50 hover:border-rose-200 text-gray-700 hover:text-rose-700 font-semibold px-4 py-2.5 rounded-xl text-sm transition-all shadow-sm"
              >
                <FaTicketAlt className="w-3.5 h-3.5" /> Support Tickets
                {kpis?.openTickets > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full ml-0.5">{kpis.openTickets}</span>
                )}
              </button>
            </div>
          </div>

          {/* Analytics */}
          <AnalyticsDashboard
            analytics={analytics}
            analyticsLoading={analyticsLoading}
            analyticsError={analyticsError}
          />

          {/* Live Activity Feed */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                  <FaCircle className="w-2.5 h-2.5 text-green-500 animate-pulse" />
                  Live Activity Feed
                </h2>
                <p className="text-xs text-gray-400 mt-1">Real-time platform events via WebSocket</p>
              </div>
              {feed.length > 0 && (
                <button onClick={() => setFeed([])}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors font-medium px-3 py-1.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-50">
                  Clear
                </button>
              )}
            </div>
            <div ref={feedRef} className="super-card overflow-hidden">
              {feed.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-300">
                  <FaCircle className="w-4 h-4 mb-3 animate-pulse text-green-300" />
                  <p className="text-sm font-medium">Listening for platform events...</p>
                  <p className="text-xs mt-1">Orders, tickets, and logins will appear here in real time</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                  {feed.map(entry => {
                    const Icon = entry.icon
                    return (
                      <div key={entry.id}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors animate-slide-up">
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

