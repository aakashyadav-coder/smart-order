/**
 * GlobalOrdersPage - all orders, paginated, with filters + CSV export
 * Server-side pagination: page / limit / total from backend
 */
import React, { useEffect, useState, useCallback } from 'react'
import api from '../../lib/api'
import { FaSearch, FaDownload, FaChevronLeft, FaChevronRight } from 'react-icons/fa'

const STATUS_BADGE = {
  PENDING:   'badge-pending',   ACCEPTED:  'badge-accepted',
  PREPARING: 'badge-preparing', SERVED:    'badge-completed',
  CANCELLED: 'badge-cancelled', PAID:      'badge-completed',
}
const PAGE_SIZE_OPTIONS = [25, 50, 100]

function exportCSV(orders) {
  const headers = ['Order ID','Customer','Phone','Restaurant','Table','Items','Total (Rs.)','Status','Date']
  const rows = orders.map(o => [
    o.id.slice(-8).toUpperCase(), o.customerName, o.phone,
    o.restaurant?.name || '', `#${o.tableNumber}`,
    o.items?.length || 0, o.totalPrice, o.status,
    new Date(o.createdAt).toLocaleString('en-IN'),
  ])
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a'); a.href = url; a.download = `orders_${Date.now()}.csv`; a.click()
  URL.revokeObjectURL(url)
}

export default function GlobalOrdersPage() {
  const [orders, setOrders]           = useState([])
  const [restaurants, setRestaurants] = useState([])
  const [meta, setMeta]               = useState({ total: 0, page: 1, totalPages: 1 })
  const [filter, setFilter] = useState({
    restaurantId: '', status: '', search: '', dateFrom: '', dateTo: '',
  })
  const [page, setPage]   = useState(1)
  const [limit, setLimit] = useState(50)
  const [loading, setLoading] = useState(true)

  const fetchOrders = useCallback(async (currentPage = page) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: currentPage, limit })
      if (filter.restaurantId) params.set('restaurantId', filter.restaurantId)
      if (filter.status)       params.set('status', filter.status)
      if (filter.search)       params.set('search', filter.search)
      if (filter.dateFrom)     params.set('dateFrom', filter.dateFrom)
      if (filter.dateTo)       params.set('dateTo', filter.dateTo)
      const res = await api.get(`/super/orders?${params}`)
      setOrders(res.data.data)
      setMeta({ total: res.data.total, page: res.data.page, totalPages: res.data.totalPages })
    } finally { setLoading(false) }
  }, [page, limit, filter])

  useEffect(() => { api.get('/super/restaurants').then(r => setRestaurants(r.data)) }, [])
  useEffect(() => { setPage(1); fetchOrders(1) }, [filter, limit])
  useEffect(() => { fetchOrders(page) }, [page])

  const changePage = (p) => {
    const clamped = Math.max(1, Math.min(p, meta.totalPages))
    setPage(clamped)
  }

  const fmt = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
  const start = (meta.page - 1) * limit + 1
  const end   = Math.min(meta.page * limit, meta.total)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">All Orders</h1>
          <p className="text-gray-400 text-sm mt-1">
            {meta.total.toLocaleString()} total order(s) across all restaurants
          </p>
        </div>
        <button
          onClick={() => exportCSV(orders)}
          className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm"
        >
          <FaDownload className="w-3.5 h-3.5" /> Export Page CSV
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mb-5">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
          <input type="text" placeholder="Search customer..."
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
          {['PENDING','ACCEPTED','PREPARING','SERVED','CANCELLED','PAID'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input type="date" className="input bg-white border-gray-200 text-gray-900 text-sm"
          value={filter.dateFrom} onChange={e => setFilter(p => ({ ...p, dateFrom: e.target.value }))} />
        <input type="date" className="input bg-white border-gray-200 text-gray-900 text-sm"
          value={filter.dateTo} onChange={e => setFilter(p => ({ ...p, dateTo: e.target.value }))} />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
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
              <tbody className="divide-y divide-gray-50">
                {orders.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-12 text-gray-400">No orders found</td></tr>
                ) : orders.map((o, idx) => (
                  <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs">{start + idx}</td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">#{o.id.slice(-8).toUpperCase()}</td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900 font-medium">{o.customerName}</p>
                      <p className="text-gray-400 text-xs">{o.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{o.restaurant?.name}</td>
                    <td className="px-4 py-3 text-gray-700">#{o.tableNumber}</td>
                    <td className="px-4 py-3 text-gray-400">{o.items?.length} item(s)</td>
                    <td className="px-4 py-3 text-gray-900 font-semibold">Rs. {(o.totalPrice || 0).toLocaleString()}</td>
                    <td className="px-4 py-3"><span className={`badge text-xs ${STATUS_BADGE[o.status] || ''}`}>{o.status}</span></td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{fmt(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination bar */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/60 flex-wrap gap-3">
            {/* left: range info + per-page */}
            <div className="flex items-center gap-3">
              <p className="text-xs text-gray-500">
                {meta.total === 0 ? '0 orders' : `${start}-${end} of ${meta.total.toLocaleString()} orders`}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span>Show</span>
                <select
                  className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-brand-400"
                  value={limit} onChange={e => setLimit(Number(e.target.value))}
                >
                  {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <span>per page</span>
              </div>
            </div>

            {/* right: page controls */}
            <div className="flex items-center gap-1">
              <button onClick={() => changePage(1)} disabled={page === 1}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-200 disabled:opacity-30 transition-colors text-xs font-bold">
                {'<<'}
              </button>
              <button onClick={() => changePage(page - 1)} disabled={page === 1}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 transition-colors">
                <FaChevronLeft className="w-3 h-3" />
              </button>

              {/* Page number pills */}
              {Array.from({ length: meta.totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === meta.totalPages || Math.abs(p - page) <= 1)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, i) => p === '...' ? (
                  <span key={`ellipsis-${i}`} className="w-7 text-center text-xs text-gray-400">...</span>
                ) : (
                  <button key={p} onClick={() => changePage(p)}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                      p === page
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'text-gray-500 hover:bg-gray-200'
                    }`}>
                    {p}
                  </button>
                ))
              }

              <button onClick={() => changePage(page + 1)} disabled={page === meta.totalPages}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 transition-colors">
                <FaChevronRight className="w-3 h-3" />
              </button>
              <button onClick={() => changePage(meta.totalPages)} disabled={page === meta.totalPages}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-200 disabled:opacity-30 transition-colors text-xs font-bold">
                {'>>'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
