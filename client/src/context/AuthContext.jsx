/**
 * Auth Context — manages JWT session for kitchen/owner/super admin
 * On refresh: verifies token server-side to get fresh user data (incl. restaurantId)
 */
import React, { createContext, useContext, useState, useEffect } from 'react'
import api from '../lib/api'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null)
  const [token, setToken]     = useState(() => localStorage.getItem('smart_order_token'))
  const [loading, setLoading] = useState(true)

  // On mount / token change: verify token server-side to get fresh user data
  useEffect(() => {
    const verify = async () => {
      if (!token) { setLoading(false); return }

      // Quick local expiry check first
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        if (payload.exp * 1000 < Date.now()) {
          logout(); return
        }
      } catch { logout(); return }

      // Server-side verification — ensures restaurantId and role are fresh from DB
      try {
        const res = await api.get('/auth/me')
        // Merge server data with token payload (server is source of truth for role/restaurantId)
        const payload = JSON.parse(atob(token.split('.')[1]))
        setUser({ ...payload, ...res.data })
      } catch (err) {
        // 401 = token invalid/expired → force logout
        if (err.message?.includes('401') || err.response?.status === 401) {
          logout()
        } else {
          // Network error — use token payload as fallback (don't logout)
          try {
            const payload = JSON.parse(atob(token.split('.')[1]))
            setUser(payload)
          } catch { logout() }
        }
      } finally {
        setLoading(false)
      }
    }
    verify()
  }, [token])

  const login = (newToken) => {
    localStorage.setItem('smart_order_token', newToken)
    setToken(newToken)
    const payload = JSON.parse(atob(newToken.split('.')[1]))
    setUser(payload)
  }

  const logout = () => {
    localStorage.removeItem('smart_order_token')
    setToken(null)
    setUser(null)
    setLoading(false)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
