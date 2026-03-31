/**
 * RevenuePage - Business Intelligence for Super Admin
 * Sections: Platform KPI Strip, Revenue Bar Chart, Leaderboard, Peak Hours Heatmap
 * Pure SVG/CSS - no external chart libraries
 */
import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip,
  Legend, ResponsiveContainer, Cell,
} from 'recharts'
import {
  FaArrowUp,
  FaArrowDown,
  FaMinus,
  FaDownload,
  FaTrophy,
  FaChartBar,
  FaFire,
  FaTimesCircle,
} from 'react-icons/fa'

/* ---------------- Constants ---------------- */
const PERIODS = [
  { key: 'daily',   label: 'Daily',   sub: 'Last 14 days' },
  { key: 'weekly',  label: 'Weekly',  sub: 'Last 8 weeks'  },
  { key: 'monthly', label: 'Monthly', sub: 'Last 12 months' },
]

const REST_COLORS = [
  '#ef4444', '#0ea5e9', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316',
]

const MEDAL = [
  { Icon: FaTrophy, color: 'text-amber-500' },
  { Icon: FaTrophy, color: 'text-gray-400' },
  { Icon: FaTrophy, color: 'text-orange-500' },
]

/* ---------------- Helpers ---------------- */
function fmtMoney(v) { return `Rs. ${(v || 0).toLocaleString()}` }
function fmtNum(v)   { return (v || 0).toLocaleString() }

