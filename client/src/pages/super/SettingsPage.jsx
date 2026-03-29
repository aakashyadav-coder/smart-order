/**
 * SettingsPage - Super Admin profile, password change, 2FA status
 */
import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import {
  FaUser, FaLock, FaShieldAlt, FaSave,
  FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaEnvelope,
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
              placeholder="new@email.com" />
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

      {/* 2FA Status */}
      <Section icon={FaShieldAlt} title="Two-Factor Authentication (2FA)">
        <div className={`rounded-xl border p-4 flex items-start gap-3 ${twoFA ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${twoFA ? 'bg-green-100' : 'bg-amber-100'}`}>
            <FaShieldAlt className={`w-4 h-4 ${twoFA ? 'text-green-600' : 'text-amber-600'}`} />
          </div>
          <div>
            <p className={`font-bold text-sm ${twoFA ? 'text-green-800' : 'text-amber-800'} flex items-center gap-2`}>
              {twoFA ? <><FaCheckCircle className="w-3.5 h-3.5" /> 2FA is Enabled</> : <><FaExclamationTriangle className="w-3.5 h-3.5" /> 2FA is Not Enabled</>}
            </p>
            <p className={`text-xs mt-1 ${twoFA ? 'text-green-700' : 'text-amber-700'}`}>
              {twoFA
                ? 'Your account is protected with TOTP two-factor authentication via your authenticator app.'
                : 'Your account does not have 2FA enabled. Contact your system administrator to set up TOTP for added security.'}
            </p>
            {!twoFA && (
              <p className="text-xs text-amber-600 mt-2 font-medium flex items-center gap-1.5">
                <FaExclamationTriangle className="w-3 h-3" />
                TOTP secret setup is managed server-side via the <code className="bg-amber-100 px-1 rounded">totpSecret</code> field on your user record.
              </p>
            )}
          </div>
        </div>
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

