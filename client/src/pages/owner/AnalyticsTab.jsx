// AnalyticsTab.jsx — ShadCN + Recharts analytics
import React, { useEffect, useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import {
  FaChartLine, FaClipboardList, FaCheckCircle,
  FaDownload, FaArrowUp, FaArrowDown, FaUtensils, FaClock,
} from 'react-icons/fa'
import { StatCardSkeleton, ChartSkeleton } from '../../components/Skeleton'
import { downloadCSV, StatCard } from './ownerTabHelpers'

// ShadCN UI
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
  ChartLegend, ChartLegendContent,
} from '@/components/ui/chart'

// Recharts
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'

// ── Color palette ──────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  Paid: '#22c55e',
  Served: '#3b82f6',
  Preparing: '#f97316',
  Pending: '#f59e0b',
  Cancelled: '#ef4444',
}

// ── Label formatter: 12-h AM/PM for 24h range, plain for others ──────────────
function formatChartLabel(label, range) {
  if (range !== '24h') return typeof label === 'string' && label.length > 8 ? label.slice(0, 8) : label
  // parse hour from 'HH:MM', 'HH', or bare number
  let h = NaN
  if (typeof label === 'string' && label.includes(':')) {
    h = parseInt(label.split(':')[0], 10)
  } else {
    h = parseInt(label, 10)
  }
  if (isNaN(h) || h < 0 || h > 23) return label
  const ampm = h < 12 ? 'AM' : 'PM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}${ampm}`
}

