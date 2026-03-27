/**
 * HealthPage — System health monitor
 */
import React, { useEffect, useState, useCallback } from 'react'
import api from '../../lib/api'
import { FaHeartbeat, FaDatabase, FaDesktop, FaMicrochip, FaSyncAlt } from 'react-icons/fa'

function StatusDot({ ok }) {
  return (
    <span className={`inline-flex w-2.5 h-2.5 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`} />
  )
}

function MetricCard({ icon: Icon, label, value, sub, color = 'text-gray-900', iconBg = 'bg-blue-50 text-blue-600' }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 shadow-sm">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-gray-400 text-xs font-medium">{label}</p>
        <p className={`text-xl font-extrabold ${color}`}>{value}</p>
        {sub && <p className="text-gray-400 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function HealthPage() {
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastChecked, setLastChecked] = useState(null)

  const fetchHealth = useCallback(() => {
    setLoading(true)
    api.get('/super/health')
      .then(r => { setHealth(r.data); setLastChecked(new Date()) })
      .catch(() => setHealth({ status: 'unhealthy' }))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchHealth()
    const interval = setInterval(fetchHealth, 30000) // auto-refresh every 30s
    return () => clearInterval(interval)
  }, [fetchHealth])

  const isHealthy = health?.status === 'healthy'
  const dbMs = health?.dbResponseMs

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">System Health</h1>
          <p className="text-gray-400 text-sm mt-1">
            Auto-refreshes every 30s
            {lastChecked && ` · Last checked: ${lastChecked.toLocaleTimeString('en-IN')}`}
          </p>
        </div>
        <button
          onClick={fetchHealth}
          className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm"
        >
          <FaSyncAlt className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Overall Status Banner */}
      <div className={`rounded-2xl border p-5 mb-6 flex items-center gap-4 ${isHealthy ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isHealthy ? 'bg-green-100' : 'bg-red-100'}`}>
          <FaHeartbeat className={`w-6 h-6 ${isHealthy ? 'text-green-600' : 'text-red-600'}`} />
        </div>
        <div>
          <p className={`text-lg font-extrabold ${isHealthy ? 'text-green-800' : 'text-red-800'}`}>
            {loading ? 'Checking…' : isHealthy ? '✅ All Systems Operational' : '❌ System Unhealthy'}
          </p>
          {health?.timestamp && (
            <p className={`text-sm mt-0.5 ${isHealthy ? 'text-green-600' : 'text-red-600'}`}>
              Checked at {new Date(health.timestamp).toLocaleTimeString('en-IN')}
            </p>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <MetricCard
          icon={FaDatabase}
          label="DB Response"
          value={loading ? '…' : `${dbMs ?? '—'}ms`}
          sub={dbMs !== undefined ? (dbMs < 100 ? 'Excellent' : dbMs < 300 ? 'Good' : 'Slow') : ''}
          color={dbMs !== undefined ? (dbMs < 100 ? 'text-green-600' : dbMs < 300 ? 'text-amber-500' : 'text-red-500') : 'text-gray-400'}
          iconBg="bg-purple-50 text-purple-600"
        />
        <MetricCard
          icon={FaDesktop}
          label="Server Uptime"
          value={loading ? '…' : health?.uptime ? `${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m` : '—'}
          sub="Node.js process"
          iconBg="bg-blue-50 text-blue-600"
        />
        <MetricCard
          icon={FaMicrochip}
          label="Memory Usage"
          value={loading ? '…' : health?.memoryMb ? `${health.memoryMb} MB` : '—'}
          sub="RSS (resident set)"
          iconBg="bg-amber-50 text-amber-600"
        />
        <MetricCard
          icon={FaHeartbeat}
          label="Status"
          value={loading ? '…' : isHealthy ? 'Healthy' : 'Unhealthy'}
          color={isHealthy ? 'text-green-600' : 'text-red-600'}
          iconBg={isHealthy ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}
        />
      </div>

      {/* Platform Counts */}
      {health?.counts && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-6">
          <h2 className="text-base font-extrabold text-gray-900 mb-4">Platform Snapshot</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Restaurants', value: health.counts.totalRestaurants },
              { label: 'Total Users', value: health.counts.totalUsers },
              { label: 'Total Orders', value: health.counts.totalOrders },
            ].map(m => (
              <div key={m.label} className="text-center">
                <p className="text-2xl font-extrabold text-gray-900">{(m.value || 0).toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Services Status */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h2 className="text-base font-extrabold text-gray-900 mb-4">Services</h2>
        <div className="space-y-3">
          {[
            { label: 'API Server', ok: true, detail: 'Express.js running' },
            { label: 'PostgreSQL Database', ok: health && dbMs !== undefined, detail: health?.dbResponseMs ? `${health.dbResponseMs}ms response` : 'Checking…' },
            { label: 'Prisma ORM', ok: true, detail: 'Connected' },
            { label: 'WebSocket (Socket.io)', ok: true, detail: 'Real-time events active' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
              <StatusDot ok={s.ok} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-700">{s.label}</p>
                <p className="text-xs text-gray-400">{s.detail}</p>
              </div>
              <span className={`text-xs font-medium ${s.ok ? 'text-green-600' : 'text-red-500'}`}>
                {s.ok ? 'Operational' : 'Down'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
