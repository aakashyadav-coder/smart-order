/**
 * KitchenLoginPage — JWT auth form for kitchen/admin staff
 */
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'

export default function KitchenLoginPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated } = useAuth()

  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Already logged in → redirect
  React.useEffect(() => {
    if (isAuthenticated) navigate('/kitchen', { replace: true })
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/login', form)
      login(res.data.token)
      toast.success(`Welcome, ${res.data.user.name}! 👋`)
      navigate('/kitchen', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-brand-500/30">
            🍽️
          </div>
          <h1 className="text-2xl font-extrabold text-white">Smart Order</h1>
          <p className="text-gray-400 text-sm mt-1">Kitchen Dashboard Login</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-3xl p-6 border border-gray-800 space-y-4 shadow-2xl">
          {error && (
            <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm px-4 py-3 rounded-xl animate-fade-in">
              {error}
            </div>
          )}

          <div>
            <label className="label text-gray-300">Email</label>
            <input
              type="email"
              autoComplete="email"
              placeholder="admin@restaurant.com"
              required
              className="input bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-brand-500 focus:border-brand-500"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            />
          </div>

          <div>
            <label className="label text-gray-300">Password</label>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              required
              className="input bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-brand-500 focus:border-brand-500"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3.5 mt-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Logging in…
              </span>
            ) : 'Login to Kitchen Dashboard'}
          </button>

          <p className="text-gray-500 text-xs text-center mt-2">
            Default: admin@restaurant.com / admin123
          </p>
        </form>
      </div>
    </div>
  )
}
