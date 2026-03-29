import React from 'react'

export default function LoginIllustration({ subtitle = 'Welcome' }) {
  return (
    <div className="w-full max-w-sm">
      <svg viewBox="0 0 420 320" className="w-full h-auto" aria-hidden="true">
        <rect x="0" y="0" width="420" height="320" rx="24" fill="#F8FAFC" />
        <circle cx="120" cy="120" r="80" fill="#E2E8F0" />
        <rect x="70" y="190" width="160" height="14" rx="7" fill="#CBD5E1" />
        <rect x="90" y="150" width="70" height="70" rx="18" fill="#93C5FD" />
        <rect x="150" y="170" width="60" height="40" rx="10" fill="#1D4ED8" />
        <circle cx="140" cy="140" r="16" fill="#111827" />
        <rect x="200" y="135" width="52" height="32" rx="6" fill="#E5E7EB" stroke="#9CA3AF" />
        <rect x="200" y="165" width="52" height="6" rx="3" fill="#9CA3AF" />
        <rect x="260" y="120" width="40" height="70" rx="10" fill="#DCFCE7" />
        <circle cx="280" cy="110" r="18" fill="#22C55E" />
        <circle cx="300" cy="130" r="14" fill="#16A34A" />
      </svg>
      <div className="mt-6 text-center">
        <p className="text-sm font-semibold text-gray-900">Code Yatra</p>
        <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
      </div>
    </div>
  )
}
