/**
 * Socket.io client singleton
 * Dev:  empty string → Vite proxy (/socket.io → localhost:5001) handles routing
 * Prod: set VITE_SOCKET_URL=https://your-backend.railway.app
 *
 * Security: passes JWT in handshake auth so the server can verify privileged
 * room joins. Uses a callback so the freshest token is always sent on every
 * (re)connection attempt — no stale tokens after silent refresh.
 */
import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? ''

const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10,
  reconnectionDelayMax: 5000,
  // Callback form: fresh on every (re)connection attempt.
  // Uses the same URL-based key selection as AuthContext so the right
  // JWT is always sent: SA token on /super/* tabs, user token everywhere else.
  auth: (cb) => {
    const isSuperPortal = window.location.pathname.startsWith('/super')
    const token = isSuperPortal
      ? localStorage.getItem('smart_order_sa_token')
      : localStorage.getItem('smart_order_token')
    cb({ token })
  },
})

export default socket

