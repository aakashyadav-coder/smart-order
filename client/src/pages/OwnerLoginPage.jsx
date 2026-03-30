/**
 * OwnerLoginPage — Brand-themed dark login for restaurant owners
 * Includes 3-step Forgot Password flow: Email → OTP → New Password
 */
import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import {
  FaEye, FaEyeSlash, FaLock, FaEnvelope,
  FaChevronLeft, FaStore,
} from 'react-icons/fa'

// ─── Forgot Password Modal ────────────────────────────────────────────────────
function ForgotPasswordModal({ onClose }) {
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [digits, setDigits] = useState(Array(6).fill(''))
  const [resetToken, setResetToken] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showNewPw, setShowNewPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const digitRefs = useRef([])

  const handleSendOtp = async (e) => {
    e?.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setStep(2)
      toast.success('OTP sent! Check your inbox.')
      setTimeout(() => digitRefs.current[0]?.focus(), 80)
    } catch (err) {
      setError(err.message || 'Failed to send OTP.')
    } finally {
      setLoading(false)
    }
  }

  const handleDigitChange = (idx, val) => {
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
  const handleDigitKey = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      digitRefs.current[idx - 1]?.focus()
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    const otp = digits.join('')
    if (otp.length !== 6) { setError('Enter all 6 digits.'); return }
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/verify-reset-otp', { email, otp })
      setResetToken(res.data.resetToken)
      setStep(3)
    } catch (err) {
      setError(err.message || 'Invalid OTP.')
      setDigits(Array(6).fill(''))
      setTimeout(() => digitRefs.current[0]?.focus(), 80)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (newPw !== confirmPw) { setError('Passwords do not match.'); return }
    if (newPw.length < 6) { setError('Password must be at least 6 characters.'); return }
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { resetToken, newPassword: newPw })
      setSuccess('Password updated successfully!')
      toast.success('Password reset! You can now log in.')
      setTimeout(onClose, 1800)
    } catch (err) {
      setError(err.message || 'Failed to reset password.')
    } finally {
      setLoading(false)
    }
  }

  const stepLabels = ['Enter Email', 'Verify OTP', 'New Password']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}>

        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b" style={{ borderColor: '#f3f4f6' }}>
          <div className="flex items-center justify-between mb-5">
            <button onClick={onClose} className="flex items-center gap-2 text-sm font-medium transition-colors text-gray-500 hover:text-gray-900">
              <FaChevronLeft size={11} /> Back to login
            </button>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100">
              Step {step} / 3
            </span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Forgot Password</h2>
          <p className="text-sm text-gray-500">{stepLabels[step - 1]}</p>
          <div className="flex gap-2 mt-4">
            {[1, 2, 3].map(s => (
              <div key={s} className="h-1 flex-1 rounded-full transition-all duration-300"
                style={{ background: s <= step ? '#e11d48' : '#f3f4f6' }} />
            ))}
          </div>
        </div>

        <div className="px-8 py-7">
          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl text-sm"
              style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
              {error}
            </div>
          )}
          {success && (
            <div className="mb-5 px-4 py-3 rounded-xl text-sm"
              style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a' }}>
              {success}
            </div>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Email address
                </label>
                <div className="relative">
                  <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type="email" required autoComplete="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full rounded-xl pl-11 pr-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all"
                    style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}
                    onFocus={e => e.currentTarget.style.borderColor = '#e11d48'}
                    onBlur={e => e.currentTarget.style.borderColor = '#e5e7eb'}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  We'll send a 6-digit OTP to this address.
                </p>
              </div>
              <button type="submit" disabled={loading}
                className="w-full font-semibold py-3 rounded-xl text-sm transition-all duration-200 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#be123c,#e11d48)', color: '#fff', boxShadow: '0 4px 14px rgba(225,29,72,0.25)' }}>
                {loading ? 'Sending OTP…' : 'Send OTP'}
              </button>
            </form>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  6-digit code sent to <span className="text-rose-600 font-semibold">{email}</span>
                </label>
                <div className="flex gap-2.5 justify-center my-4">
                  {digits.map((d, i) => (
                    <input
                      key={i}
                      ref={el => (digitRefs.current[i] = el)}
                      type="text" inputMode="numeric" maxLength={6}
                      value={d}
                      onChange={e => handleDigitChange(i, e.target.value)}
                      onKeyDown={e => handleDigitKey(i, e)}
                      className="w-11 h-13 text-center text-xl font-bold text-gray-900 rounded-xl outline-none transition-all"
                      style={{
                        height: '52px',
                        background: d ? '#fff1f2' : '#ffffff',
                        border: d ? '1.5px solid #e11d48' : '1px solid #e5e7eb',
                      }}
                    />
                  ))}
                </div>
                <button type="button"
                  onClick={() => { setDigits(Array(6).fill('')); handleSendOtp() }}
                  className="w-full text-xs font-medium text-center text-gray-500 hover:text-rose-600 transition-colors">
                  Didn't receive it? Resend OTP
                </button>
              </div>
              <button type="submit" disabled={loading || digits.join('').length !== 6}
                className="w-full font-semibold py-3 rounded-xl text-sm transition-all duration-200 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#be123c,#e11d48)', color: '#fff', boxShadow: '0 4px 14px rgba(225,29,72,0.25)' }}>
                {loading ? 'Verifying…' : 'Verify OTP'}
              </button>
            </form>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  New Password
                </label>
                <div className="relative">
                  <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                  <input
                    type={showNewPw ? 'text' : 'password'} required minLength={6}
                    placeholder="Min. 6 characters"
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    className="w-full rounded-xl pl-11 pr-12 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all"
                    style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}
                    onFocus={e => e.currentTarget.style.borderColor = '#e11d48'}
                    onBlur={e => e.currentTarget.style.borderColor = '#e5e7eb'}
                  />
                  <button type="button" onClick={() => setShowNewPw(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showNewPw ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Confirm Password
                </label>
                <div className="relative">
                  <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                  <input
                    type={showNewPw ? 'text' : 'password'} required
                    placeholder="Repeat new password"
                    value={confirmPw}
                    onChange={e => setConfirmPw(e.target.value)}
                    className="w-full rounded-xl pl-11 pr-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all"
                    style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}
                    onFocus={e => e.currentTarget.style.borderColor = '#e11d48'}
                    onBlur={e => e.currentTarget.style.borderColor = '#e5e7eb'}
                  />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full font-semibold py-3 rounded-xl text-sm transition-all duration-200 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#be123c,#e11d48)', color: '#fff', boxShadow: '0 4px 14px rgba(225,29,72,0.25)' }}>
                {loading ? 'Updating…' : 'Set New Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Owner Login Page ────────────────────────────────────────────────────
export default function OwnerLoginPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated, user } = useAuth()

  const [form, setForm] = useState({ email: '', password: '' })
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showForgot, setShowForgot] = useState(false)

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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{ background: '#f1f5f9' }}>

      {/* Card */}
      <div className="relative w-full max-w-4xl rounded-3xl overflow-hidden"
        style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          boxShadow: '0 32px 80px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.04)',
        }}>
        <div className="grid md:grid-cols-2">

          {/* Left panel */}
          <div className="hidden md:flex flex-col items-center justify-center p-12 relative"
            style={{ background: '#ffffff', borderRight: '1px solid #e5e7eb' }}>
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse 400px 400px at 50% 50%, rgba(225,29,72,0.05), transparent)' }} />

            <img
              src="/images/smart.png"
              alt="Owner portal"
              className="relative w-full max-w-lg h-auto object-contain"
              style={{ filter: 'brightness(1)' }}
            />
          </div>

          {/* Right panel — form */}
          <div className="px-8 py-12 sm:px-12" style={{ background: '#f9fafb' }}>
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-6 md:hidden">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#be123c,#e11d48)' }}>
                  <FaStore size={16} color="white" />
                </div>
                <span className="font-bold text-gray-900 text-lg">Smart Order</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Sign in</h1>
              <p className="text-sm text-gray-400">Restaurant owner portal</p>
            </div>

            {error && (
              <div className="mb-6 px-4 py-3 rounded-xl text-sm"
                style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-600">
                  Email address
                </label>
                <div className="relative">
                  <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type="email" required autoComplete="email" placeholder="your@email.com"
                    className="w-full rounded-xl pl-11 pr-4 py-3.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all duration-150"
                    style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    onFocus={e => e.currentTarget.style.borderColor = '#e11d48'}
                    onBlur={e => e.currentTarget.style.borderColor = '#e5e7eb'}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-600">Password</label>
                  <button type="button" onClick={() => setShowForgot(true)}
                    className="text-xs font-medium text-rose-600 hover:text-rose-700 transition-colors">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                  <input
                    type={showPw ? 'text' : 'password'} required autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full rounded-xl pl-11 pr-12 py-3.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all duration-150"
                    style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    onFocus={e => e.currentTarget.style.borderColor = '#e11d48'}
                    onBlur={e => e.currentTarget.style.borderColor = '#e5e7eb'}
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showPw ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                  </button>
                </div>
              </div>

              {/* Remember me toggle */}
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div className="relative">
                  <input
                    type="checkbox" checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <div className="w-10 h-5 rounded-full transition-all duration-200"
                    style={{ background: rememberMe ? '#e11d48' : '#d1d5db' }}>
                    <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200"
                      style={{ left: rememberMe ? '22px' : '2px' }} />
                  </div>
                </div>
                <span className="text-sm text-gray-500">Remember me</span>
              </label>

              {/* Submit */}
              <button
                type="submit" disabled={loading}
                className="w-full font-semibold py-3.5 rounded-xl text-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                style={{
                  background: loading ? 'rgba(225,29,72,0.5)' : 'linear-gradient(135deg,#be123c,#e11d48)',
                  color: '#fff',
                  boxShadow: loading ? 'none' : '0 8px 30px rgba(225,29,72,0.35)',
                }}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : 'Sign In'}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 pt-6" style={{ borderTop: '1px solid #e5e7eb' }}>
              <a href="/kitchen/login"
                className="text-xs text-rose-600 hover:text-rose-700 transition-colors">
                Kitchen staff login →
              </a>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-6 text-xs text-gray-400">
        © 2026 CodeYatra PVT.LTD. All Rights Reserved
      </p>

      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
    </div>
  )
}
