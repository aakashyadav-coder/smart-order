/**
 * FeaturesPage — per-restaurant feature toggle management
 */
import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'

const Toggle = ({ label, description, checked, onChange }) => (
  <div className="flex items-center justify-between py-4 border-b border-gray-800 last:border-0">
    <div>
      <p className="text-white font-medium text-sm">{label}</p>
      <p className="text-gray-500 text-xs mt-0.5">{description}</p>
    </div>
    <button
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${checked ? 'bg-purple-600' : 'bg-gray-700'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  </div>
)

export default function FeaturesPage() {
  const [restaurants, setRestaurants] = useState([])
  const [selected, setSelected] = useState('')
  const [features, setFeatures] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/super/restaurants').then(r => {
      setRestaurants(r.data)
      if (r.data.length > 0) setSelected(r.data[0].id)
    })
  }, [])

  useEffect(() => {
    if (!selected) return
    setLoading(true)
    api.get(`/features/${selected}`)
      .then(r => setFeatures(r.data))
      .finally(() => setLoading(false))
  }, [selected])

  const toggle = async (key) => {
    const next = { ...features, [key]: !features[key] }
    setFeatures(next)
    setSaving(true)
    try {
      await api.put(`/features/${selected}`, { [key]: next[key] })
      toast.success('Feature updated')
    } catch (e) {
      setFeatures(features)
      toast.error(e.message)
    } finally { setSaving(false) }
  }

  const restaurantName = restaurants.find(r => r.id === selected)?.name

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-white">Feature Toggles</h1>
        <p className="text-gray-500 text-sm mt-1">Enable or disable features per restaurant</p>
      </div>

      {/* Restaurant selector */}
      <div className="mb-6">
        <label className="label text-gray-300 text-sm">Select Restaurant</label>
        <select
          className="input bg-gray-800 border-gray-700 text-white max-w-xs focus:ring-purple-500 focus:border-purple-500"
          value={selected}
          onChange={e => setSelected(e.target.value)}
        >
          {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : features ? (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 max-w-lg">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="font-bold text-white">{restaurantName}</h2>
            {saving && <span className="text-xs text-purple-400 animate-pulse">Saving…</span>}
          </div>
          <div className="px-5">
            <Toggle
              label="OTP Verification"
              description="Send OTP to customers via SMS when order is accepted"
              checked={features.otpEnabled}
              onChange={() => toggle('otpEnabled')}
            />
            <Toggle
              label="Payment Integration"
              description="Enable eSewa / Khalti payment gateway at checkout"
              checked={features.paymentsEnabled}
              onChange={() => toggle('paymentsEnabled')}
            />
            <Toggle
              label="Sound Notifications"
              description="Play audio alert in kitchen dashboard when new order arrives"
              checked={features.notificationsEnabled}
              onChange={() => toggle('notificationsEnabled')}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
