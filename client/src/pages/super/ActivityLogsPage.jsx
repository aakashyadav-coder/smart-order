/**
 * ActivityLogsPage - audit trail + data retention / cleanup tools
 */
import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import {
  FaDownload,
  FaTrash,
  FaExclamationTriangle,
  FaClipboardList,
  FaSyncAlt,
  FaUserPlus,
  FaEdit,
  FaUsers,
  FaBuilding,
  FaCog,
  FaBullhorn,
  FaTicketAlt,
  FaCheckCircle,
} from 'react-icons/fa'

const ACTION_ICON = {
  ORDER_STATUS_UPDATE:     FaSyncAlt,
  USER_CREATED:            FaUserPlus,
  USER_UPDATED:            FaEdit,
  USER_DELETED:            FaTrash,
  USER_BULK_UPDATED:       FaUsers,
  RESTAURANT_CREATED:      FaBuilding,
  RESTAURANT_UPDATED:      FaBuilding,
  RESTAURANT_DELETED:      FaTrash,
  RESTAURANT_BULK_UPDATED: FaBuilding,
  FEATURE_TOGGLE_UPDATED:  FaCog,
  ANNOUNCEMENT_CREATED:    FaBullhorn,
  ANNOUNCEMENT_DELETED:    FaTrash,
  TICKET_UPDATED:          FaTicketAlt,
  SYSTEM_SEEDED:           FaCheckCircle,
  LOGS_PURGED:             FaTrash,
  ORDERS_PURGED:           FaTrash,
}
const ALL_ACTIONS = Object.keys(ACTION_ICON)

function exportCSV(logs) {
  const headers = ['Action', 'Entity', 'Entity ID', 'By (User)', 'Role', 'Date']
  const rows = logs.map(l => [
    l.action, l.entity || '',
    l.entityId ? l.entityId.slice(-8).toUpperCase() : '',
    l.user?.name || 'System', l.user?.role || '',
    new Date(l.createdAt).toLocaleString('en-IN'),
  ])
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = `audit_logs_${Date.now()}.csv`; a.click()
  URL.revokeObjectURL(url)
}

