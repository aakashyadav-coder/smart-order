/**
 * Axios API client — pre-configured with base URL and auto JWT header
 */
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Inject JWT token on every request
// Uses the same URL-based key selection as AuthContext so the right
// JWT is always sent: SA token on /super/* tabs, user token everywhere else.
api.interceptors.request.use((config) => {
  const isSuperPortal = window.location.pathname.startsWith('/super')
  const token = isSuperPortal
    ? localStorage.getItem('smart_order_sa_token')
    : localStorage.getItem('smart_order_token')

  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Normalize error messages
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      'Something went wrong'
    return Promise.reject(new Error(message))
  }
)

export default api
