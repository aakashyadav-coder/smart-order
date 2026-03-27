/**
 * ActivityLogsPage — audit trail with action filter, date range, CSV export
 */
import React, { useEffect, useState } from 'react'
import api from '../../lib/api'
import { FaDownload } from 'react-icons/fa'

const ACTION_ICON = {
  ORDER_STATUS_UPDATE:    '📦',
  USER_CREATED:           '👤',
  USER_UPDATED:           '✏️',
  USER_DELETED:           '🗑️',
  USER_BULK_UPDATED:      '👥',
  RESTAURANT_CREATED:     '🏢',
  RESTAURANT_UPDATED:     '🏢',
  RESTAURANT_DELETED:     '🗑️',
  RESTAURANT_BULK_UPDATED:'🏢',
  FEATURE_TOGGLE_UPDATED: '⚙️',
  ANNOUNCEMENT_CREATED:   '📢',
  ANNOUNCEMENT_DELETED:   '🗑️',
  TICKET_UPDATED:         '🎫',
  SYSTEM_SEEDED:          '🌱',
}

const ALL_ACTIONS = Object.keys(ACTION_ICON)

function exportCSV(logs) {
  const headers = ['Action', 'Entity', 'Entity ID', 'By (User)', 'Role', 'Date']
  const rows = logs.map(l => [
    l.action,
    l.entity || '',
    l.entityId ? l.entityId.slice(-8).toUpperCase() : '',
    l.user?.name || 'System',
    l.user?.role || '',
    new Date(l.createdAt).toLocaleString('en-IN'),
  ])
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = `audit_logs_${Date.now()}.csv`; a.click()
  URL.revokeObjectURL(url)
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ action: '', dateFrom: '', dateTo: '' })

  const fetchLogs = () => {
    setLoading(true)
    const params = new URLSearchParams({ limit: 500 })
    if (filter.action) params.set('action', filter.action)
    if (filter.dateFrom) params.set('dateFrom', filter.dateFrom)
    if (filter.dateTo) params.set('dateTo', filter.dateTo)
    api.get(`/super/logs?${params}`).then(r => setLogs(r.data)).finally(() => setLoading(false))
  }

  useEffect(fetchLogs, [filter])

  const fmt = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Audit Logs</h1>
          <p className="text-gray-400 text-sm mt-1">Complete record of platform actions · {logs.length} entries</p>
        </div>
        <button
          onClick={() => exportCSV(logs)}
          className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm"
        >
          <FaDownload className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

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
          <button onClick={() => setFilter({ action: '', dateFrom: '', dateTo: '' })} className="text-sm text-brand-600 hover:text-brand-700 font-medium px-2">
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
            ) : logs.map(log => (
              <div key={log.id} className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 text-sm mt-0.5">
                  {ACTION_ICON[log.action] || '📋'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-gray-900 font-semibold text-sm">{log.action.replace(/_/g, ' ')}</span>
                    {log.entity && <span className="text-gray-400 text-xs">· {log.entity}</span>}
                    {log.entityId && <span className="text-gray-300 font-mono text-xs">#{log.entityId.slice(-8).toUpperCase()}</span>}
                  </div>
                  {log.user && (
                    <p className="text-gray-400 text-xs mt-0.5">
                      by <span className="text-gray-600 font-medium">{log.user.name}</span> ({log.user.role})
                    </p>
                  )}
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <p className="text-gray-300 text-xs mt-0.5 font-mono truncate">
                      {JSON.stringify(log.metadata)}
                    </p>
                  )}
                </div>
                <span className="text-gray-400 text-xs whitespace-nowrap flex-shrink-0">{fmt(log.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
