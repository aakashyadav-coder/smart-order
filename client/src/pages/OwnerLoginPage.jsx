/**
 * OwnerLoginPage — shadcn/ui refactor
 * Includes 3-step Forgot Password flow: Email → OTP → New Password
 */
import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { FaEye, FaEyeSlash, FaStore, FaChevronLeft } from 'react-icons/fa'
import { Mail, Lock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

// ── Shared OTP digit input helper ──────────────────────────────────────────
function OtpInput({ digits, setDigits, digitRefs }) {
  const handleChange = (idx, val) => {
    if (val.length === 6 && /^\d{6}$/.test(val)) {
      setDigits(val.split(''))
      digitRefs.current[5]?.focus()
      return
    }
    const d = val.replace(/\D/g, '').slice(-1)
    const next = [...digits]; next[idx] = d; setDigits(next)
    if (d && idx < 5) digitRefs.current[idx + 1]?.focus()
  }
  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) digitRefs.current[idx - 1]?.focus()
  }
  return (
    <div className="flex gap-2.5 justify-center my-4">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => (digitRefs.current[i] = el)}
          type="text" inputMode="numeric" maxLength={6}
          value={d}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          className="w-11 h-[52px] text-center text-xl font-bold text-gray-900 rounded-xl border transition-all outline-none focus:ring-2 focus:ring-brand-400"
          style={{ background: d ? '#fff1f2' : '#ffffff', borderColor: d ? '#e11d48' : '#e5e7eb' }}
        />
      ))}
    </div>
  )
}