function TrendBadge({ value }) {
  if (value === undefined || value === null) return null
  const up = value >= 0
  return (
    <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 gap-1 ${up ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'
      }`}>
      {up ? <FaArrowUp className="w-2.5 h-2.5" /> : <FaArrowDown className="w-2.5 h-2.5" />}
      {Math.abs(value)}%
    </Badge>
  )
}

// ── Custom tooltip for revenue ─────────────────────────────────────────────────
function RevenueTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border/50 bg-white px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <p className="text-green-600 font-bold">Rs. {(payload[0]?.value || 0).toLocaleString()}</p>
    </div>
  )
}

function OrdersTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border/50 bg-white px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <p className="text-brand-600 font-bold">{payload[0]?.value || 0} orders</p>
    </div>
  )
}

// ── Analytics Tab ──────────────────────────────────────────────────────────────
export function AnalyticsTab({ allOrders = [] }) {
  const [range, setRange] = useState('30d')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const RANGES = [
    { id: '24h', label: '24 h' },
    { id: '30d', label: '30 Days' },
    { id: '6m', label: '6 Months' },
  ]

  useEffect(() => {
    setLoading(true)
    api.get(`/restaurant/analytics?range=${range}`)
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false))
  }, [range])

  // ── Derived chart data ─────────────────────────────────────────────────────
  const revenueChartData = useMemo(() =>
    (data?.labels || []).map((label, i) => ({
      label: formatChartLabel(label, range),
      revenue: data.revenue[i] || 0,
    })), [data, range])

  const ordersChartData = useMemo(() =>
    (data?.labels || []).map((label, i) => ({
      label: formatChartLabel(label, range),
      orders: data.counts[i] || 0,
    })), [data, range])

  const statusData = useMemo(() =>
    Object.entries(STATUS_COLORS).map(([name, color]) => ({
      name,
      value: allOrders.filter(o => o.status.toUpperCase() === name.toUpperCase()).length,
      color,
    })).filter(s => s.value > 0),
    [allOrders])

  const topItemsData = useMemo(() => {
    const counts = {}
    allOrders.forEach(o => o.items?.forEach(item => {
      const name = item.menuItem?.name || 'Unknown'
      counts[name] = (counts[name] || 0) + item.quantity
    }))
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([name, qty]) => ({
        name: name.length > 14 ? name.slice(0, 14) + '…' : name,
        qty,
      }))
  }, [allOrders])

  const peakHoursData = useMemo(() => {
    const counts = Array(24).fill(0)
    allOrders.forEach(o => {
      const h = new Date(o.createdAt).getHours()
      counts[h]++
    })
    return counts.map((orders, h) => {
      const ampm = h < 12 ? 'AM' : 'PM'
      const hour12 = h % 12 === 0 ? 12 : h % 12
      return { hour: `${hour12}${ampm}`, orders }
    })
  }, [allOrders])

  const exportCSV = () => {
    if (!data) return
    downloadCSV(`analytics_${range}.csv`, [
      ['Period', 'Revenue (Rs.)', 'Orders'],
      ...data.labels.map((l, i) => [l, (data.revenue[i] || 0).toFixed(2), data.counts[i] || 0]),
      [], ['TOTAL', (data.totalRevenue || 0).toFixed(2), data.totalOrders],
    ])
  }

  const revenueConfig = { revenue: { label: 'Revenue (Rs.)', color: '#22c55e' } }
  const ordersConfig = { orders: { label: 'Orders', color: '#e11d48' } }
  const topConfig = { qty: { label: 'Qty Sold', color: '#8b5cf6' } }
  const peakConfig = { orders: { label: 'Orders', color: '#f97316' } }

  return (
    <div className="space-y-5">

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={range} onValueChange={setRange}>
          <TabsList className="bg-gray-100 h-9 p-1">
            {RANGES.map(r => (
              <TabsTrigger
                key={r.id} value={r.id}
                className="text-xs font-bold px-4 h-7 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
              >
                {r.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Button
          size="sm" onClick={exportCSV} disabled={!data}
          className="gap-2 bg-gray-900 hover:bg-gray-800 text-white hover:shadow-gray-900/20 disabled:opacity-40"
        >
          <FaDownload className="w-3 h-3" /> Export CSV
        </Button>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <StatCardSkeleton key={i} />)}
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard icon={FaClipboardList} label="Total Orders" rawValue={data.totalOrders} iconBg="bg-blue-50" iconColor="text-blue-600" trend={data.ordersTrend} />
          <StatCard icon={FaChartLine} label="Total Revenue" rawValue={data.totalRevenue || 0} prefix="Rs." iconBg="bg-brand-50" iconColor="text-brand-600" trend={data.revenueTrend} />
          <StatCard icon={FaCheckCircle} label="Paid Revenue" rawValue={data.totalPaidRevenue || 0} prefix="Rs." iconBg="bg-green-50" iconColor="text-green-600" />
          <StatCard icon={FaChartLine} label="Avg Order Value" rawValue={data.totalOrders ? Math.round((data.totalRevenue || 0) / data.totalOrders) : 0} prefix="Rs." iconBg="bg-purple-50" iconColor="text-purple-600" />
        </div>
      ) : null}

      {/* ── Revenue + Orders Charts ──────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5"><ChartSkeleton /><ChartSkeleton /></div>
      ) : data ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Revenue — AreaChart */}
          <Card className="border-gray-100 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-gray-800">Revenue</CardTitle>
                  <CardDescription className="text-xs">Rs. {(data.totalPaidRevenue || 0).toFixed(0)} collected</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <TrendBadge value={data.revenueTrend} />
                  <div className="w-8 h-8 bg-green-50 rounded-xl flex items-center justify-center">
                    <FaChartLine className="w-4 h-4 text-green-600" />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-4">
              <ChartContainer config={revenueConfig} className="h-[200px] w-full">
                <AreaChart data={revenueChartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${v / 1000}k`} />
                  <Tooltip content={<RevenueTooltip />} />
                  <Area type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} fill="url(#revGrad)" dot={false} activeDot={{ r: 4, fill: '#22c55e' }} />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Orders — BarChart */}
          <Card className="border-gray-100 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-gray-800">Orders</CardTitle>
                  <CardDescription className="text-xs">{data.totalOrders} total this period</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <TrendBadge value={data.ordersTrend} />
                  <div className="w-8 h-8 bg-brand-50 rounded-xl flex items-center justify-center">
                    <FaClipboardList className="w-4 h-4 text-brand-600" />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-4">
              <ChartContainer config={ordersConfig} className="h-[200px] w-full">
                <BarChart data={ordersChartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<OrdersTooltip />} />
                  <Bar dataKey="orders" fill="#e11d48" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

        </div>
      ) : null}

      {/* ── Status Pie + Top Selling + Peak Hours ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Order Status — PieChart (donut) */}
        <Card className="border-gray-100 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-gray-900">Order Status</CardTitle>
              <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
                <FaClipboardList className="w-3.5 h-3.5 text-blue-500" />
              </div>
            </div>
            <CardDescription className="text-xs">{allOrders.length} orders today</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {statusData.length === 0 ? (
              <div className="h-[180px] flex items-center justify-center text-gray-400 text-xs">No orders yet</div>
            ) : (
              <>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {statusData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [`${value} orders`, name]}
                        contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 11 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {statusData.map(s => (
                    <Badge key={s.name} variant="outline" className="text-[10px] font-semibold gap-1.5"
                      style={{ borderColor: s.color + '40', color: s.color, background: s.color + '12' }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                      {s.name} · {s.value}
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Top Selling — horizontal BarChart */}
        <Card className="border-gray-100 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-gray-900">Top Selling</CardTitle>
              <div className="w-7 h-7 bg-purple-50 rounded-lg flex items-center justify-center">
                <FaUtensils className="w-3.5 h-3.5 text-purple-500" />
              </div>
            </div>
            <CardDescription className="text-xs">Best-selling items by quantity</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {topItemsData.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-gray-400 text-xs">No orders yet</div>
            ) : (
              <ChartContainer config={topConfig} className="h-[220px] w-full">
                <BarChart
                  data={topItemsData}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={80} />
                  <Tooltip formatter={(v) => [`${v} sold`, 'Qty']} contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 11 }} />
                  <Bar dataKey="qty" fill="#8b5cf6" radius={[0, 4, 4, 0]} maxBarSize={18} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Peak Hours — BarChart */}
        <Card className="border-gray-100 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-gray-900">Peak Hours</CardTitle>
              <div className="w-7 h-7 bg-orange-50 rounded-lg flex items-center justify-center">
                <FaClock className="w-3.5 h-3.5 text-orange-500" />
              </div>
            </div>
            <CardDescription className="text-xs">Orders by hour of day</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ChartContainer config={peakConfig} className="h-[220px] w-full">
              <BarChart data={peakHoursData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 9 }}
                  tickLine={false}
                  axisLine={false}
                  interval={3}
                />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v) => [`${v} orders`, 'Orders']} contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 11 }} />
                <Bar
                  dataKey="orders"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={18}
                  fill="#f97316"
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
