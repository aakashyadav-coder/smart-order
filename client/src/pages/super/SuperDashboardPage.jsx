/**
 * SuperDashboardPage — Global stats overview for Super Admin
 * Theme: White-Red Professional
 */
import React, { useEffect, useState } from 'react'
import api from '../../lib/api'

const StatCard = ({ icon, label, value, sub, color }) => (
  <div className={`bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow`}>
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${color}`}>{icon}</div>
    <div>
      <p className="text-gray-400 text-sm font-medium">{label}</p>
      <p className="text-gray-900 text-2xl font-extrabold leading-none mt-0.5">{value ?? '—'}</p>
      {sub && <p className="text-gray-400 text-xs mt-1">{sub}</p>}
    </div>
  </div>
)

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
          <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            <StatCard icon="🏢" label="Total Restaurants"  value={stats?.totalRestaurants}  sub={`${stats?.activeRestaurants} active`} color="bg-purple-100 text-purple-600" />
            <StatCard icon="👥" label="Total Users"        value={stats?.totalUsers}                                                   color="bg-blue-100 text-blue-600"   />
            <StatCard icon="📋" label="Total Orders"       value={stats?.totalOrders}                                                  color="bg-brand-100 text-brand-600"  />
            <StatCard icon="💰" label="Total Revenue"      value={`Rs. ${(stats?.totalRevenue || 0).toLocaleString()}`}                color="bg-green-100 text-green-600"  />
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/70 rounded-t-2xl">
              <h2 className="font-bold text-gray-900">Recent Orders</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {(stats?.recentOrders || []).length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-10">No orders yet</p>
              ) : (
                stats.recentOrders.map(order => (
                  <div key={order.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-gray-900 text-sm font-semibold">{order.customerName}</p>
                      <p className="text-gray-400 text-xs">{order.restaurant?.name} · Table #{order.tableNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-900 font-bold text-sm">Rs. {order.totalPrice}</p>
                      <span className={`badge text-xs ${
                        order.status === 'COMPLETED' ? 'badge-completed' :
                        order.status === 'PENDING'   ? 'badge-pending'   :
                        order.status === 'ACCEPTED'  ? 'badge-accepted'  :
                                                       'badge-preparing'
                      }`}>{order.status}</span>
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
