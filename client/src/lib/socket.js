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
  // Only send JWTs for privileged portals; public customer pages connect as guest.
  auth: (cb) => {
    const path = window.location.pathname
    if (path.startsWith('/super')) {
      return cb({ token: localStorage.getItem('smart_order_sa_token') })
    }
    if (path.startsWith('/owner')) {
      return cb({ token: localStorage.getItem('smart_order_owner_token') })
    }
    if (path.startsWith('/kitchen')) {
      return cb({ token: localStorage.getItem('smart_order_kitchen_token') })
    }
    // Public pages: no token to avoid auth errors blocking the connection
    return cb({})
  },
})

export default socket
