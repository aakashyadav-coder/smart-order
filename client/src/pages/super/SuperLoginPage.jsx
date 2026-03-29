/**
 * SuperLoginPage - Light image login for Super Admin
 * Step 1: email + password
 * Step 2: 6-digit TOTP code (shown only when totpEnabled=true on the account)
 */
import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { FaEye, FaEyeSlash, FaLock, FaUser } from 'react-icons/fa'

export default function SuperLoginPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated, user } = useAuth()

  const [form, setForm] = useState({ email: '', password: '' })
  const [rememberMe, setRememberMe] = useState(false)
  const [showPw, setShowPw] = useState(false)

  const [step, setStep] = useState(1) // 1 | 2
  const [preAuthToken, setPreAuthToken] = useState('')
  const [digits, setDigits] = useState(Array(6).fill(''))
  const digitRefs = useRef([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isAuthenticated && user?.role === 'SUPER_ADMIN') navigate('/super', { replace: true })
  }, [isAuthenticated, user, navigate])

  const handleCredentials = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/login', { ...form, rememberMe })

      if (res.data.requireTotp) {
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

  const handleDigitKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      digitRefs.current[idx - 1]?.focus()
    }
  }

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

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6 relative">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl overflow-hidden grid md:grid-cols-2">
        <div className="hidden md:flex items-center justify-center bg-gray-50 p-10">
          <img
            src="/images/superlogin.png"
            alt="Super admin login illustration"
            className="w-full max-w-sm h-auto object-contain"
          />
        </div>

        <div className="p-8 sm:p-12">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-gray-900">
              {step === 2 ? 'Enter code' : 'Sign in'}
            </h1>
          </div>

          {error && (
            <div className="mb-5 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleCredentials} className="space-y-6">
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
                  {loading ? 'Authenticating...' : 'Log in'}
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleTotpSubmit} className="space-y-6">
              <p className="text-sm text-gray-500">
                Enter the 6-digit code from your authenticator app.
              </p>

              <div className="flex gap-3">
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
                    className="w-10 h-12 text-center text-lg border-b border-gray-300 focus:border-blue-500 outline-none"
                  />
                ))}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <button
                  type="button"
                  onClick={() => { setStep(1); setDigits(Array(6).fill('')); setError('') }}
                  className="text-sm text-gray-400 hover:text-gray-600"
                >
                  Back to login
                </button>

                <button
                  type="submit"
                  disabled={loading || digits.join('').length !== 6}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 px-6 rounded-md w-full sm:w-40 transition-colors disabled:opacity-60"
                >
                  {loading ? 'Verifying...' : 'Verify'}
                </button>
              </div>
            </form>
          )}

          {step === 1 && (
            <div className="mt-8 text-xs text-gray-400">
              <a href="/kitchen/login" className="hover:text-gray-600">Kitchen staff login</a>
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center">
        <p className="text-sm font-semibold text-gray-900">Code Yatra</p>
        <p className="text-xs text-gray-400 mt-1">Super Admin Portal</p>
      </div>
    </div>
  )
}
