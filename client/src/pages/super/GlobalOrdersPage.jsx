/**
 * GlobalOrdersPage — view all orders across all restaurants
 */
import React, { useEffect, useState } from 'react'
import api from '../../lib/api'

const STATUS_BADGE = {
  PENDING:   'badge-pending', ACCEPTED:  'badge-accepted',
  PREPARING: 'badge-preparing', COMPLETED: 'badge-completed', CANCELLED: 'badge-cancelled',
}

export default function GlobalOrdersPage() {
  const [orders, setOrders] = useState([])
  const [restaurants, setRestaurants] = useState([])
  const [filter, setFilter] = useState({ restaurantId: '', status: '' })
  const [loading, setLoading] = useState(true)

  const fetchOrders = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filter.restaurantId) params.set('restaurantId', filter.restaurantId)
    if (filter.status) params.set('status', filter.status)
    const res = await api.get(`/super/orders?${params}`)
    setOrders(res.data)
    setLoading(false)
  }

  useEffect(() => { api.get('/super/restaurants').then(r => setRestaurants(r.data)) }, [])
  useEffect(() => { fetchOrders() }, [filter])

  const fmt = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white">All Orders</h1>
          <p className="text-gray-500 text-sm mt-1">{orders.length} order(s)</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select className="input bg-gray-800 border-gray-700 text-white text-sm max-w-xs focus:ring-purple-500 focus:border-purple-500"
          value={filter.restaurantId} onChange={e => setFilter(p => ({ ...p, restaurantId: e.target.value }))}>
          <option value="">All restaurants</option>
          {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select className="input bg-gray-800 border-gray-700 text-white text-sm w-40 focus:ring-purple-500 focus:border-purple-500"
          value={filter.status} onChange={e => setFilter(p => ({ ...p, status: e.target.value }))}>
          <option value="">All statuses</option>
          {['PENDING','ACCEPTED','PREPARING','COMPLETED','CANCELLED'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  {['Order ID','Customer','Restaurant','Table','Items','Total','Status','Time'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-gray-500 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {orders.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-gray-500">No orders found</td></tr>
                ) : orders.map(o => (
                  <tr key={o.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">#{o.id.slice(-8).toUpperCase()}</td>
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{o.customerName}</p>
                      <p className="text-gray-500 text-xs">{o.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{o.restaurant?.name}</td>
                    <td className="px-4 py-3 text-gray-300">#{o.tableNumber}</td>
                    <td className="px-4 py-3 text-gray-400">{o.items?.length} item(s)</td>
                    <td className="px-4 py-3 text-white font-semibold">Rs. {o.totalPrice}</td>
                    <td className="px-4 py-3"><span className={`badge text-xs ${STATUS_BADGE[o.status]}`}>{o.status}</span></td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmt(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
