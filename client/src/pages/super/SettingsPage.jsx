/**
 * SettingsPage - Super Admin profile, password change + full 2FA TOTP setup
 * Fix #23: Full TOTP flow — QR code → verify → enable/disable with password gate
 */
import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import {
  FaUser, FaLock, FaShieldAlt, FaSave,
  FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaEnvelope,
  FaQrcode, FaMobileAlt, FaUnlock,
} from 'react-icons/fa'

function Section({ icon: Icon, title, children }) {
  return (
    <div className="super-card p-5 mb-5">
      <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2 mb-5 pb-4 border-b border-gray-100">
        <Icon className="text-brand-600 w-4 h-4" /> {title}
      </h2>
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const { user: authUser } = useAuth()
  const [profile, setProfile]   = useState({ name: '', email: '' })
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [twoFA, setTwoFA]       = useState(false)

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [changingPw, setChangingPw]     = useState(false)
  const [emailForm, setEmailForm]       = useState({ newEmail: '', currentPassword: '' })
  const [changingEmail, setChangingEmail] = useState(false)

  useEffect(() => {
    api.get('/super/settings/profile').then(r => {
      setProfile({ name: r.data.name || '', email: r.data.email || '' })
      setTwoFA(r.data.totpEnabled || false)
    }).finally(() => setLoading(false))
  }, [])

  const handleSaveProfile = async () => {
    if (!profile.name.trim()) return toast.error('Name is required')
    setSaving(true)
    try {
      // Only name is saved here — email change requires password (see below)
      await api.put('/super/settings/profile', { name: profile.name })
      toast.success('Profile updated!')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update profile')
    } finally { setSaving(false) }
  }

  const handleChangeEmail = async () => {
    const { newEmail, currentPassword } = emailForm
    if (!newEmail || !currentPassword) return toast.error('Both fields are required')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) return toast.error('Enter a valid email address')
    setChangingEmail(true)
    try {
      await api.put('/auth/change-email', { newEmail, currentPassword })
      toast.success('Email updated! Please log in again.')
      setEmailForm({ newEmail: '', currentPassword: '' })
      setProfile(p => ({ ...p, email: newEmail }))
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update email')
    } finally { setChangingEmail(false) }
  }

  const handleChangePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = pwForm
    if (!currentPassword || !newPassword) return toast.error('All fields required')
    if (newPassword.length < 8) return toast.error('New password must be at least 8 characters')
    if (newPassword !== confirmPassword) return toast.error('New passwords do not match')
    setChangingPw(true)
    try {
      await api.post('/super/settings/password', { currentPassword, newPassword })
      toast.success('Password changed successfully!')
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to change password')
    } finally { setChangingPw(false) }
  }

  // ── 2FA TOTP state ──────────────────────────────────────────────────────────
  const [totpStep, setTotpStep]       = useState('idle') // 'idle' | 'setup' | 'enabled'
  const [totpSecret, setTotpSecret]   = useState('')
  const [totpQR, setTotpQR]           = useState('')
  const [totpCode, setTotpCode]       = useState('')
  const [totpBusy, setTotpBusy]       = useState(false)
  const [disablePw, setDisablePw]     = useState('')
  const [showDisable, setShowDisable] = useState(false)

  // Sync totpStep with loaded profile
  useEffect(() => { setTotpStep(twoFA ? 'enabled' : 'idle') }, [twoFA])

  const handleInitTotp = async () => {
    setTotpBusy(true)
    try {
      const res = await api.get('/super/settings/totp/init')
      setTotpSecret(res.data.secret)
      setTotpQR(res.data.qrDataUrl)
      setTotpCode('')
      setTotpStep('setup')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to generate QR code')
    } finally { setTotpBusy(false) }
  }

  const handleVerifyTotp = async () => {
    if (!/^\d{6}$/.test(totpCode)) return toast.error('Enter a 6-digit code')
    setTotpBusy(true)
    try {
      await api.post('/super/settings/totp/verify', { code: totpCode, secret: totpSecret })
      toast.success('2FA enabled successfully!')
      setTwoFA(true)
      setTotpStep('enabled')
      setTotpSecret(''); setTotpQR(''); setTotpCode('')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Invalid code — try again')
    } finally { setTotpBusy(false) }
  }

  const handleDisableTotp = async () => {
    if (!disablePw) return toast.error('Enter your current password to continue')
    setTotpBusy(true)
    try {
      await api.delete('/super/settings/totp/disable', { data: { currentPassword: disablePw } })
      toast.success('2FA disabled.')
      setTwoFA(false)
      setTotpStep('idle')
      setShowDisable(false); setDisablePw('')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to disable 2FA')
    } finally { setTotpBusy(false) }
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">Account Settings</h1>
        <p className="text-gray-400 text-sm mt-1">Manage your super admin profile and security</p>
      </div>

      {/* Profile — name only */}
      <Section icon={FaUser} title="Profile Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full Name">
            <input type="text" className="input bg-white border-gray-200 text-gray-900"
              value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
          </Field>
          <Field label="Email Address (read-only)">
            <input type="email" className="input bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed"
              value={profile.email} readOnly />
          </Field>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={handleSaveProfile} disabled={saving}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50">
            <FaSave className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save Name'}
          </button>
          <span className="text-xs text-gray-400">Role: <strong className="text-gray-700">SUPER_ADMIN</strong></span>
        </div>
      </Section>

      {/* Change Email — Fix R6: requires current password confirmation */}
      <Section icon={FaEnvelope} title="Change Email Address">
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mb-4 flex items-center gap-2">
          <FaExclamationTriangle className="w-3 h-3 flex-shrink-0" />
          Changing your email requires your current password for security verification.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="New Email Address">
            <input type="email" className="input bg-white border-gray-200 text-gray-900"
              value={emailForm.newEmail}
              onChange={e => setEmailForm(p => ({ ...p, newEmail: e.target.value }))}
              placeholder="New email address" />
          </Field>
          <Field label="Current Password (to confirm)">
            <input type="password" className="input bg-white border-gray-200 text-gray-900"
              value={emailForm.currentPassword}
              onChange={e => setEmailForm(p => ({ ...p, currentPassword: e.target.value }))}
              placeholder="••••••••" />
          </Field>
        </div>
        <div className="mt-4">
          <button onClick={handleChangeEmail} disabled={changingEmail || !emailForm.newEmail || !emailForm.currentPassword}
            className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50">
            <FaEnvelope className="w-3.5 h-3.5" /> {changingEmail ? 'Updating...' : 'Update Email'}
          </button>
        </div>
      </Section>

      {/* Password */}
      <Section icon={FaLock} title="Change Password">
        <div className="space-y-3">
          <Field label="Current Password">
            <input type="password" className="input bg-white border-gray-200 text-gray-900"
              value={pwForm.currentPassword} onChange={e => setPwForm(p => ({ ...p, currentPassword: e.target.value }))}
              placeholder="********" />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="New Password">
              <input type="password" className="input bg-white border-gray-200 text-gray-900"
                value={pwForm.newPassword} onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))}
                placeholder="Min. 8 characters" />
            </Field>
            <Field label="Confirm New Password">
              <input type="password" className="input bg-white border-gray-200 text-gray-900"
                value={pwForm.confirmPassword} onChange={e => setPwForm(p => ({ ...p, confirmPassword: e.target.value }))}
                placeholder="Repeat new password" />
            </Field>
          </div>
          {pwForm.newPassword && pwForm.confirmPassword && (
            <div className={`flex items-center gap-1.5 text-xs font-medium ${pwForm.newPassword === pwForm.confirmPassword ? 'text-green-600' : 'text-red-500'}`}>
              {pwForm.newPassword === pwForm.confirmPassword
                ? <><FaCheckCircle className="w-3 h-3" /> Passwords match</>
                : <><FaTimesCircle className="w-3 h-3" /> Passwords do not match</>
              }
            </div>
          )}
        </div>
        <div className="mt-4">
          <button onClick={handleChangePassword} disabled={changingPw}
            className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50">
            <FaLock className="w-3.5 h-3.5" /> {changingPw ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </Section>

      {/* ── Two-Factor Authentication (TOTP) ── */}
      <Section icon={FaShieldAlt} title="Two-Factor Authentication (2FA)">

        {/* ── IDLE: not enabled, show enable CTA ── */}
        {totpStep === 'idle' && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <FaShieldAlt className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm text-amber-800 flex items-center gap-2">
                <FaExclamationTriangle className="w-3.5 h-3.5" /> 2FA is Not Enabled
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Protect your super admin account with a time-based one-time password (TOTP) from your authenticator app.
              </p>
              <button
                onClick={handleInitTotp}
                disabled={totpBusy}
                className="mt-3 inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                {totpBusy
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <FaQrcode className="w-3.5 h-3.5" />
                }
                Set Up 2FA
              </button>
            </div>
          </div>
        )}

        {/* ── SETUP: show QR + verify step ── */}
        {totpStep === 'setup' && (
          <div className="space-y-5">
            {/* Step indicator */}
            <div className="flex items-center gap-3 text-xs font-semibold text-gray-500">
              <span className="flex items-center gap-1.5 text-brand-600">
                <span className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center text-[10px] font-black">1</span>
                Scan QR
              </span>
              <div className="flex-1 h-px bg-gray-200" />
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-[10px] font-black">2</span>
                Verify Code
              </span>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 flex items-start gap-2">
              <FaMobileAlt className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>Open <strong>Google Authenticator</strong>, <strong>Authy</strong>, or any TOTP app, tap <em>Add account</em>, then scan the QR code below.</span>
            </div>

            {/* QR code */}
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="border-2 border-gray-200 rounded-2xl p-3 bg-white flex-shrink-0">
                {totpQR && <img src={totpQR} alt="TOTP QR Code" className="w-40 h-40" />}
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">Or enter this key manually:</p>
                  <code className="block bg-gray-900 text-green-400 font-mono text-xs px-3 py-2 rounded-xl break-all select-all">
                    {totpSecret}
                  </code>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Enter 6-digit code from your app
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={totpCode}
                    onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="input bg-white border-gray-200 text-gray-900 font-mono text-lg tracking-[0.3em] text-center w-40"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleVerifyTotp}
                    disabled={totpBusy || totpCode.length !== 6}
                    className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-50"
                  >
                    {totpBusy
                      ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <FaCheckCircle className="w-3.5 h-3.5" />
                    }
                    Verify & Enable
                  </button>
                  <button
                    onClick={() => { setTotpStep('idle'); setTotpQR(''); setTotpSecret(''); setTotpCode('') }}
                    className="text-sm text-gray-500 hover:text-gray-700 font-medium px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ENABLED: show active badge + disable option ── */}
        {totpStep === 'enabled' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                <FaShieldAlt className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-bold text-sm text-green-800 flex items-center gap-2">
                  <FaCheckCircle className="w-3.5 h-3.5" /> 2FA is Active
                </p>
                <p className="text-xs text-green-700 mt-1">
                  Your account is protected with TOTP authentication. You'll need your authenticator app on every login.
                </p>
              </div>
            </div>

            {/* Disable panel */}
            {!showDisable ? (
              <button
                onClick={() => setShowDisable(true)}
                className="inline-flex items-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
              >
                <FaUnlock className="w-3.5 h-3.5" /> Disable 2FA
              </button>
            ) : (
              <div className="border border-red-200 bg-red-50 rounded-xl p-4 space-y-3">
                <p className="text-sm font-bold text-red-800">Confirm Disable 2FA</p>
                <p className="text-xs text-red-600">Enter your current password to disable two-factor authentication.</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="password"
                    placeholder="Current password"
                    value={disablePw}
                    onChange={e => setDisablePw(e.target.value)}
                    className="input bg-white border-red-200 text-gray-900 flex-1"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleDisableTotp}
                      disabled={totpBusy || !disablePw}
                      className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-50"
                    >
                      {totpBusy
                        ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <FaUnlock className="w-3.5 h-3.5" />
                      }
                      Confirm
                    </button>
                    <button
                      onClick={() => { setShowDisable(false); setDisablePw('') }}
                      className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* Platform Info */}
      <Section icon={FaShieldAlt} title="Platform">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Platform', value: 'Smart Order SaaS' },
            { label: 'Version', value: `v${import.meta.env.VITE_APP_VERSION ?? '—'}` },
            { label: 'Region', value: 'Local / Custom' },
          ].map(i => (
            <div key={i.label} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <p className="text-xs text-gray-400 font-medium">{i.label}</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{i.value}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}
