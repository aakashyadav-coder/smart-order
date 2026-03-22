/**
 * Auth Context — manages kitchen/admin JWT session
 */
import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('smart_order_token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        if (payload.exp * 1000 > Date.now()) {
          setUser(payload)
        } else {
          logout()
        }
      } catch {
        logout()
      }
    }
    setLoading(false)
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
