/**
 * Auth Context — manages JWT session for kitchen/owner/super admin
 * Fix R4: Silently refreshes access token using stored refresh token
 * Fix R5: Persists refresh token in localStorage when rememberMe=true
 * Fix R2: Logs out on 401 (expired) AND 403 (deactivated account)
 */
import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import api from '../lib/api'

const AuthContext = createContext(null)

const ACCESS_KEY  = 'smart_order_token'
const REFRESH_KEY = 'smart_order_refresh'

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null)
  const [token,   setToken]   = useState(() => localStorage.getItem(ACCESS_KEY))
  const [loading, setLoading] = useState(true)
  const refreshTimer = useRef(null)

  // ── Silent token refresh ──────────────────────────────────────────────────
  const tryRefresh = async () => {
    const rt = localStorage.getItem(REFRESH_KEY)
    if (!rt) return false
    try {
      const res = await api.post('/auth/refresh', { refreshToken: rt })
      const { token: newToken, user: freshUser } = res.data
      localStorage.setItem(ACCESS_KEY, newToken)
      setToken(newToken)
      setUser(freshUser)
      scheduleRefresh(newToken)
      return true
    } catch {
      clearAuth()
      return false
    }
  }

  // Schedule a refresh 2 minutes before expiry
  const scheduleRefresh = (t) => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    try {
      const { exp } = JSON.parse(atob(t.split('.')[1]))
      const msUntilExpiry = exp * 1000 - Date.now()
      const msUntilRefresh = Math.max(msUntilExpiry - 2 * 60 * 1000, 0)
      refreshTimer.current = setTimeout(tryRefresh, msUntilRefresh)
    } catch { /* malformed token — skip */ }
  }

  const clearAuth = () => {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    setToken(null)
    setUser(null)
    setLoading(false)
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
  }

  // ── On mount: verify token server-side ────────────────────────────────────
  useEffect(() => {
    const verify = async () => {
      if (!token) { setLoading(false); return }

      // Quick local expiry check
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        if (payload.exp * 1000 < Date.now()) {
          // Expired — try silent refresh before logging out
          const refreshed = await tryRefresh()
          if (!refreshed) { setLoading(false); return }
          setLoading(false)
          return
        }
      } catch { clearAuth(); setLoading(false); return }

      // Server-side verification — gets fresh role/restaurantId from DB
      try {
        const res = await api.get('/auth/me')
        const payload = JSON.parse(atob(token.split('.')[1]))
        setUser({ ...payload, ...res.data })
        scheduleRefresh(token)
      } catch (err) {
        const status = err.response?.status
        if (status === 401 || status === 403) {
          // 401 = expired/invalid, 403 = deactivated → force logout
          clearAuth()
        } else {
          // Network error — use token payload as fallback (don't logout on flaky network)
          try {
            const payload = JSON.parse(atob(token.split('.')[1]))
            setUser(payload)
          } catch { clearAuth() }
        }
      } finally {
        setLoading(false)
      }
    }
    verify()
    return () => { if (refreshTimer.current) clearTimeout(refreshTimer.current) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = (accessToken, refreshToken, rememberMe = false) => {
    localStorage.setItem(ACCESS_KEY, accessToken)
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken)
    if (!rememberMe)  sessionStorage.setItem('no_remember', '1')
    setToken(accessToken)
    const payload = JSON.parse(atob(accessToken.split('.')[1]))
    setUser(payload)
    scheduleRefresh(accessToken)
  }

  const logout = () => clearAuth()

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
