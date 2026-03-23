/**
 * ActivityLogsPage — audit trail of all platform actions
 */
import React, { useEffect, useState } from 'react'
import api from '../../lib/api'

const ACTION_ICON = {
  ORDER_STATUS_UPDATE:    '📦',
  USER_CREATED:           '👤',
  USER_UPDATED:           '✏️',
  USER_DELETED:           '🗑️',
  RESTAURANT_CREATED:     '🏢',
  RESTAURANT_UPDATED:     '🏢',
  RESTAURANT_DELETED:     '🗑️',
  FEATURE_TOGGLE_UPDATED: '⚙️',
  SYSTEM_SEEDED:          '🌱',
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/super/logs?limit=200').then(r => setLogs(r.data)).finally(() => setLoading(false))
  }, [])

  const fmt = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-white">Audit Logs</h1>
        <p className="text-gray-500 text-sm mt-1">Complete record of platform actions · {logs.length} entries</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <div className="divide-y divide-gray-800">
            {logs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No activity yet</div>
            ) : logs.map(log => (
              <div key={log.id} className="flex items-start gap-3 px-5 py-3 hover:bg-gray-800/40 transition-colors">
                <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0 text-sm mt-0.5">
                  {ACTION_ICON[log.action] || '📋'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-semibold text-sm">{log.action.replace(/_/g, ' ')}</span>
                    {log.entity && <span className="text-gray-600 text-xs">· {log.entity}</span>}
                    {log.entityId && <span className="text-gray-700 font-mono text-xs">#{log.entityId.slice(-8).toUpperCase()}</span>}
                  </div>
                  {log.user && (
                    <p className="text-gray-500 text-xs mt-0.5">
                      by <span className="text-gray-400">{log.user.name}</span> ({log.user.role})
                    </p>
                  )}
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <p className="text-gray-600 text-xs mt-0.5 font-mono truncate">
                      {JSON.stringify(log.metadata)}
                    </p>
                  )}
                </div>
                <span className="text-gray-600 text-xs whitespace-nowrap flex-shrink-0">{fmt(log.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
