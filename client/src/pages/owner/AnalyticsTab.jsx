// AnalyticsTab.jsx
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

import { downloadCSV, StatCard, LineChart, DonutChart, TopItems } from './ownerTabHelpers'

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

