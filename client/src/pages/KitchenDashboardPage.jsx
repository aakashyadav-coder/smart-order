/**
 * KitchenDashboardPage — Real-time order management for kitchen staff
 * Receives new orders via Socket.io, allows status updates
 */
import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../lib/api'
import socket from '../lib/socket'
import { useAuth } from '../context/AuthContext'
import KitchenOrderCard from '../components/KitchenOrderCard'

const FILTERS = ['ALL', 'PENDING', 'ACCEPTED', 'PREPARING', 'COMPLETED']

// Notification sound using Web Audio API
const playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    oscillator.frequency.setValueAtTime(880, ctx.currentTime)
    oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.1)
    gainNode.gain.setValueAtTime(0.4, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.5)
  } catch (_) { /* Audio not available */ }
}

export default function KitchenDashboardPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [connected, setConnected] = useState(socket.connected)
  const newOrderCount = useRef(0)

  // Fetch all orders initially
  useEffect(() => {
    api.get('/orders')
      .then(res => setOrders(res.data))
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [])

  // Socket.io — join kitchen room and handle new orders
  useEffect(() => {
    socket.emit('join_kitchen')

    const handleNewOrder = (order) => {
      setOrders(prev => {
        const exists = prev.find(o => o.id === order.id)
        if (exists) return prev
        return [order, ...prev]
      })
      playNotificationSound()
      newOrderCount.current += 1
      toast.success(`🆕 New order from Table #${order.tableNumber}!`, { duration: 5000 })
    }

    const handleConnect    = () => setConnected(true)
    const handleDisconnect = () => setConnected(false)

    socket.on('new_order', handleNewOrder)
    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)

    return () => {
      socket.off('new_order', handleNewOrder)
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
    }
  }, [])

  // Update order status
  const updateStatus = async (orderId, status, estimatedMinutes) => {
    try {
      const body = { status }
      if (estimatedMinutes) body.estimatedMinutes = estimatedMinutes
      const res = await api.put(`/orders/${orderId}/status`, body)
      setOrders(prev => prev.map(o => o.id === orderId ? res.data : o))
      toast.success(`Order marked as ${status.toLowerCase()}`)

      // If accepting, offer to send OTP
      if (status === 'ACCEPTED') {
        sendOTPToCustomer(orderId)
      }
    } catch (err) {
      toast.error(err.message)
    }
  }

  const sendOTPToCustomer = async (orderId) => {
    try {
      await api.post('/otp/send', { orderId })
      toast.success('OTP sent to customer 📱', { icon: '🔐' })
    } catch (err) {
      console.warn('OTP send failed (non-critical):', err.message)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/kitchen/login')
  }

  const filteredOrders = filter === 'ALL'
    ? orders
    : orders.filter(o => o.status === filter)

  const pendingCount = orders.filter(o => o.status === 'PENDING').length

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center text-xl">🍽️</div>
            <div>
              <h1 className="font-extrabold text-white text-base leading-none">Kitchen Dashboard</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`w-2 h-2 rounded-full kitchen-pulse ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className="text-xs text-gray-400">{connected ? 'Live' : 'Disconnected'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
                {pendingCount} pending
              </span>
            )}
            <div className="flex items-center gap-2">
              <a
                href="/admin/qr"
                className="btn-ghost text-gray-400 hover:text-white text-sm py-2 px-3"
              >
                QR Codes
              </a>
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-red-400 text-sm px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="max-w-7xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                filter === f
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {f === 'ALL' ? `All (${orders.length})` : `${f} (${orders.filter(o => o.status === f).length})`}
            </button>
          ))}
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-6xl block mb-4">🍳</span>
            <p className="text-gray-400 text-lg font-medium">No {filter !== 'ALL' ? filter.toLowerCase() : ''} orders</p>
            <p className="text-gray-600 text-sm mt-1">Orders will appear here in real-time</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredOrders.map(order => (
              <KitchenOrderCard
                key={order.id}
                order={order}
                onUpdateStatus={updateStatus}
                onSendOTP={sendOTPToCustomer}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