/* ---------------- Purge Panel ---------------- */
function PurgePanel({ restaurants, onPurged }) {
  const [logDays, setLogDays] = useState(90)
  const [orderRestId, setOrderRestId] = useState('')
  const [orderDays, setOrderDays] = useState(180)
  const [purgingLogs, setPurgingLogs] = useState(false)
  const [purgingOrders, setPurgingOrders] = useState(false)
  const [confirmLogs, setConfirmLogs] = useState(false)
  const [confirmOrders, setConfirmOrders] = useState(false)

  const handlePurgeLogs = async () => {
    if (!confirmLogs) { setConfirmLogs(true); return }
    setPurgingLogs(true)
    try {
      const res = await api.delete(`/super/logs/purge`, { data: { days: logDays } })
      toast.success(`Deleted ${res.data.deleted} log entries older than ${logDays} days`)
      setConfirmLogs(false)
      onPurged()
    } catch (e) { toast.error('Failed to purge logs') }
    finally { setPurgingLogs(false) }
  }

  const handlePurgeOrders = async () => {
    if (!orderRestId) return toast.error('Select a restaurant first')
    if (!confirmOrders) { setConfirmOrders(true); return }
    setPurgingOrders(true)
    try {
      const res = await api.delete(`/super/orders/purge`, { data: { restaurantId: orderRestId, days: orderDays } })
      const restName = restaurants.find(r => r.id === orderRestId)?.name || 'Restaurant'
      toast.success(`Deleted ${res.data.deleted} old orders from ${restName}`)
      setConfirmOrders(false)
    } catch (e) { toast.error('Failed to purge orders') }
    finally { setPurgingOrders(false) }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <FaTrash className="text-red-500 w-4 h-4" />
        <h2 className="text-base font-extrabold text-gray-900">Data Retention & Cleanup</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Log Purge */}
        <div className="border border-gray-100 rounded-xl p-4">
          <p className="text-sm font-bold text-gray-800 mb-1">Purge Audit Logs</p>
          <p className="text-xs text-gray-400 mb-3">Permanently delete activity log entries older than N days.</p>
          <div className="flex items-center gap-2 mb-3">
            <label className="text-xs text-gray-500 font-medium whitespace-nowrap">Older than</label>
            <input type="number" min="1" max="3650"
              className="input bg-white border-gray-200 text-gray-900 text-sm w-24"
              value={logDays} onChange={e => { setLogDays(Number(e.target.value)); setConfirmLogs(false) }} />
            <span className="text-xs text-gray-500">days</span>
          </div>
          {confirmLogs && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3 flex items-start gap-2">
              <FaExclamationTriangle className="text-red-500 w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-700 font-medium">This is irreversible. Click again to confirm deletion of logs older than {logDays} days.</p>
            </div>
          )}
          <button onClick={handlePurgeLogs} disabled={purgingLogs}
            className={`text-sm font-semibold px-4 py-2 rounded-xl border transition-colors disabled:opacity-50 ${
              confirmLogs
                ? 'bg-red-600 hover:bg-red-700 text-white border-red-600'
                : 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200'
            }`}>
            {purgingLogs ? 'Purging...' : confirmLogs ? 'Confirm Purge Logs' : 'Purge Logs'}
          </button>
        </div>

        {/* Order Purge */}
        <div className="border border-gray-100 rounded-xl p-4">
          <p className="text-sm font-bold text-gray-800 mb-1">Purge Old Orders</p>
          <p className="text-xs text-gray-400 mb-3">Delete PAID/CANCELLED/SERVED orders older than N days from a specific restaurant.</p>
          <div className="space-y-2 mb-3">
            <select className="input bg-white border-gray-200 text-gray-900 text-sm"
              value={orderRestId} onChange={e => { setOrderRestId(e.target.value); setConfirmOrders(false) }}>
              <option value="">Select restaurant...</option>
              {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 font-medium whitespace-nowrap">Older than</label>
              <input type="number" min="1" max="3650"
                className="input bg-white border-gray-200 text-gray-900 text-sm w-24"
                value={orderDays} onChange={e => { setOrderDays(Number(e.target.value)); setConfirmOrders(false) }} />
              <span className="text-xs text-gray-500">days</span>
            </div>
          </div>
          {confirmOrders && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3 flex items-start gap-2">
              <FaExclamationTriangle className="text-red-500 w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-700 font-medium">This is irreversible. Click again to confirm deletion of orders older than {orderDays} days.</p>
            </div>
          )}
          <button onClick={handlePurgeOrders} disabled={purgingOrders || !orderRestId}
            className={`text-sm font-semibold px-4 py-2 rounded-xl border transition-colors disabled:opacity-50 ${
              confirmOrders
                ? 'bg-red-600 hover:bg-red-700 text-white border-red-600'
                : 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200'
            }`}>
            {purgingOrders ? 'Purging...' : confirmOrders ? 'Confirm Purge Orders' : 'Purge Orders'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------------- Main Page ---------------- */
export default function ActivityLogsPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [restaurants, setRestaurants] = useState([])
  const [filter, setFilter] = useState({ action: '', dateFrom: '', dateTo: '' })

  const fetchLogs = () => {
    setLoading(true)
    const params = new URLSearchParams({ limit: 500 })
    if (filter.action) params.set('action', filter.action)
    if (filter.dateFrom) params.set('dateFrom', filter.dateFrom)
    if (filter.dateTo) params.set('dateTo', filter.dateTo)
    api.get(`/super/logs?${params}`).then(r => setLogs(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { api.get('/super/restaurants').then(r => setRestaurants(r.data)) }, [])
  useEffect(fetchLogs, [filter])

  const fmt = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-sm">
            <FaClipboardList className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Audit Logs</h1>
            <p className="text-gray-400 text-sm mt-1">Complete record of platform actions - {logs.length} entries</p>
          </div>
        </div>
        <button onClick={() => exportCSV(logs)}
          className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm">
          <FaDownload className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      {/* Data Retention Panel */}
      <PurgePanel restaurants={restaurants} onPurged={fetchLogs} />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select className="input bg-white border-gray-200 text-gray-900 text-sm w-56"
          value={filter.action} onChange={e => setFilter(p => ({ ...p, action: e.target.value }))}>
          <option value="">All Actions</option>
          {ALL_ACTIONS.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
        </select>
        <input type="date" className="input bg-white border-gray-200 text-gray-900 text-sm"
          value={filter.dateFrom} onChange={e => setFilter(p => ({ ...p, dateFrom: e.target.value }))} />
        <input type="date" className="input bg-white border-gray-200 text-gray-900 text-sm"
          value={filter.dateTo} onChange={e => setFilter(p => ({ ...p, dateTo: e.target.value }))} />
        {(filter.action || filter.dateFrom || filter.dateTo) && (
          <button onClick={() => setFilter({ action: '', dateFrom: '', dateTo: '' })}
            className="text-sm text-brand-600 hover:text-brand-700 font-medium px-2">
            Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="divide-y divide-gray-100">
            {logs.length === 0 ? (
              <div className="text-center py-12 text-gray-400">No activity found</div>
            ) : logs.map(log => {
              const Icon = ACTION_ICON[log.action] || FaClipboardList
              return (
                <div key={log.id} className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 text-sm mt-0.5">
                    <Icon className="w-3.5 h-3.5 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-gray-900 font-semibold text-sm">{log.action.replace(/_/g, ' ')}</span>
                      {log.entity && <span className="text-gray-400 text-xs">- {log.entity}</span>}
                      {log.entityId && <span className="text-gray-300 font-mono text-xs">#{log.entityId.slice(-8).toUpperCase()}</span>}
                    </div>
                    {log.user && (
                      <p className="text-gray-400 text-xs mt-0.5">
                        by <span className="text-gray-600 font-medium">{log.user.name}</span> ({log.user.role})
                      </p>
                    )}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <p className="text-gray-300 text-xs mt-0.5 font-mono truncate">{JSON.stringify(log.metadata)}</p>
                    )}
                  </div>
                  <span className="text-gray-400 text-xs whitespace-nowrap flex-shrink-0">{fmt(log.createdAt)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
