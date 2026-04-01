/**
 * SuperLoginPage — shadcn/ui refactor
 * Step 1: email + password  |  Step 2: 6-digit TOTP
 */
import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { FaEye, FaEyeSlash, FaShieldAlt } from 'react-icons/fa'
import { Mail, Lock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function SuperLoginPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated, user } = useAuth()

  const [form, setForm] = useState({ email: '', password: '' })
  const [rememberMe, setRememberMe] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [step, setStep] = useState(1)
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
      setDigits(val.split(''))
      digitRefs.current[5]?.focus()
      return
    }
    const d = val.replace(/\D/g, '').slice(-1)
    const next = [...digits]; next[idx] = d; setDigits(next)
    if (d && idx < 5) digitRefs.current[idx + 1]?.focus()
  }

  const handleDigitKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) digitRefs.current[idx - 1]?.focus()
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

        {/* Left — illustration */}
        <div className="hidden md:flex items-center justify-center bg-gray-50 p-10">
          <img src="/images/admin.png" alt="Super admin login" className="w-full max-w-sm h-auto object-contain" />
        </div>

        {/* Right — form */}
        <div className="p-8 sm:p-12">

          <h1 className="text-3xl font-semibold text-gray-900 mb-6">
            {step === 2 ? 'Enter code' : 'Enter Admin Portal'}
          </h1>

          {error && (
            <Alert variant="destructive" className="mb-5">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Step 1 — Credentials */}
          {step === 1 && (
            <form onSubmit={handleCredentials} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="super-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="super-email"
                    type="email" required autoComplete="email"
                    placeholder="Email address"
                    className="pl-10"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="super-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="super-password"
                    type={showPw ? 'text' : 'password'}
                    required autoComplete="current-password"
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-0.5"
                  >
                    {showPw ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
                <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
                  <input
                    type="checkbox" checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  Remember me
                </label>
                <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Authenticating…</> : 'Log in'}
                </Button>
              </div>
            </form>
          )}

          {/* Step 2 — TOTP */}
          {step === 2 && (
            <form onSubmit={handleTotpSubmit} className="space-y-5">
              <p className="text-sm text-gray-500">Enter the 6-digit code from your authenticator app.</p>
              <div className="flex gap-3">
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={el => (digitRefs.current[i] = el)}
                    type="text" inputMode="numeric" maxLength={6}
                    value={d}
                    onChange={e => handleDigitChange(i, e.target.value)}
                    onKeyDown={e => handleDigitKeyDown(i, e)}
                    className="w-10 h-12 text-center text-lg font-bold border border-gray-300 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-400 outline-none transition-all"
                  />
                ))}
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
                <Button
                  type="button" variant="ghost"
                  onClick={() => { setStep(1); setDigits(Array(6).fill('')); setError('') }}
                >
                  ← Back to login
                </Button>
                <Button type="submit" disabled={loading || digits.join('').length !== 6}>
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</> : 'Verify'}
                </Button>
              </div>
            </form>
          )}

          {step === 1 && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <a href="/kitchen/login" className="text-xs text-brand-600 hover:text-brand-700 transition-colors">
                Kitchen staff login →
              </a>
              <a href="/owner/login" className="ml-4 text-xs text-brand-600 hover:text-brand-700 transition-colors">
                Owner login →
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center">
        <p className="mt-6 text-xs text-gray-400">© 2026 CodeYatra PVT.LTD. All Rights Reserved</p>
      </div>
    </div>
  )
}
