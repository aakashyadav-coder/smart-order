/**
 * OnboardingPage - Restaurant onboarding pipeline view
 * Stages: NOT_STARTED, PARTIAL, LIVE
 * With "Send Nudge" broadcast to restaurants by stage
 */
import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import {
  FaSyncAlt,
  FaBullhorn,
  FaCheckCircle,
  FaTimesCircle,
  FaChartLine,
  FaUtensils,
  FaUsers,
  FaShoppingBag,
  FaTable,
  FaClock,
  FaTimes,
} from 'react-icons/fa'

const STAGE_CONFIG = {
  NOT_STARTED: {
    label: 'Not Started',
    icon: FaTimesCircle,
    color: 'bg-red-50 border-red-200 text-red-700',
    badgeBg: 'bg-red-100 text-red-700',
    dot: 'bg-red-500',
    desc: 'No menu and no staff configured',
  },
  PARTIAL: {
    label: 'Partial',
    icon: FaSyncAlt,
    color: 'bg-amber-50 border-amber-200 text-amber-700',
    badgeBg: 'bg-amber-100 text-amber-700',
    dot: 'bg-amber-400',
    desc: 'Missing menu, staff, or first order',
  },
  LIVE: {
    label: 'Fully Live',
    icon: FaCheckCircle,
    color: 'bg-green-50 border-green-200 text-green-700',
    badgeBg: 'bg-green-100 text-green-700',
    dot: 'bg-green-500',
    desc: 'Menu, staff & first order all set',
  },
}

const CHECK_ICONS = {
  menu: FaUtensils,
  staff: FaUsers,
  orders: FaShoppingBag,
  tables: FaTable,
  hours: FaClock,
}

