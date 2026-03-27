/**
 * SuperDashboardPage — Platform overview with enhanced KPI cards
 * Theme: White cards, brand red accents, SVG charts
 */
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import {
  FaBuilding, FaUsers, FaChartLine, FaShoppingBag,
  FaMoneyBillWave, FaTicketAlt, FaExclamationTriangle,
  FaArrowUp, FaArrowDown, FaMinus,
} from 'react-icons/fa'
import { ChartSkeleton } from '../../components/Skeleton'

/* ─── Analytics chart helpers ──────────────────────────────────────────────── */
const RANGE_OPTIONS = [
  { key: '24h', title: 'Last 24 Hours', subtitle: 'Hourly pulse for top 3 restaurants' },
  { key: '30d', title: 'Last 30 Days',  subtitle: 'Daily trend for top performers' },
  { key: '6m',  title: 'Last 6 Months', subtitle: 'Monthly growth overview' },
]
const CHART_COLORS = ['#ef4444', '#0ea5e9', '#22c55e']

function formatNumber(value) { return (value || 0).toLocaleString() }
function formatMetric(value, metric) {
  return metric === 'revenue' ? `Rs. ${formatNumber(value)}` : `${formatNumber(value)} customers`
}

function MultiLineChart({ labels, series, colors }) {
  const allValues = series.flatMap(s => s.data)
  const max = Math.max(...allValues, 1)
  const min = Math.min(...allValues, 0)
  const range = Math.max(max - min, 1)
  const showEvery = labels.length > 12 ? Math.ceil(labels.length / 6) : 1

  const buildPath = data => {
    const points = data.map((v, i) => {
      const x = data.length === 1 ? 50 : (i / (data.length - 1)) * 100
      const y = 92 - ((v - min) / range) * 72
      return { x, y }
    })
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ')
  }

  return (
    <div className="relative">
      <div className="relative h-52 rounded-2xl bg-gradient-to-b from-gray-50 via-white to-white border border-gray-100 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(14,165,233,0.12),transparent_55%),radial-gradient(circle_at_80%_0%,rgba(34,197,94,0.12),transparent_40%)]" />
        <svg viewBox="0 0 100 100" className="relative w-full h-full">
          {[20, 40, 60, 80].map(y => (
            <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="#eef2f7" strokeDasharray="2 3" />
          ))}
          {series.map((s, i) => {
            const path = buildPath(s.data)
            const glowId = `glow-${i}`
            return (
              <g key={s.name}>
                <defs>
                  <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="1.6" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                <path d={path} stroke={colors[i % colors.length]} strokeWidth="2.6" fill="none" filter={`url(#${glowId})`} />
              </g>
            )
          })}
        </svg>
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-2">
        {labels.map((l, i) => (
          <span key={i} style={{ display: (i % showEvery === 0 || i === labels.length - 1) ? 'block' : 'none' }}>{l}</span>
        ))}
      </div>
    </div>
  )
}

