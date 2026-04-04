/**
 * Auth Context — manages JWT session for kitchen/owner/super admin
 * Each role-group uses SEPARATE localStorage keys so that logging out
 * of Kitchen or Owner never affects an open Super Admin session and vice versa.
 *
 *   SUPER_ADMIN (super portal) → smart_order_sa_token / smart_order_sa_refresh
 *   OWNER portal              → smart_order_owner_token / smart_order_owner_refresh
 *   KITCHEN portal            → smart_order_kitchen_token / smart_order_kitchen_refresh
 *   fallback (other portals)  → smart_order_token / smart_order_refresh
 */
import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import api from '../lib/api'
import socket from '../lib/socket'

const AuthContext = createContext(null)

// ── Role-namespaced key helpers ────────────────────────────────────────────────
const SA_KEYS      = { access: 'smart_order_sa_token',      refresh: 'smart_order_sa_refresh' }
const CENTRAL_KEYS = { access: 'smart_order_central_token', refresh: 'smart_order_central_refresh' }
const OWNER_KEYS   = { access: 'smart_order_owner_token',   refresh: 'smart_order_owner_refresh' }
const KITCHEN_KEYS = { access: 'smart_order_kitchen_token', refresh: 'smart_order_kitchen_refresh' }
const USER_KEYS    = { access: 'smart_order_token',         refresh: 'smart_order_refresh' }

/** Decode a JWT payload without verifying signature */
const decodePayload = (token) => {
  try   { return JSON.parse(atob(token.split('.')[1])) }
  catch { return null }
}

/** Return the correct key pair for the current portal path */
const keysForPath = (path) => {
  if (path.startsWith('/super'))   return SA_KEYS
  if (path.startsWith('/central')) return CENTRAL_KEYS
  if (path.startsWith('/owner'))   return OWNER_KEYS
  if (path.startsWith('/kitchen')) return KITCHEN_KEYS
  return USER_KEYS
}

/** Return the correct key pair for a known role (role takes priority over path) */
const keysForRole = (role) => {
  if (role === 'SUPER_ADMIN')   return SA_KEYS
  if (role === 'CENTRAL_ADMIN') return CENTRAL_KEYS
  if (role === 'OWNER' || role === 'ADMIN') return OWNER_KEYS
  if (role === 'KITCHEN') return KITCHEN_KEYS
  return USER_KEYS
}

/**
 * Determine which key pair to use based on the current URL.
 * /super/*, /owner/*, /kitchen/* each use their own keys.
 * This prevents one portal from logging out another.
 */
const getStoredToken = () => {
  const keys = keysForPath(window.location.pathname)
  const t    = localStorage.getItem(keys.access)
  if (!t) return { token: null, keys }
  const p = decodePayload(t)
  return (p && p.exp * 1000 > Date.now()) ? { token: t, keys } : { token: null, keys }
}

export const AuthProvider = ({ children }) => {
  const init = getStoredToken()
  const [user,    setUser]    = useState(null)
  const [token,   setToken]   = useState(init.token)
  const [loading, setLoading] = useState(true)
  const keysRef        = useRef(init.keys)   // always points to the active key pair
  const refreshTimer   = useRef(null)

  // ── Silent token refresh ────────────────────────────────────────────────────
  const tryRefresh = async () => {
    const keys = keysRef.current
    const rt = localStorage.getItem(keys.refresh)
    if (!rt) return false
    try {
      const res = await api.post('/auth/refresh', { refreshToken: rt })
      const { token: newToken, user: freshUser } = res.data
      localStorage.setItem(keys.access, newToken)
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
      const { exp } = decodePayload(t)
      const msUntilExpiry  = exp * 1000 - Date.now()
      const msUntilRefresh = Math.max(msUntilExpiry - 2 * 60 * 1000, 0)
      refreshTimer.current = setTimeout(tryRefresh, msUntilRefresh)
    } catch { /* malformed token — skip */ }
  }

  // Only clears THIS user's keys — other portal sessions are unaffected
  const clearAuth = () => {
    const keys = keysRef.current
    localStorage.removeItem(keys.access)
    localStorage.removeItem(keys.refresh)
    setToken(null)
    setUser(null)
    setLoading(false)
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
  }

  // ── On mount: verify token server-side ──────────────────────────────────────
  useEffect(() => {
    const verify = async () => {
      if (!token) { setLoading(false); return }

      // Quick local expiry check
      const payload = decodePayload(token)
      if (!payload) { clearAuth(); setLoading(false); return }

      if (payload.exp * 1000 < Date.now()) {
        const refreshed = await tryRefresh()
        if (!refreshed) { setLoading(false); return }
        setLoading(false)
        return
      }

      // Server-side verification — gets fresh role/restaurantId from DB
      try {
        const res = await api.get('/auth/me')
        setUser({ ...payload, ...res.data })
        scheduleRefresh(token)
      } catch (err) {
        const status = err.response?.status
        if (status === 401 || status === 403) {
          clearAuth()
        } else {
          // Network error — use token payload as fallback (don't logout on flaky network)
          setUser(payload)
        }
      } finally {
        setLoading(false)
      }
    }
    verify()
    return () => { if (refreshTimer.current) clearTimeout(refreshTimer.current) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Login ───────────────────────────────────────────────────────────────────
  const login = (accessToken, refreshToken, rememberMe = false) => {
    const payload = decodePayload(accessToken)
    // Use role-based key selection so CENTRAL_ADMIN logging in via /owner/login
    // still gets their token stored in smart_order_central_token, not owner_token.
    const keys = payload?.role
      ? keysForRole(payload.role)
      : keysForPath(window.location.pathname)
    keysRef.current = keys                      // switch active key pair

    localStorage.setItem(keys.access, accessToken)
    if (refreshToken) localStorage.setItem(keys.refresh, refreshToken)
    if (!rememberMe)  sessionStorage.setItem('no_remember', '1')

    setToken(accessToken)
    setUser(payload)
    scheduleRefresh(accessToken)
  }

  const logout = () => clearAuth()

  // Allow individual fields of the user object to be patched in-place
  // (e.g. after a name change) without requiring a full re-login.
  const updateUser = (patch) => setUser(prev => prev ? { ...prev, ...patch } : prev)

  // ── Socket auth sync ───────────────────────────────────────────────────────
  // Force a reconnect whenever the auth token changes so the socket handshake
  // always carries the latest JWT (or no JWT after logout).
  useEffect(() => {
    // If the socket is mid-connection, disconnect() still resets it cleanly.
    try {
      socket.disconnect()
      socket.connect()
    } catch { /* ignore */ }
  }, [token])

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, loading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
