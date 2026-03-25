/**
 * SuperLoginPage — Premium dark login for Super Admin
 * Theme: Same dark template, purple-red accent
 */
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { Shield, Eye, EyeOff } from '../../components/Icons'

export default function SuperLoginPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated, user } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPw, setShowPw] = useState(false)

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
      toast.success('Welcome, Super Admin!')
      navigate('/super', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-bg min-h-screen flex items-center justify-center p-4">
      {/* Decorative blur blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-700/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-brand-900/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo mark */}
        <div className="text-center mb-8">
          <div className="relative inline-flex">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-brand-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-purple-600/40 animate-float">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <div className="absolute inset-0 w-20 h-20 bg-gradient-to-br from-purple-600 to-brand-600 rounded-3xl mx-auto mb-4 blur-xl opacity-30" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mt-4">Smart Order</h1>
          <p className="text-gray-400 text-sm mt-1.5 font-medium">Developer Portal</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl p-7 border border-white/10 shadow-2xl" style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)' }}>
          {/* Portal badge */}
          <div className="flex items-center justify-center mb-6">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-purple-600/20 border border-purple-500/30 text-purple-400">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              Super Admin Access
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-950/60 border border-red-700/60 text-red-300 text-sm px-4 py-3 rounded-xl animate-fade-in flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="label-dark">Email address</label>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="superadmin@smartorder.dev"
                className="input-dark w-full"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              />
            </div>

            <div>
              <label className="label-dark">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="input-dark w-full pr-11"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors p-1"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-2 text-base rounded-xl font-semibold text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #9333ea, #e11d48)' }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Authenticating…
                </span>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Access Developer Portal
                </>
              )}
            </button>
          </form>

          <p className="text-gray-600 text-xs text-center mt-5">
            superadmin@smartorder.dev · super123
          </p>
        </div>

        {/* Portal links */}
        <div className="text-center mt-6">
          <a href="/kitchen/login" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">← Kitchen staff login</a>
        </div>
      </div>
    </div>
  )
}
