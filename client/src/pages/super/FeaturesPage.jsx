/**
 * FeaturesPage - per-restaurant feature toggle management
 * Theme: White/light (matches entire Super Admin dashboard)
 */
import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { FaCog, FaCheckCircle, FaLock, FaMoneyBillWave, FaBell, FaMinus } from 'react-icons/fa'

const FEATURES_META = [
  {
    key: 'otpEnabled',
    label: 'OTP Verification',
    description: 'Send a one-time password to customers via SMS when their order is accepted.',
    icon: FaLock,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
  },
  {
    key: 'paymentsEnabled',
    label: 'Payment Integration',
    description: 'Enable eSewa / Khalti payment gateway at checkout for online transactions.',
    icon: FaMoneyBillWave,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-100',
  },
  {
    key: 'notificationsEnabled',
    label: 'Sound Notifications',
    description: 'Play audio alert in the kitchen dashboard whenever a new order arrives.',
    icon: FaBell,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
  },
]

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-40 ${
        checked ? 'bg-brand-600' : 'bg-gray-200'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export default function FeaturesPage() {
  const [restaurants, setRestaurants] = useState([])
  const [selected, setSelected]       = useState('')
  const [features, setFeatures]       = useState(null)
  const [loading, setLoading]         = useState(false)
  const [saving, setSaving]           = useState(null) // key of feature being saved

  useEffect(() => {
    api.get('/super/restaurants').then(r => {
      setRestaurants(r.data)
      if (r.data.length > 0) setSelected(r.data[0].id)
    })
  }, [])

  useEffect(() => {
    if (!selected) return
    setLoading(true)
    setFeatures(null)
    api.get(`/features/${selected}`)
      .then(r => setFeatures(r.data))
      .finally(() => setLoading(false))
  }, [selected])

  const toggle = async (key) => {
    const prev = { ...features }
    const next = { ...features, [key]: !features[key] }
    setFeatures(next)
    setSaving(key)
    try {
      await api.put(`/features/${selected}`, { [key]: next[key] })
      toast.success(`${FEATURES_META.find(f => f.key === key)?.label} ${next[key] ? 'enabled' : 'disabled'}`)
    } catch (e) {
      setFeatures(prev)
      toast.error(e.response?.data?.message || 'Failed to update feature')
    } finally {
      setSaving(null)
    }
  }

  const restaurantName = restaurants.find(r => r.id === selected)?.name
  const enabledCount = features ? FEATURES_META.filter(f => features[f.key]).length : 0

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-sm">
            <FaCog className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Feature Toggles</h1>
            <p className="text-gray-400 text-sm mt-1">Enable or disable platform features per restaurant</p>
          </div>
        </div>
        {features && (
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
            <FaCheckCircle className="w-3.5 h-3.5 text-green-500" />
            <span className="text-sm font-semibold text-gray-700">
              {enabledCount} / {FEATURES_META.length} features enabled
            </span>
          </div>
        )}
      </div>

      {/* Restaurant selector */}
      <div className="super-card p-5 mb-5">
        <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
          Select Restaurant
        </label>
        <select
          className="input bg-white border-gray-200 text-gray-900 max-w-sm"
          value={selected}
          onChange={e => setSelected(e.target.value)}
        >
          {restaurants.map(r => (
            <option key={r.id} value={r.id}>{r.name}{!r.active ? ' (Inactive)' : ''}</option>
          ))}
        </select>
        {restaurantName && (
          <p className="text-xs text-gray-400 mt-2">
            Editing features for <strong className="text-gray-700">{restaurantName}</strong>
          </p>
        )}
      </div>

      {/* Feature cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FEATURES_META.map(f => (
            <div key={f.key} className="super-card p-5 animate-pulse h-36" />
          ))}
        </div>
      ) : features ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FEATURES_META.map(f => {
            const isOn    = !!features[f.key]
            const isSaving = saving === f.key
            const Icon = f.icon
            return (
              <div
                key={f.key}
                className={`super-card p-5 transition-all ${
                  isOn ? `${f.border} ring-1 ring-inset ring-${f.border.split('-')[1]}-100` : 'border-gray-100'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${f.bg} flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${f.color}`} />
                  </div>
                  <div className="flex items-center gap-2">
                    {isSaving && (
                      <span className="text-[10px] text-gray-400 font-medium animate-pulse">Saving...</span>
                    )}
                    <Toggle checked={isOn} onChange={() => toggle(f.key)} disabled={!!saving} />
                  </div>
                </div>
                <h3 className={`font-bold text-sm ${isOn ? 'text-gray-900' : 'text-gray-600'}`}>
                  {f.label}
                </h3>
                <p className="text-gray-400 text-xs mt-1 leading-relaxed">{f.description}</p>
                <div className="mt-3">
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isOn ? `${f.bg} ${f.color}` : 'bg-gray-100 text-gray-400'
                  }`}>
                    {isOn ? <FaCheckCircle className="w-3 h-3" /> : <FaMinus className="w-3 h-3" />}
                    {isOn ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      ) : !loading && restaurants.length === 0 ? (
        <div className="super-card p-10 text-center text-gray-400">
          <FaCog className="w-8 h-8 mx-auto mb-3 text-gray-200" />
          <p className="font-medium">No restaurants found</p>
          <p className="text-xs mt-1">Create a restaurant first to manage its features</p>
        </div>
      ) : null}
    </div>
  )
}