function NudgeModal({ stage, onClose, onSend }) {
  const s = STAGE_CONFIG[stage] || {}
  const StageIcon = s.icon || FaBullhorn
  const [title, setTitle] = useState(`Action Required - Complete Your Setup`)
  const [message, setMessage] = useState(
    stage === 'NOT_STARTED'
      ? 'Get started by adding your menu items and creating staff accounts on your restaurant dashboard.'
      : 'Your restaurant is almost ready! Please complete the remaining setup steps to go fully live.'
  )
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) return toast.error('Title and message required')
    setSending(true)
    try {
      await onSend(stage, title, message)
      onClose()
    } finally { setSending(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="super-card w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/70 rounded-t-2xl">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <FaBullhorn className="text-brand-600 w-4 h-4" />
            Nudge {s.label} Restaurants
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100">
            <FaTimes className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className={`rounded-xl border px-3 py-2 text-xs font-medium flex items-center gap-2 ${s.color}`}>
            <StageIcon className="w-3.5 h-3.5" />
            This will send an announcement to all <strong>{s.label}</strong> restaurants.
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-600 text-xs">Announcement Title</label>
            <input type="text" className="w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-white border-gray-200 text-gray-900 text-sm"
              value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-600 text-xs">Message</label>
            <textarea rows={4} className="w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-white border-gray-200 text-gray-900 text-sm resize-none"
              value={message} onChange={e => setMessage(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 font-semibold transition-colors flex-1 py-2.5 text-sm">Cancel</button>
          <button onClick={handleSend} disabled={sending}
            className="flex-1 py-2.5 rounded-xl font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-sm transition-colors shadow-sm inline-flex items-center justify-center gap-2">
            <FaBullhorn className="w-3.5 h-3.5" />
            {sending ? 'Sending...' : `Send to ${s.label}`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stageFilter, setStageFilter] = useState('ALL')
  const [nudgeStage, setNudgeStage] = useState(null)

  const fetchData = useCallback(() => {
    setLoading(true)
    api.get('/super/onboarding')
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load onboarding data'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleNudge = async (stage, title, message) => {
    const res = await api.post('/super/onboarding/nudge', { stage, title, message })
    toast.success(`Nudge sent to ${res.data.sent} restaurant(s)!`)
    fetchData()
  }

  const pipeline = data?.pipeline || []
  const summary = data?.summary || { NOT_STARTED: 0, PARTIAL: 0, LIVE: 0 }
  const total = pipeline.length

  const filtered = stageFilter === 'ALL' ? pipeline : pipeline.filter(r => r.stage === stageFilter)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Onboarding Pipeline</h1>
          <p className="text-gray-400 text-sm mt-1">{total} restaurant(s) - track setup progress</p>
        </div>
        <button onClick={fetchData}
          className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold px-4 py-2.5 rounded-xl text-sm shadow-sm transition-colors">
          <FaSyncAlt className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Stage Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {(['NOT_STARTED', 'PARTIAL', 'LIVE']).map(stage => {
          const cfg = STAGE_CONFIG[stage]
          const Icon = cfg.icon
          const count = summary[stage] || 0
          const isActive = stageFilter === stage
          return (
            <button key={stage} onClick={() => setStageFilter(isActive ? 'ALL' : stage)}
              className={`rounded-2xl border p-5 text-left transition-all ${cfg.color} ${isActive ? 'ring-2 ring-offset-1 ring-brand-400 shadow-md' : 'hover:shadow-sm'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-3xl font-extrabold">{count}</p>
                  <p className="text-sm font-bold mt-0.5 flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5" /> {cfg.label}
                  </p>
                  <p className="text-xs mt-1 opacity-70">{cfg.desc}</p>
                </div>
                {count > 0 && stage !== 'LIVE' && (
                  <button
                    onClick={e => { e.stopPropagation(); setNudgeStage(stage) }}
                    className="flex items-center gap-1 text-xs font-semibold bg-white/60 hover:bg-white px-2.5 py-1.5 rounded-lg border border-current/20 transition-colors mt-1"
                  >
                    <FaBullhorn className="w-3 h-3" /> Nudge
                  </button>
                )}
              </div>
              {count > 0 && (
                <div className="mt-3 w-full bg-white/50 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full ${cfg.dot}`}
                    style={{ width: `${total > 0 ? Math.round((count / total) * 100) : 0}%` }} />
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {['ALL', 'NOT_STARTED', 'PARTIAL', 'LIVE'].map(s => {
          const cfg = s === 'ALL' ? null : STAGE_CONFIG[s]
          const Icon = cfg?.icon
          return (
            <button key={s} onClick={() => setStageFilter(s)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                stageFilter === s
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-500 border-gray-200 hover:text-gray-700'
              }`}>
              {s === 'ALL' ? `All (${total})` : (
                <span className="inline-flex items-center gap-1.5">
                  <Icon className="w-3 h-3" /> {cfg.label} ({summary[s] || 0})
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Restaurant Pipeline Table */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="super-card p-5 animate-pulse h-24" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="super-card p-10 text-center text-gray-400">
          No restaurants in this stage.
        </div>
      ) : (
        <div className="super-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                {['Restaurant', 'Stage', 'Progress', 'Checklist', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(r => {
                const cfg = STAGE_CONFIG[r.stage]
                const StageIcon = cfg.icon
                return (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-gray-900">{r.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5 inline-flex items-center gap-1.5">
                        {r.active ? <FaCheckCircle className="w-3 h-3 text-green-500" /> : <FaTimesCircle className="w-3 h-3 text-red-500" />}
                        {r.active ? 'Active' : 'Inactive'} - ID: {r.id.slice(-6).toUpperCase()}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${cfg.badgeBg}`}>
                        <StageIcon className="w-3 h-3" /> {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-4 w-36">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${r.stage === 'LIVE' ? 'bg-green-500' : r.stage === 'PARTIAL' ? 'bg-amber-400' : 'bg-red-400'}`}
                            style={{ width: `${r.pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-gray-500 w-8 text-right">{r.pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-1.5 flex-wrap">
                        {r.checks.map(c => {
                          const CheckIcon = CHECK_ICONS[c.key]
                          return (
                            <span key={c.key} title={c.label}
                              className={`text-xs px-1.5 py-0.5 rounded font-medium flex items-center gap-1 ${c.done ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                              <CheckIcon className="w-3 h-3" />
                              {c.done
                                ? <FaCheckCircle className="w-2.5 h-2.5" />
                                : <FaTimesCircle className="w-2.5 h-2.5" />
                              }
                            </span>
                          )
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => navigate(`/super/restaurants/${r.id}`)}
                          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg border border-gray-200 transition-colors font-medium inline-flex items-center gap-1.5">
                          <FaChartLine className="w-3 h-3" /> View
                        </button>
                        {r.stage !== 'LIVE' && (
                          <button onClick={() => setNudgeStage(r.stage)}
                            className="text-xs bg-brand-50 hover:bg-brand-100 text-brand-600 px-3 py-1.5 rounded-lg border border-brand-200 transition-colors font-medium inline-flex items-center gap-1.5">
                            <FaBullhorn className="w-3 h-3" /> Nudge
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Nudge Modal */}
      {nudgeStage && (
        <NudgeModal
          stage={nudgeStage}
          onClose={() => setNudgeStage(null)}
          onSend={handleNudge}
        />
      )}
    </div>
  )
}

