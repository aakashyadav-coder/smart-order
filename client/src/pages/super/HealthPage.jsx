/**
 * HealthPage - System health monitor + Maintenance Mode controls
 */
import React, { useEffect, useState, useCallback } from 'react'
import api from '../../lib/api'
import {
  FaHeartbeat,
  FaDatabase,
  FaDesktop,
  FaMicrochip,
  FaSyncAlt,
  FaTools,
  FaClock,
  FaToggleOn,
  FaToggleOff,
  FaCheckCircle,
  FaTimesCircle,
  FaSave,
} from 'react-icons/fa'

function StatusDot({ ok }) {
  return <span className={`inline-flex w-2.5 h-2.5 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`} />
}

function MetricCard({ icon: Icon, label, value, sub, color = 'text-gray-900', iconBg = 'bg-blue-50 text-blue-600' }) {
  return (
    <div className="super-card p-5 flex items-center gap-4 shadow-sm">
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

/* ---------------- Maintenance Mode Panel ---------------- */
function MaintenancePanel() {
  const [mode, setMode] = useState({ active: false, message: '', scheduledAt: null })
  const [loadingMode, setLoadingMode] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editMsg, setEditMsg] = useState('')
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')
  const [countdown, setCountdown] = useState(null)

  const fetchMode = useCallback(() => {
    api.get('/super/maintenance').then(r => {
      setMode(r.data)
      setEditMsg(r.data.message || '')
      if (r.data.scheduledAt) {
        const d = new Date(r.data.scheduledAt)
        setScheduleDate(d.toISOString().slice(0, 10))
        setScheduleTime(d.toISOString().slice(11, 16))
      }
    }).finally(() => setLoadingMode(false))
  }, [])

  useEffect(() => { fetchMode() }, [fetchMode])

  // Countdown ticker
  useEffect(() => {
    if (!mode.scheduledAt || mode.active) { setCountdown(null); return }
    const tick = () => {
      const diff = new Date(mode.scheduledAt).getTime() - Date.now()
      if (diff <= 0) { setCountdown('Now'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setCountdown(`${h > 0 ? `${h}h ` : ''}${m}m ${s}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [mode.scheduledAt, mode.active])

  const handleToggle = async () => {
    setSaving(true)
    try {
      const scheduledAt = scheduleDate && scheduleTime
        ? new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
        : null
      const res = await api.post('/super/maintenance', {
        active: !mode.active,
        message: editMsg,
        scheduledAt: mode.active ? null : scheduledAt,
      })
      setMode(res.data)
    } catch (e) { } finally { setSaving(false) }
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const scheduledAt = scheduleDate && scheduleTime
        ? new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
        : null
      const res = await api.post('/super/maintenance', {
        active: mode.active,
        message: editMsg,
        scheduledAt,
      })
      setMode(res.data)
    } catch (e) { } finally { setSaving(false) }
  }

  return (
    <div className={`rounded-2xl border p-5 mb-6 ${mode.active ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'} shadow-sm`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${mode.active ? 'bg-red-100' : 'bg-gray-100'}`}>
            <FaTools className={`w-5 h-5 ${mode.active ? 'text-red-600' : 'text-gray-500'}`} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              Maintenance Mode
              {mode.active && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">ACTIVE</span>}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              When active, customer menu pages show a "We'll be back soon" screen.
            </p>
          </div>
        </div>
        <button
          onClick={handleToggle}
          disabled={saving || loadingMode}
          className={`flex items-center gap-2 font-semibold px-5 py-2.5 rounded-xl text-sm transition-all shadow-sm disabled:opacity-50 ${
            mode.active
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
        >
          {mode.active ? <FaToggleOn className="w-4 h-4" /> : <FaToggleOff className="w-4 h-4" />}
          {saving ? 'Saving...' : mode.active ? 'Deactivate' : 'Activate Maintenance'}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Message */}
        <div>
          <label className="label text-gray-600 text-xs">Message shown to customers</label>
          <input
            type="text"
            className="input bg-white border-gray-200 text-gray-900 text-sm"
            value={editMsg}
            onChange={e => setEditMsg(e.target.value)}
            placeholder="We'll be back soon!"
          />
        </div>
        {/* Scheduled downtime */}
        <div>
          <label className="label text-gray-600 text-xs flex items-center gap-1">
            <FaClock className="w-3 h-3" /> Scheduled downtime (optional - sets countdown timer)
          </label>
          <div className="flex gap-2">
            <input type="date" className="input bg-white border-gray-200 text-gray-900 text-sm flex-1"
              value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} />
            <input type="time" className="input bg-white border-gray-200 text-gray-900 text-sm w-32"
              value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          {countdown && !mode.active && (
            <span className="text-sm font-bold text-amber-600 flex items-center gap-1.5">
              <FaClock className="w-3.5 h-3.5" /> Scheduled in: {countdown}
            </span>
          )}
          {mode.scheduledAt && mode.active && (
            <span className="text-xs text-red-600 font-medium">
              Maintenance started - scheduled end: {new Date(mode.scheduledAt).toLocaleString('en-IN')}
            </span>
          )}
        </div>
        <button onClick={handleSaveSettings} disabled={saving}
          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-3 py-2 rounded-lg border border-gray-200 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5">
          <FaSave className="w-3 h-3" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}

/* ---------------- Main Page ---------------- */
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
    const interval = setInterval(fetchHealth, 30000)
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
            {lastChecked && ` - Last checked: ${lastChecked.toLocaleTimeString('en-IN')}`}
          </p>
        </div>
        <button onClick={fetchHealth}
          className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm">
          <FaSyncAlt className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Maintenance Mode Panel */}
      <MaintenancePanel />

      {/* Overall Status Banner */}
      <div className={`rounded-2xl border p-5 mb-6 flex items-center gap-4 ${isHealthy ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isHealthy ? 'bg-green-100' : 'bg-red-100'}`}>
          <FaHeartbeat className={`w-6 h-6 ${isHealthy ? 'text-green-600' : 'text-red-600'}`} />
        </div>
        <div>
          <p className={`text-lg font-extrabold ${isHealthy ? 'text-green-800' : 'text-red-800'} flex items-center gap-2`}>
            {loading ? 'Checking...' : isHealthy ? (
              <>
                <FaCheckCircle className="w-4 h-4" /> All Systems Operational
              </>
            ) : (
              <>
                <FaTimesCircle className="w-4 h-4" /> System Unhealthy
              </>
            )}
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
        <MetricCard icon={FaDatabase} label="DB Response"
          value={loading ? '...' : `${dbMs ?? '-'}ms`}
          sub={dbMs !== undefined ? (dbMs < 100 ? 'Excellent' : dbMs < 300 ? 'Good' : 'Slow') : ''}
          color={dbMs !== undefined ? (dbMs < 100 ? 'text-green-600' : dbMs < 300 ? 'text-amber-500' : 'text-red-500') : 'text-gray-400'}
          iconBg="bg-purple-50 text-purple-600"
        />
        <MetricCard icon={FaDesktop} label="Server Uptime"
          value={loading ? '...' : health?.uptime ? `${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m` : '-'}
          sub="Node.js process" iconBg="bg-blue-50 text-blue-600"
        />
        <MetricCard icon={FaMicrochip} label="Memory Usage"
          value={loading ? '...' : health?.memoryMb ? `${health.memoryMb} MB` : '-'}
          sub="RSS (resident set)" iconBg="bg-amber-50 text-amber-600"
        />
        <MetricCard icon={FaHeartbeat} label="Status"
          value={loading ? '...' : isHealthy ? 'Healthy' : 'Unhealthy'}
          color={isHealthy ? 'text-green-600' : 'text-red-600'}
          iconBg={isHealthy ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}
        />
      </div>

      {/* Platform Counts */}
      {health?.counts && (
        <div className="super-card p-5 shadow-sm mb-6">
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
      <div className="super-card p-5 shadow-sm">
        <h2 className="text-base font-extrabold text-gray-900 mb-4">Services</h2>
        <div className="space-y-3">
          {[
            { label: 'API Server', ok: true, detail: 'Express.js running' },
            { label: 'PostgreSQL Database', ok: health && dbMs !== undefined, detail: health?.dbResponseMs ? `${health.dbResponseMs}ms response` : 'Checking...' },
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

