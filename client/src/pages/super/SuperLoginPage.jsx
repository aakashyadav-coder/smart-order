/**
 * SuperLoginPage — standalone dark login for Super Admin
 */
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

export default function SuperLoginPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated, user } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isAuthenticated && user?.role === 'SUPER_ADMIN') navigate('/super', { replace: true })
  }, [isAuthenticated, user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/login', form)
      if (res.data.user.role !== 'SUPER_ADMIN') {
        setError('Access denied. This portal is for Super Admins only.')
        return
      }
      login(res.data.token)
      toast.success('Welcome, Super Admin! 🔮')
      navigate('/super', { replace: true })
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
          <div className="w-16 h-16 bg-gradient-to-br from-brand-500 to-purple-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-xl shadow-purple-500/30">
            🔮
          </div>
          <h1 className="text-2xl font-extrabold text-white">Developer Portal</h1>
          <p className="text-gray-500 text-sm mt-1">Smart Order Super Admin</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-3xl p-6 border border-gray-800 space-y-4 shadow-2xl">
          {error && (
            <div className="bg-red-900/40 border border-red-700/60 text-red-300 text-sm px-4 py-3 rounded-xl animate-fade-in">
              {error}
            </div>
          )}

          <div>
            <label className="label text-gray-300 text-sm">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="superadmin@smartorder.dev"
              className="input bg-gray-800 border-gray-700 text-white placeholder-gray-600 focus:ring-purple-500 focus:border-purple-500"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            />
          </div>

          <div>
            <label className="label text-gray-300 text-sm">Password</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="input bg-gray-800 border-gray-700 text-white placeholder-gray-600 focus:ring-purple-500 focus:border-purple-500"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-brand-500 hover:from-purple-700 hover:to-brand-600 transition-all duration-200 shadow-lg disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Authenticating…
              </span>
            ) : 'Access Developer Portal'}
          </button>

          <p className="text-gray-600 text-xs text-center">superadmin@smartorder.dev / super123</p>
        </form>

        <p className="text-center mt-5 text-xs text-gray-700">
          <a href="/kitchen/login" className="hover:text-gray-500 transition-colors">Kitchen staff login →</a>
        </p>
      </div>
    </div>
  )
}
