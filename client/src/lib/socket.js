/**
 * Socket.io client singleton
 * Dev:  empty string → Vite proxy (/socket.io → localhost:5001) handles routing
 * Prod: set VITE_SOCKET_URL=https://your-backend.railway.app
 */
import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? ''

const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10,
  reconnectionDelayMax: 5000,
})

export default socket
