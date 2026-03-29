/**
 * SuperLoginPage - Premium dark login for Super Admin
 * Step 1: email + password
 * Step 2: 6-digit TOTP code (shown only when totpEnabled=true on the account)
 */
import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { FaShieldAlt, FaEye, FaEyeSlash, FaArrowLeft, FaLock } from 'react-icons/fa'

export default function SuperLoginPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated, user } = useAuth()

  // ── Step 1: credentials ────────────────────────────────────────────────────
  const [form,       setForm]       = useState({ email: '', password: '' })
  const [rememberMe, setRememberMe] = useState(false)
  const [showPw,     setShowPw]     = useState(false)

  // ── Step 2: TOTP challenge ─────────────────────────────────────────────────
  const [step,         setStep]         = useState(1)        // 1 | 2
  const [preAuthToken, setPreAuthToken] = useState('')
  const [digits,       setDigits]       = useState(Array(6).fill(''))
  const digitRefs = useRef([])

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (isAuthenticated && user?.role === 'SUPER_ADMIN') navigate('/super', { replace: true })
  }, [isAuthenticated, user, navigate])

  // ── Step 1 submit ──────────────────────────────────────────────────────────
  const handleCredentials = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/login', { ...form, rememberMe })

      if (res.data.requireTotp) {
        // Server needs 2FA — move to step 2
        setPreAuthToken(res.data.preAuthToken)
        setStep(2)
        setTimeout(() => digitRefs.current[0]?.focus(), 80)
        return
      }

      if (res.data.user.role !== 'SUPER_ADMIN') {
        setError('Access denied. This portal is for Super Admins only.')
        return
      }
      login(res.data.token, res.data.refreshToken, rememberMe)
      toast.success('Welcome, Super Admin!')
      navigate('/super', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: digit input helpers ────────────────────────────────────────────
  const handleDigitChange = (idx, val) => {
    // Allow paste of full 6-digit code into any box
    if (val.length === 6 && /^\d{6}$/.test(val)) {
      const arr = val.split('')
      setDigits(arr)
      digitRefs.current[5]?.focus()
      return
    }
    const d = val.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[idx] = d
    setDigits(next)
    if (d && idx < 5) digitRefs.current[idx + 1]?.focus()
  }

  const handleDigitKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      digitRefs.current[idx - 1]?.focus()
    }
  }

  // ── Step 2 submit ──────────────────────────────────────────────────────────
  const handleTotpSubmit = async (e) => {
    e.preventDefault()
    const code = digits.join('')
    if (code.length !== 6) { setError('Please enter all 6 digits.'); return }
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/totp-verify', { preAuthToken, code, rememberMe })
      if (res.data.user.role !== 'SUPER_ADMIN') {
        setError('Access denied. This portal is for Super Admins only.')
        return
      }
      login(res.data.token, res.data.refreshToken, rememberMe)
      toast.success('Welcome, Super Admin!')
      navigate('/super', { replace: true })
    } catch (err) {
      setError(err.message)
      setDigits(Array(6).fill(''))
      setTimeout(() => digitRefs.current[0]?.focus(), 80)
    } finally {
      setLoading(false)
    }
  }

  // ── Shared card wrapper ────────────────────────────────────────────────────
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
              {step === 2
                ? <FaLock className="w-9 h-9 text-white" />
                : <FaShieldAlt className="w-10 h-10 text-white" />}
            </div>
            <div className="absolute inset-0 w-20 h-20 bg-gradient-to-br from-purple-600 to-brand-600 rounded-3xl mx-auto mb-4 blur-xl opacity-30" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mt-4">Smart Order</h1>
          <p className="text-gray-400 text-sm mt-1.5 font-medium">
            {step === 2 ? 'Two-Factor Authentication' : 'Developer Portal'}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl p-7 border border-white/10 shadow-2xl" style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)' }}>

          {/* Portal badge */}
          <div className="flex items-center justify-center mb-6">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-purple-600/20 border border-purple-500/30 text-purple-400">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              {step === 2 ? 'Verification Required' : 'Super Admin Access'}
            </span>
          </div>

          {/* ── Step 1: Credentials ── */}
          {step === 1 && (
            <form onSubmit={handleCredentials} className="space-y-4">
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
                    placeholder="********"
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

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded accent-purple-500"
                />
                <span className="text-gray-400 text-sm">Remember me for 30 days</span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 mt-2 text-base rounded-xl font-semibold text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #9333ea, #e11d48)' }}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Authenticating...
                  </span>
                ) : (
                  <>
                    <FaShieldAlt className="w-4 h-4" />
                    Access Developer Portal
                  </>
                )}
              </button>
            </form>
          )}

          {/* ── Step 2: TOTP Challenge ── */}
          {step === 2 && (
            <form onSubmit={handleTotpSubmit} className="space-y-5">
              <p className="text-gray-400 text-sm text-center leading-relaxed">
                Enter the 6-digit code from your authenticator app to complete sign-in.
              </p>

              {error && (
                <div className="bg-red-950/60 border border-red-700/60 text-red-300 text-sm px-4 py-3 rounded-xl animate-fade-in flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Six individual digit boxes */}
              <div className="flex gap-2 justify-center">
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={el => (digitRefs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={d}
                    onChange={e => handleDigitChange(i, e.target.value)}
                    onKeyDown={e => handleDigitKeyDown(i, e)}
                    className="w-11 h-13 text-center text-xl font-bold rounded-xl border border-white/15 bg-white/5 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 outline-none transition-all"
                    style={{ height: '3.25rem' }}
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={loading || digits.join('').length !== 6}
                className="w-full py-3.5 text-base rounded-xl font-semibold text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #9333ea, #e11d48)' }}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  <>
                    <FaLock className="w-4 h-4" />
                    Verify &amp; Sign In
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setStep(1); setDigits(Array(6).fill('')); setError('') }}
                className="w-full text-sm text-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center gap-1.5 pt-1"
              >
                <FaArrowLeft className="w-3 h-3" /> Back to login
              </button>
            </form>
          )}

          <p className="text-gray-600 text-xs text-center mt-5">
            superadmin@smartorder.dev · super123
          </p>
        </div>

        {/* Portal links */}
        {step === 1 && (
          <div className="text-center mt-6">
            <a href="/kitchen/login" className="text-xs text-gray-600 hover:text-gray-400 transition-colors inline-flex items-center gap-1.5">
              <FaArrowLeft className="w-3 h-3" /> Kitchen staff login
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

