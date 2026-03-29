/**
 * ProtectedRoute — redirects to /kitchen/login if not a KITCHEN user
 * Also allows OWNER, ADMIN, SUPER_ADMIN to access kitchen view
 */
import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const KITCHEN_ROLES = ['KITCHEN', 'OWNER', 'ADMIN', 'SUPER_ADMIN']

export default function ProtectedRoute({ children }) {
  const { user, isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading…</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !KITCHEN_ROLES.includes(user?.role)) {
    return <Navigate to="/kitchen/login" replace />
  }

  return children
}
