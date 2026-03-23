/**
 * OwnerRoute — redirects non-owners to /owner/login
 */
import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function OwnerRoute({ children }) {
  const { user, loading, isAuthenticated } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const allowed = ['OWNER', 'ADMIN', 'SUPER_ADMIN']
  if (!isAuthenticated || !allowed.includes(user?.role)) {
    return <Navigate to="/owner/login" replace />
  }

  return children
}
