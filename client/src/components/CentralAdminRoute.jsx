/**
 * CentralAdminRoute — guard for /central/* pages
 * Allows CENTRAL_ADMIN and SUPER_ADMIN users only.
 * Redirects others back to /owner/login.
 */
import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function CentralAdminRoute({ children }) {
  const { user, loading, isAuthenticated } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const allowed = ['CENTRAL_ADMIN', 'SUPER_ADMIN']
  if (!isAuthenticated || !allowed.includes(user?.role)) {
    return <Navigate to="/owner/login" replace />
  }

  return children
}
