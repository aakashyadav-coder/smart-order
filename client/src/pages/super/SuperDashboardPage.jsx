/**
 * SuperDashboardPage — Platform overview for Super Admin
 * Theme: White cards, brand red accents, SVG icons
 */
import React, { useEffect, useState } from 'react'
import api from '../../lib/api'
import { FaBuilding, FaUsers, FaClipboardList, FaChartLine } from 'react-icons/fa'

const STAT_CARDS = [
  { key: 'totalRestaurants', label: 'Total Restaurants', icon: FaBuilding,     color: 'bg-purple-50 text-purple-600', subKey: 'activeRestaurants', subLabel: 'active' },
  { key: 'totalUsers',       label: 'Total Users',       icon: FaUsers,        color: 'bg-blue-50 text-blue-600' },
  { key: 'totalOrders',      label: 'Total Orders',      icon: FaClipboardList, color: 'bg-brand-50 text-brand-600' },
  { key: 'totalRevenue',     label: 'Total Revenue',     icon: FaChartLine,    color: 'bg-green-50 text-green-600', prefix: 'Rs. ', format: true },
]

const STATUS_STYLES = {
  COMPLETED: 'badge-completed',
  PENDING:   'badge-pending',
  ACCEPTED:  'badge-accepted',
  PREPARING: 'badge-preparing',
  CANCELLED: 'badge-cancelled',
}

export default function SuperDashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/super/stats')
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

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
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            {STAT_CARDS.map(({ key, label, icon: Icon, color, subKey, subLabel, prefix, format }) => {
              const raw = stats?.[key]
              const value = format ? `${prefix || ''}${(raw || 0).toLocaleString()}` : (raw ?? '—')
              const sub = subKey ? `${stats?.[subKey] ?? 0} ${subLabel}` : null
              return (
                <div key={key} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                  <div className={`icon-box ${color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-gray-400 text-xs font-medium truncate">{label}</p>
                    <p className="text-gray-900 text-2xl font-extrabold leading-none mt-0.5">{value}</p>
                    {sub && <p className="text-gray-400 text-xs mt-1">{sub}</p>}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Recent Orders</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {(stats?.recentOrders || []).length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-10">No orders yet</p>
              ) : (
                stats.recentOrders.map(order => (
                  <div key={order.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50/60 transition-colors">
                    <div>
                      <p className="text-gray-900 text-sm font-semibold">{order.customerName}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{order.restaurant?.name} · Table #{order.tableNumber}</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1.5">
                      <p className="text-gray-900 font-bold text-sm">Rs. {order.totalPrice}</p>
                      <span className={`badge text-[11px] ${STATUS_STYLES[order.status] || 'badge-pending'}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
