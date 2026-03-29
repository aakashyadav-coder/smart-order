/**
 * KitchenLoginPage — Premium dark login for kitchen staff
 * Theme: Deep dark with animated red mesh background
 */
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { FaConciergeBell, FaEye, FaEyeSlash } from 'react-icons/fa'

export default function KitchenLoginPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated } = useAuth()

  const [form, setForm] = useState({ email: '', password: '' })
  const [rememberMe, setRememberMe] = useState(true) // default ON for kitchen displays
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPw, setShowPw] = useState(false)

  React.useEffect(() => {
    if (isAuthenticated) navigate('/kitchen', { replace: true })
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/login', { ...form, rememberMe })
      login(res.data.token, res.data.refreshToken, rememberMe)
      toast.success(`Welcome, ${res.data.user.name}!`)
      navigate('/kitchen', { replace: true })
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
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-brand-800/15 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo mark */}
        <div className="text-center mb-8">
          <div className="relative inline-flex">
            <div className="w-20 h-20 bg-gradient-to-br from-brand-500 to-brand-700 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-brand-600/40 animate-float">
              <FaConciergeBell className="w-10 h-10 text-white" />
            </div>
            {/* Glow ring */}
            <div className="absolute inset-0 w-20 h-20 bg-gradient-to-br from-brand-500 to-brand-700 rounded-3xl mx-auto mb-4 blur-xl opacity-40" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mt-4">Code Yatra</h1>
          <p className="text-gray-400 text-sm mt-1.5 font-medium">Kitchen Dashboard</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl p-7 border border-white/10 shadow-2xl" style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)' }}>
          {/* Portal badge */}
          <div className="flex items-center justify-center mb-6">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-brand-600/20 border border-brand-500/30 text-brand-400">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
              Kitchen Staff Portal
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
                autoComplete="email"
                placeholder="Email address"
                required
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
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                  className="input-dark w-full pr-11"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors p-1"
                >
                  {showPw ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me (Fix R5) */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded accent-brand-500"
              />
              <span className="text-gray-400 text-sm">Remember me for 30 days</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 mt-2 text-base rounded-xl"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : (
                <>
                  <FaConciergeBell className="w-4 h-4" />
                  Login to Kitchen Dashboard
                </>
              )}
            </button>
          </form>

          <p className="text-gray-600 text-xs text-center mt-5">
            Use your assigned kitchen account credentials.
          </p>
        </div>

        {/* Portal links */}
        <div className="text-center mt-6 flex items-center justify-center gap-4">
          <a href="/owner/login" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">Owner portal →</a>
          <span className="text-gray-800">·</span>
          <a href="/super/login" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">Developer portal →</a>
        </div>
      </div>
    </div>
  )
}