function AnalyticsCard({ title, subtitle, data, metric, onMetricChange }) {
  const restaurants = data?.restaurants || []
  const labels = data?.labels || []

  if (restaurants.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-extrabold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-gray-900 text-white text-[10px] px-2 py-1">Top 3</div>
        </div>
        <div className="h-40 flex items-center justify-center text-sm text-gray-400">No analytics data yet</div>
      </div>
    )
  }

  const series = restaurants.map(r => ({
    name: r.name,
    data: metric === 'revenue' ? r.series.revenue : r.series.customers,
    total: metric === 'revenue' ? r.totals.revenue : r.totals.customers,
  }))

  return (
    <div className="relative bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-rose-100/60 blur-3xl" />
      <div className="absolute -bottom-16 -left-16 w-52 h-52 rounded-full bg-sky-100/60 blur-3xl" />
      <div className="relative p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-gray-900 text-white text-[10px] px-2 py-1 flex-shrink-0">Top 3</div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-[11px]">
          <button type="button" onClick={() => onMetricChange('revenue')}
            className={`px-3 py-1 rounded-full border ${metric === 'revenue' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200'}`}>
            Revenue
          </button>
          <button type="button" onClick={() => onMetricChange('customers')}
            className={`px-3 py-1 rounded-full border ${metric === 'customers' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200'}`}>
            Customers
          </button>
        </div>
        <div className="mt-4"><MultiLineChart labels={labels} series={series} colors={CHART_COLORS} /></div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
          {series.map((s, i) => (
            <div key={s.name} className="flex items-center gap-2 bg-white/70 border border-gray-100 rounded-2xl px-3 py-2 shadow-[0_1px_0_rgba(17,24,39,0.04)]">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
              <div className="min-w-0">
                <p className="text-[11px] text-gray-500 truncate">{s.name}</p>
                <p className="text-sm font-bold text-gray-900">{formatMetric(s.total, metric)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Delta badge ──────────────────────────────────────────────────────────── */
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

/* ─── Main page ────────────────────────────────────────────────────────────── */
export default function SuperDashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats]                   = useState(null)
  const [kpis, setKpis]                     = useState(null)
  const [loading, setLoading]               = useState(true)
  const [analytics, setAnalytics]           = useState({})
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [analyticsError, setAnalyticsError] = useState(false)
  const [metricByRange, setMetricByRange]   = useState({ '24h': 'revenue', '30d': 'revenue', '6m': 'revenue' })

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

  /* ── KPI card definitions ───────────────────────────────────────────────── */
  const kpiCards = [
    {
      key: 'totalRestaurants', label: 'Total Restaurants', icon: FaBuilding,
      iconBg: 'bg-purple-50 text-purple-600',
      value: stats?.totalRestaurants ?? '—',
      sub: `${stats?.activeRestaurants ?? 0} active`,
    },
    {
      key: 'totalUsers', label: 'Total Users', icon: FaUsers,
      iconBg: 'bg-blue-50 text-blue-600',
      value: stats?.totalUsers ?? '—',
    },
    {
      key: 'totalRevenue', label: 'Total Revenue', icon: FaChartLine,
      iconBg: 'bg-green-50 text-green-600',
      value: `Rs. ${(stats?.totalRevenue || 0).toLocaleString()}`,
    },
    {
      key: 'todayOrders', label: "Today's Orders", icon: FaShoppingBag,
      iconBg: 'bg-amber-50 text-amber-600',
      value: kpis?.todayOrders ?? '—',
      sub: `vs ${kpis?.yesterdayOrders ?? 0} yesterday`,
      delta: kpis?.orderDelta,
    },
    {
      key: 'todayRevenue', label: "Today's Revenue", icon: FaMoneyBillWave,
      iconBg: 'bg-emerald-50 text-emerald-600',
      value: kpis != null ? `Rs. ${(kpis.todayRevenue || 0).toLocaleString()}` : '—',
      sub: `vs Rs. ${(kpis?.yesterdayRevenue || 0).toLocaleString()} yesterday`,
      delta: kpis?.revenueDelta,
    },
    {
      key: 'openTickets', label: 'Open Tickets', icon: FaTicketAlt,
      iconBg: 'bg-rose-50 text-rose-600',
      value: kpis?.openTickets ?? '—',
      sub: 'support requests',
      clickTo: '/super/tickets',
      urgent: (kpis?.openTickets || 0) > 0,
    },
    {
      key: 'inactiveRestaurants', label: 'Inactive Restaurants', icon: FaExclamationTriangle,
      iconBg: 'bg-orange-50 text-orange-600',
      value: kpis?.inactiveRestaurants ?? '—',
      sub: 'need attention',
      clickTo: '/super/restaurants',
    },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">Platform Overview</h1>
        <p className="text-gray-400 text-sm mt-1">Real-time stats across all restaurants</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" style={{ borderWidth: '2.5px' }} />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            {kpiCards.map(card => {
              const Icon = card.icon
              const isClickable = !!card.clickTo
              const Tag = isClickable ? 'button' : 'div'
              return (
                <Tag
                  key={card.key}
                  onClick={isClickable ? () => navigate(card.clickTo) : undefined}
                  className={[
                    'bg-white rounded-2xl border p-5 flex items-center gap-4 shadow-sm transition-all duration-200',
                    card.urgent ? 'border-rose-200 ring-1 ring-rose-100' : 'border-gray-100',
                    isClickable ? 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer text-left w-full' : 'hover:shadow-md hover:-translate-y-0.5',
                  ].join(' ')}
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${card.iconBg}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
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

          {/* Analytics */}
          <div className="mb-4">
            <h2 className="text-lg font-extrabold text-gray-900">Analytics Pulse</h2>
            <p className="text-xs text-gray-400 mt-1">Top 3 restaurants by revenue and customers across key time windows</p>
          </div>

          {analyticsLoading ? (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              {RANGE_OPTIONS.map(r => <ChartSkeleton key={r.key} />)}
            </div>
          ) : analyticsError ? (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 text-sm text-gray-400">
              Unable to load analytics right now.
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              {RANGE_OPTIONS.map(r => (
                <AnalyticsCard
                  key={r.key}
                  title={r.title}
                  subtitle={r.subtitle}
                  data={analytics[r.key]}
                  metric={metricByRange[r.key]}
                  onMetricChange={metric => setMetricByRange(prev => ({ ...prev, [r.key]: metric }))}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