function DeltaBadge({ value, className = '' }) {
  if (value === null || value === undefined) return <span className="text-xs text-gray-300">-</span>
  if (value > 0) return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold text-green-600 ${className}`}>
      <FaArrowUp className="w-2.5 h-2.5" />{value}%
    </span>
  )
  if (value < 0) return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold text-red-500 ${className}`}>
      <FaArrowDown className="w-2.5 h-2.5" />{Math.abs(value)}%
    </span>
  )
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold text-gray-400 ${className}`}>
      <FaMinus className="w-2.5 h-2.5" />0%
    </span>
  )
}

/* ---------------- Platform KPI Strip ---------------- */
function KpiStrip({ platform }) {
  const kpis = [
    {
      label: 'Total Revenue', value: fmtMoney(platform?.totalRevenue),
      sub: `vs ${fmtMoney(platform?.previousRevenue)} prev period`,
      delta: platform?.growth, color: 'text-gray-900',
    },
    {
      label: 'Total Orders', value: fmtNum(platform?.totalOrders),
      sub: 'in selected period', color: 'text-gray-900',
    },
    {
      label: 'Avg Order Value', value: fmtMoney(platform?.aov),
      sub: 'per non-cancelled order', color: 'text-gray-900',
    },
    {
      label: 'Cancellation Rate', value: `${platform?.cancelRate ?? 0}%`,
      sub: 'of all orders', color: (platform?.cancelRate || 0) > 10 ? 'text-red-500' : 'text-gray-900',
    },
  ]
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
      {kpis.map(k => (
        <div key={k.label} className="super-card p-5">
          <p className="text-xs text-gray-400 font-medium">{k.label}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <p className={`text-xl font-extrabold leading-tight ${k.color}`}>{k.value}</p>
            {k.delta !== undefined && <DeltaBadge value={k.delta} />}
          </div>
          <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
        </div>
      ))}
    </div>
  )
}

/* ---------------- Revenue Bar Chart (Recharts) ---------------- */
function RevenueBarChart({ labels, restaurants, colors }) {
  const top5 = restaurants.slice(0, 5)
  if (!top5.length || !labels.length) return (
    <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No revenue data for this period</div>
  )

  // Build data: [{ label, "Rest A": 1200, "Rest B": 800, ... }, ...]
  const chartData = labels.map((label, i) => {
    const point = { label }
    top5.forEach(r => { point[r.name] = r.revenueSeries[i] || 0 })
    return point
  })

  const yFormatter = (v) => {
    if (v >= 1000000) return `Rs.${(v / 1000000).toFixed(1)}M`
    if (v >= 1000)    return `Rs.${(v / 1000).toFixed(0)}k`
    return `Rs.${v}`
  }

  const showEvery = labels.length > 14 ? Math.ceil(labels.length / 7) : 1
  const xTickFormatter = (v, index) => {
    if (index % showEvery !== 0 && index !== labels.length - 1) return ''
    return v?.length > 7 ? v.slice(0, 7) : v
  }

  function BarTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null
    const total = payload.reduce((s, p) => s + (p.value || 0), 0)
    return (
      <div className="bg-white border border-gray-100 rounded-2xl shadow-2xl shadow-black/10 px-4 py-3 min-w-[180px]">
        <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mb-2">{label}</p>
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-4 mb-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: entry.fill }} />
              <span className="text-xs text-gray-600 font-medium truncate max-w-[100px]">{entry.name}</span>
            </div>
            <span className="text-xs font-extrabold text-gray-900">{fmtMoney(entry.value)}</span>
          </div>
        ))}
        <div className="border-t border-gray-100 mt-2 pt-2 flex justify-between">
          <span className="text-[11px] text-gray-400 font-semibold">Total</span>
          <span className="text-xs font-extrabold text-gray-900">{fmtMoney(total)}</span>
        </div>
      </div>
    )
  }

  function BarLegend({ payload }) {
    if (!payload?.length) return null
    return (
      <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: entry.color }} />
            <span className="text-[11px] text-gray-500 font-semibold truncate max-w-[120px]">{entry.value}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
          barCategoryGap="30%"
          barGap={2}
          style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          <defs>
            {top5.map((r, i) => (
              <linearGradient key={r.id} id={`bar-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={colors[i % colors.length]} stopOpacity={1} />
                <stop offset="100%" stopColor={colors[i % colors.length]} stopOpacity={0.7} />
              </linearGradient>
            ))}
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

          <XAxis
            dataKey="label"
            tickFormatter={xTickFormatter}
            tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={yFormatter}
            tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            width={72}
          />

          <RechartTooltip
            content={<BarTooltip />}
            cursor={{ fill: '#f8fafc', radius: 4 }}
          />

          <Legend content={<BarLegend />} />

          {top5.map((r, i) => (
            <Bar
              key={r.id}
              dataKey={r.name}
              fill={`url(#bar-grad-${i})`}
              radius={[4, 4, 0, 0]}
              animationDuration={700}
              animationEasing="ease-out"
              maxBarSize={32}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ---------------- Leaderboard ---------------- */
function Leaderboard({ restaurants, colors }) {
  const navigate = useNavigate()
  if (!restaurants.length) return (
    <div className="text-center py-10 text-gray-400 text-sm">No restaurant data for this period</div>
  )
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/60">
            {['Rank', 'Restaurant', 'Revenue', 'Orders', 'Avg Order', 'Cancel Rate', 'Growth'].map(h => (
              <th key={h} className="text-left px-4 py-3 text-gray-500 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {restaurants.map((r, i) => {
            const MedalIcon = MEDAL[i]?.Icon
            const medalColor = MEDAL[i]?.color || ''
            return (
              <tr key={r.id} className="hover:bg-gray-50 transition-colors group">
              <td className="px-4 py-3">
                {i < 3 && MedalIcon ? (
                  <span className={`w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center ${medalColor}`}>
                    <MedalIcon className="w-3.5 h-3.5" />
                  </span>
                ) : (
                  <span className="text-xs text-gray-400 font-bold w-6 h-6 flex items-center justify-center rounded-full bg-gray-100">#{i + 1}</span>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: colors[i % colors.length] }} />
                  <button
                    onClick={() => navigate('/super/restaurants')}
                    className="font-semibold text-gray-900 hover:text-brand-600 transition-colors text-sm truncate max-w-[160px]"
                  >
                    {r.name}
                  </button>
                </div>
              </td>
              <td className="px-4 py-3 text-gray-900 font-bold">{fmtMoney(r.totalRevenue)}</td>
              <td className="px-4 py-3 text-gray-600">{fmtNum(r.orderCount)}</td>
              <td className="px-4 py-3 text-gray-600">{fmtMoney(r.aov)}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  {r.cancelledCount > 0 && <FaTimesCircle className="text-red-400 w-3 h-3 flex-shrink-0" />}
                  <span className={`text-xs font-bold ${r.cancelRate > 15 ? 'text-red-500' : r.cancelRate > 5 ? 'text-amber-500' : 'text-green-600'}`}>
                    {r.cancelRate}%
                  </span>
                  <span className="text-gray-300 text-xs">({r.cancelledCount})</span>
                </div>
              </td>
              <td className="px-4 py-3"><DeltaBadge value={r.growth} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ---------------- Peak Hours Heatmap ---------------- */
function PeakHoursHeatmap({ peakHours }) {
  if (!peakHours || peakHours.length === 0) return (
    <div className="text-center py-8 text-gray-400 text-sm">No hourly data available</div>
  )
  const maxCount = Math.max(...peakHours.map(h => h.count), 1)

  const getHeatColor = (count) => {
    const intensity = count / maxCount
    if (intensity === 0) return { bg: '#f9fafb', text: '#d1d5db' }
    if (intensity < 0.2) return { bg: '#fef3c7', text: '#92400e' }
    if (intensity < 0.4) return { bg: '#fed7aa', text: '#9a3412' }
    if (intensity < 0.6) return { bg: '#fca5a5', text: '#991b1b' }
    if (intensity < 0.8) return { bg: '#f87171', text: '#7f1d1d' }
    return { bg: '#ef4444', text: '#ffffff' }
  }

  const formatHour = (h) => {
    if (h === 0)  return '12am'
    if (h < 12)  return `${h}am`
    if (h === 12) return '12pm'
    return `${h - 12}pm`
  }

  // Group hours into rows of 8 for readability
  const rows = [peakHours.slice(0, 8), peakHours.slice(8, 16), peakHours.slice(16, 24)]
  const rowLabels = ['Night (12am-7am)', 'Morning (8am-3pm)', 'Evening (4pm-11pm)']

  return (
    <div className="space-y-4">
      {rows.map((row, ri) => (
        <div key={ri}>
          <p className="text-xs text-gray-400 font-medium mb-2">{rowLabels[ri]}</p>
          <div className="grid grid-cols-8 gap-1.5">
            {row.map(({ hour, count }) => {
              const { bg, text } = getHeatColor(count)
              const intensity = count / maxCount
              return (
                <div
                  key={hour}
                  title={`${formatHour(hour)}: ${count} orders`}
                  className="relative group rounded-xl border border-white/60 flex flex-col items-center justify-center py-2 px-1 cursor-default transition-transform hover:scale-105"
                  style={{ background: bg }}
                >
                  <span className="text-[10px] font-bold leading-none" style={{ color: text }}>{count}</span>
                  <span className="text-[9px] mt-0.5 opacity-75 font-medium" style={{ color: text }}>{formatHour(hour)}</span>
                  {intensity >= 0.8 && (
                    <span className="absolute -top-1 -right-1 text-[8px]">
                      <FaFire className="w-2.5 h-2.5" />
                    </span>
                  )}
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] rounded-lg px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                    {formatHour(hour)}: {count} orders
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
      {/* Color scale legend */}
      <div className="flex items-center gap-2 pt-2">
        <span className="text-xs text-gray-400">Low</span>
        <div className="flex gap-1">
          {['#fef3c7', '#fed7aa', '#fca5a5', '#f87171', '#ef4444'].map(c => (
            <div key={c} className="w-5 h-2.5 rounded-sm" style={{ background: c }} />
          ))}
        </div>
        <span className="text-xs text-gray-400">High</span>
      </div>
    </div>
  )
}

/* ---------------- CSV Export ---------------- */
function exportCSV(data) {
  if (!data?.restaurants?.length) return
  const headers = ['Rank', 'Restaurant', 'Total Revenue (Rs.)', 'Orders', 'AOV (Rs.)', 'Cancelled', 'Cancel Rate %', 'Growth %']
  const rows = data.restaurants.map((r, i) => [
    i + 1, r.name, r.totalRevenue, r.orderCount, r.aov, r.cancelledCount, r.cancelRate, r.growth ?? ''
  ])
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = `revenue_bi_${Date.now()}.csv`; a.click()
  URL.revokeObjectURL(url)
}

/* ---------------- Main Page ---------------- */
export default function RevenuePage() {
  const [period, setPeriod]     = useState('daily')
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(false)

  const fetchData = useCallback(() => {
    setLoading(true); setError(false)
    api.get(`/super/revenue-bi?period=${period}`)
      .then(r => setData(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [period])

  useEffect(() => { fetchData() }, [fetchData])

  const currentPeriodLabel = PERIODS.find(p => p.key === period)?.sub || ''

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <FaChartBar className="text-brand-600 w-5 h-5" />
            Revenue Business Intelligence
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Platform-wide revenue analytics - {currentPeriodLabel}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period Tabs */}
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  period === p.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {/* Export */}
          <button
            onClick={() => exportCSV(data)}
            disabled={!data || loading}
            className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold px-4 py-2 rounded-xl text-sm transition-colors shadow-sm disabled:opacity-40"
          >
            <FaDownload className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-5">
          {/* KPI skeleton */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="super-card p-5 animate-pulse">
                <div className="h-3 bg-gray-100 rounded-full w-1/2 mb-3" />
                <div className="h-6 bg-gray-100 rounded-full w-3/4 mb-2" />
                <div className="h-2.5 bg-gray-100 rounded-full w-2/3" />
              </div>
            ))}
          </div>
          {/* Chart skeleton */}
          <div className="super-card p-5 animate-pulse h-64" />
          {/* Table skeleton */}
          <div className="super-card p-5 animate-pulse h-48" />
        </div>
      ) : error ? (
        <div className="super-card p-10 text-center shadow-sm">
          <p className="text-gray-400">Unable to load revenue data. Please try again.</p>
          <button onClick={fetchData} className="mt-4 text-brand-600 font-semibold text-sm hover:underline">Retry</button>
        </div>
      ) : (
        <>
          {/* Platform KPI Strip */}
          <KpiStrip platform={data?.platform} />

          {/* Revenue Bar Chart */}
          <div className="super-card p-5 mb-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                  <FaChartBar className="text-brand-600 w-4 h-4" />
                  Revenue by Restaurant
                </h2>
                <p className="text-xs text-gray-400 mt-1">Top 5 restaurants grouped per {period === 'daily' ? 'day' : period === 'weekly' ? 'week' : 'month'}</p>
              </div>
            </div>
            <RevenueBarChart
              labels={data?.labels || []}
              restaurants={data?.restaurants || []}
              colors={REST_COLORS}
            />
          </div>

          {/* Leaderboard */}
          <div className="super-card mb-5 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
              <FaTrophy className="text-amber-500 w-4 h-4" />
              <h2 className="text-base font-extrabold text-gray-900">Restaurant Leaderboard</h2>
              <span className="ml-auto text-xs text-gray-400">{data?.restaurants?.length || 0} restaurant(s)</span>
            </div>
            <Leaderboard restaurants={data?.restaurants || []} colors={REST_COLORS} />
          </div>

          {/* Peak Hours Heatmap */}
          <div className="super-card p-5">
            <div className="flex items-center gap-2 mb-5">
              <FaFire className="text-orange-500 w-4 h-4" />
              <div>
                <h2 className="text-base font-extrabold text-gray-900">Peak Hours Heatmap</h2>
                <p className="text-xs text-gray-400 mt-0.5">Platform-wide order distribution by hour of day</p>
              </div>
            </div>
            <PeakHoursHeatmap peakHours={data?.peakHours || []} />
          </div>
        </>
      )}
    </div>
  )
}