// ── Forgot Password Dialog ─────────────────────────────────────────────────
function ForgotPasswordDialog({ open, onClose }) {
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
    } finally { setLoading(false) }
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
    } finally { setLoading(false) }
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
    } finally { setLoading(false) }
  }

  const stepLabels = ['Enter Email', 'Verify OTP', 'New Password']

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <Button variant="ghost" size="sm" onClick={onClose} className="gap-1.5 text-gray-500 hover:text-gray-900 h-auto p-0">
              <FaChevronLeft className="w-2.5 h-2.5" /> Back to login
            </Button>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-50 text-brand-600 border border-brand-100">
              Step {step} / 3
            </span>
          </div>
          <DialogTitle className="text-xl font-bold text-gray-900 mb-1">Forgot Password</DialogTitle>
          <p className="text-sm text-gray-500">{stepLabels[step - 1]}</p>
          {/* Progress bar */}
          <div className="flex gap-2 mt-4">
            {[1, 2, 3].map(s => (
              <div key={s} className="h-1 flex-1 rounded-full transition-all duration-300"
                style={{ background: s <= step ? '#e11d48' : '#f3f4f6' }} />
            ))}
          </div>
        </div>

        <div className="px-8 py-7 space-y-5">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          {success && <Alert variant="success" className="border-green-200 bg-green-50 text-green-800"><AlertDescription>{success}</AlertDescription></Alert>}

          {/* Step 1 — Email */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="fp-email">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input id="fp-email" type="email" required autoComplete="email"
                    placeholder="your@email.com" className="pl-10"
                    value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <p className="text-xs text-gray-500">We'll send a 6-digit OTP to this address.</p>
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending OTP…</> : 'Send OTP'}
              </Button>
            </form>
          )}

          {/* Step 2 — OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <Label>6-digit code sent to <span className="text-brand-600 font-semibold">{email}</span></Label>
                <OtpInput digits={digits} setDigits={setDigits} digitRefs={digitRefs} />
                <Button type="button" variant="ghost" size="sm" className="w-full text-xs text-gray-500 hover:text-brand-600"
                  onClick={() => { setDigits(Array(6).fill('')); handleSendOtp({ preventDefault: () => { } }) }}>
                  Didn't receive it? Resend OTP
                </Button>
              </div>
              <Button type="submit" disabled={loading || digits.join('').length !== 6} className="w-full">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</> : 'Verify OTP'}
              </Button>
            </form>
          )}

          {/* Step 3 — New Password */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="fp-newpw">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input id="fp-newpw" type={showNewPw ? 'text' : 'password'} required minLength={6}
                    placeholder="Min. 6 characters" className="pl-10 pr-10"
                    value={newPw} onChange={e => setNewPw(e.target.value)} />
                  <button type="button" onClick={() => setShowNewPw(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showNewPw ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fp-confirmpw">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input id="fp-confirmpw" type={showNewPw ? 'text' : 'password'} required
                    placeholder="Repeat new password" className="pl-10"
                    value={confirmPw} onChange={e => setConfirmPw(e.target.value)} />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</> : 'Set New Password'}
              </Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Owner Login Page ──────────────────────────────────────────────────
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
    if (isAuthenticated && user?.role === 'CENTRAL_ADMIN') {
      navigate('/central', { replace: true })
    }
  }, [isAuthenticated, user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/login', { ...form, rememberMe })
      const role = res.data.user.role
      if (role !== 'OWNER' && role !== 'ADMIN' && role !== 'CENTRAL_ADMIN') {
        setError('Access denied. This portal is for Restaurant Owners only.')
        return
      }
      login(res.data.token, res.data.refreshToken, rememberMe)
      toast.success(`Welcome back, ${res.data.user.name}!`)
      if (role === 'CENTRAL_ADMIN') {
        navigate('/central', { replace: true })
      } else {
        navigate('/owner', { replace: true })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-slate-100">
      <div className="relative w-full max-w-4xl rounded-3xl overflow-hidden bg-white border border-gray-200 shadow-[0_32px_80px_rgba(0,0,0,0.25)]">
        <div className="grid md:grid-cols-2">

          {/* Left — illustration */}
          <div className="hidden md:flex flex-col items-center justify-center p-12 relative bg-white border-r border-gray-100">
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse 400px 400px at 50% 50%, rgba(225,29,72,0.05), transparent)' }} />
            <img src="/images/smart.png" alt="Owner portal" className="relative w-full max-w-lg h-auto object-contain" />
          </div>

          {/* Right — form */}
          <div className="px-8 py-12 sm:px-12 bg-gray-50">
            <div className="mb-8">
              {/* Mobile logo */}
              <div className="flex items-center gap-3 mb-6 md:hidden">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-brand-700 to-brand-500">
                  <FaStore className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-gray-900 text-lg">Khaja X</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Sign in</h1>
              <p className="text-sm text-gray-400">Restaurant owner portal</p>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="owner-email">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input id="owner-email" type="email" required autoComplete="email"
                    placeholder="your@email.com" className="pl-10 bg-white"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="owner-password">Password</Label>
                  <button type="button" onClick={() => setShowForgot(true)}
                    className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input id="owner-password" type={showPw ? 'text' : 'password'} required autoComplete="current-password"
                    placeholder="••••••••" className="pl-10 pr-10 bg-white"
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showPw ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me toggle */}
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div className="relative">
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="sr-only" />
                  <div className="w-10 h-5 rounded-full transition-all duration-200" style={{ background: rememberMe ? '#e11d48' : '#d1d5db' }}>
                    <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200" style={{ left: rememberMe ? '22px' : '2px' }} />
                  </div>
                </div>
                <span className="text-sm text-gray-500">Remember me</span>
              </label>

              <Button type="submit" size="lg" disabled={loading} className="w-full mt-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : 'Sign In'}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <a href="/kitchen/login" className="text-xs text-brand-600 hover:text-brand-700 transition-colors">
                Kitchen staff login →
              </a>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-6 text-xs text-gray-400">© 2026 CodeYatra PVT.LTD. All Rights Reserved</p>

      <ForgotPasswordDialog open={showForgot} onClose={() => setShowForgot(false)} />
    </div>
  )
}
