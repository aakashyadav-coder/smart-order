/**
 * OwnerLoginPage - Light image login for restaurant owners
 */
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { FaEye, FaEyeSlash, FaLock, FaUser } from 'react-icons/fa'

export default function OwnerLoginPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated, user } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPw, setShowPw] = useState(false)

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
      const res = await api.post('/auth/login', { ...form, rememberMe })
      const role = res.data.user.role
      if (role !== 'OWNER' && role !== 'ADMIN') {
        setError('Access denied. This portal is for Restaurant Owners only.')
        return
      }
      login(res.data.token, res.data.refreshToken, rememberMe)
      toast.success(`Welcome back, ${res.data.user.name}!`)
      navigate('/owner', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6 relative">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl overflow-hidden grid md:grid-cols-2">
        <div className="hidden md:flex items-center justify-center bg-gray-50 p-10">
          <img
            src="/images/ownerlogin.png"
            alt="Owner login illustration"
            className="w-full max-w-sm h-auto object-contain"
          />
        </div>

        <div className="p-8 sm:p-12">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-gray-900">Sign in</h1>
          </div>

          {error && (
            <div className="mb-5 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Email</label>
              <div className="relative">
                <FaUser className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="Email address"
                  className="w-full border-b border-gray-300 focus:border-blue-500 outline-none pl-7 py-2 text-gray-900 placeholder:text-gray-300"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1">Password</label>
              <div className="relative">
                <FaLock className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="********"
                  className="w-full border-b border-gray-300 focus:border-blue-500 outline-none pl-7 pr-10 py-2 text-gray-900 placeholder:text-gray-300"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  {showPw ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-500">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                />
                Remember me
              </label>

              <button
                type="submit"
                disabled={loading}
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 px-6 rounded-md w-full sm:w-40 transition-colors disabled:opacity-60"
              >
                {loading ? 'Signing in...' : 'Log in'}
              </button>
            </div>
          </form>

          <div className="mt-8 text-xs text-gray-400 flex items-center gap-3">
            <a href="/kitchen/login" className="hover:text-gray-600">Kitchen staff</a>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center">
        <p className="text-sm font-semibold text-gray-900">2026 CodeYatra PVT.LTD. All Rights Reserved</p>
      </div>
    </div>
  )
}
