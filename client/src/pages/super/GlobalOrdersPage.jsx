/**
 * GlobalOrdersPage — all orders with search + date range + CSV export
 */
import React, { useEffect, useState } from 'react'
import api from '../../lib/api'
import { FaSearch, FaDownload } from 'react-icons/fa'

const STATUS_BADGE = {
  PENDING: 'badge-pending', ACCEPTED: 'badge-accepted',
  PREPARING: 'badge-preparing', SERVED: 'badge-completed',
  CANCELLED: 'badge-cancelled', PAID: 'badge-completed',
}

function exportCSV(orders) {
  const headers = ['Order ID', 'Customer', 'Phone', 'Restaurant', 'Table', 'Items', 'Total (Rs.)', 'Status', 'Date']
  const rows = orders.map(o => [
    o.id.slice(-8).toUpperCase(),
    o.customerName,
    o.phone,
    o.restaurant?.name || '',
    `#${o.tableNumber}`,
    o.items?.length || 0,
    o.totalPrice,
    o.status,
    new Date(o.createdAt).toLocaleString('en-IN'),
  ])
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `orders_${Date.now()}.csv`; a.click()
  URL.revokeObjectURL(url)
}

export default function GlobalOrdersPage() {
  const [orders, setOrders] = useState([])
  const [restaurants, setRestaurants] = useState([])
  const [filter, setFilter] = useState({ restaurantId: '', status: '', search: '', dateFrom: '', dateTo: '' })
  const [loading, setLoading] = useState(true)

  const fetchOrders = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filter.restaurantId) params.set('restaurantId', filter.restaurantId)
    if (filter.status) params.set('status', filter.status)
    if (filter.search) params.set('search', filter.search)
    if (filter.dateFrom) params.set('dateFrom', filter.dateFrom)
    if (filter.dateTo) params.set('dateTo', filter.dateTo)
    params.set('limit', '300')
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
          <h1 className="text-2xl font-extrabold text-gray-900">All Orders</h1>
          <p className="text-gray-400 text-sm mt-1">{orders.length} order(s)</p>
        </div>
        <button
          onClick={() => exportCSV(orders)}
          className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm"
        >
          <FaDownload className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mb-5">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
          <input type="text" placeholder="Search customer…"
            className="input bg-white border-gray-200 text-gray-900 text-sm pl-9 w-full"
            value={filter.search} onChange={e => setFilter(p => ({ ...p, search: e.target.value }))} />
        </div>
        <select className="input bg-white border-gray-200 text-gray-900 text-sm"
          value={filter.restaurantId} onChange={e => setFilter(p => ({ ...p, restaurantId: e.target.value }))}>
          <option value="">All Restaurants</option>
          {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select className="input bg-white border-gray-200 text-gray-900 text-sm"
          value={filter.status} onChange={e => setFilter(p => ({ ...p, status: e.target.value }))}>
          <option value="">All Statuses</option>
          {['PENDING','ACCEPTED','PREPARING','SERVED','CANCELLED','PAID'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="date" className="input bg-white border-gray-200 text-gray-900 text-sm"
          value={filter.dateFrom} onChange={e => setFilter(p => ({ ...p, dateFrom: e.target.value }))}
          placeholder="From" />
        <input type="date" className="input bg-white border-gray-200 text-gray-900 text-sm"
          value={filter.dateTo} onChange={e => setFilter(p => ({ ...p, dateTo: e.target.value }))}
          placeholder="To" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['#','Order ID','Customer','Restaurant','Table','Items','Total','Status','Time'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-gray-500 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-12 text-gray-400">No orders found</td></tr>
                ) : orders.map((o, idx) => (
                  <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">#{o.id.slice(-8).toUpperCase()}</td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900 font-medium">{o.customerName}</p>
                      <p className="text-gray-400 text-xs">{o.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{o.restaurant?.name}</td>
                    <td className="px-4 py-3 text-gray-700">#{o.tableNumber}</td>
                    <td className="px-4 py-3 text-gray-400">{o.items?.length} item(s)</td>
                    <td className="px-4 py-3 text-gray-900 font-semibold">Rs. {o.totalPrice}</td>
                    <td className="px-4 py-3"><span className={`badge text-xs ${STATUS_BADGE[o.status]}`}>{o.status}</span></td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{fmt(o.createdAt)}</td>
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
