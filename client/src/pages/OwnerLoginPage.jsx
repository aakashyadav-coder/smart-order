/**
 * OwnerLoginPage — separate login portal for restaurant owners
 */
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'

export default function OwnerLoginPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated, user } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isAuthenticated && (user?.role === 'OWNER' || user?.role === 'ADMIN')) {
      navigate('/owner', { replace: true })
    }
  }, [isAuthenticated, user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/login', form)
      const role = res.data.user.role
      if (role !== 'OWNER' && role !== 'ADMIN') {
        setError('Access denied. This portal is for Restaurant Owners only.')
        return
      }
      login(res.data.token)
      toast.success(`Welcome back, ${res.data.user.name}! 🏢`)
      navigate('/owner', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-brand-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-brand-500 to-orange-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-xl shadow-brand-500/30">
            🏢
          </div>
          <h1 className="text-2xl font-extrabold text-white">Owner Portal</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your restaurant</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-3xl p-6 border border-gray-800 space-y-4 shadow-2xl">
          {error && (
            <div className="bg-red-900/40 border border-red-700/60 text-red-300 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="label text-sm">Email</label>
            <input
              type="email" required autoComplete="email"
              placeholder="owner@restaurant.com"
              className="input bg-gray-800 border-gray-700 text-white placeholder-gray-600 focus:ring-brand-500 focus:border-brand-500"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            />
          </div>

          <div>
            <label className="label text-sm">Password</label>
            <input
              type="password" required autoComplete="current-password"
              placeholder="••••••••"
              className="input bg-gray-800 border-gray-700 text-white placeholder-gray-600 focus:ring-brand-500 focus:border-brand-500"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
            />
          </div>

          <button
            type="submit" disabled={loading}
            className="btn-primary w-full py-3.5 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Signing in…
              </span>
            ) : 'Sign in to Owner Portal'}
          </button>

          <p className="text-gray-600 text-xs text-center">owner@restaurant.com / owner123</p>
        </form>

        <div className="text-center mt-5 space-y-2">
          <a href="/kitchen/login" className="block text-xs text-gray-700 hover:text-gray-500 transition-colors">Kitchen staff login →</a>
          <a href="/super/login" className="block text-xs text-gray-700 hover:text-gray-500 transition-colors">Developer portal →</a>
        </div>
      </div>
    </div>
  )
}
