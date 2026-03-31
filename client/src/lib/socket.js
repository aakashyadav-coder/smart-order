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
  // JWT is always sent for each portal.
  auth: (cb) => {
    const path = window.location.pathname
    const token = path.startsWith('/super')
      ? localStorage.getItem('smart_order_sa_token')
      : path.startsWith('/owner')
        ? localStorage.getItem('smart_order_owner_token')
        : path.startsWith('/kitchen')
          ? localStorage.getItem('smart_order_kitchen_token')
          : localStorage.getItem('smart_order_token')
    cb({ token })
  },
})

export default socket
