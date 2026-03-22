/**
 * OrderConfirmationPage — shows order summary and live status via Socket.io
 */
import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../lib/api'
import socket from '../lib/socket'

const STATUS_META = {
  PENDING:    { label: 'Order Received',       icon: '⏳', color: 'text-amber-600',  bg: 'bg-amber-50',  step: 1 },
  ACCEPTED:   { label: 'Order Accepted',       icon: '✅', color: 'text-blue-600',   bg: 'bg-blue-50',   step: 2 },
  PREPARING:  { label: 'Being Prepared',       icon: '👨‍🍳', color: 'text-purple-600', bg: 'bg-purple-50', step: 3 },
  COMPLETED:  { label: 'Ready for Pickup!',    icon: '🎉', color: 'text-green-600',  bg: 'bg-green-50',  step: 4 },
  CANCELLED:  { label: 'Order Cancelled',      icon: '❌', color: 'text-red-600',    bg: 'bg-red-50',    step: 0 },
}

const STEPS = ['PENDING', 'ACCEPTED', 'PREPARING', 'COMPLETED']

export default function OrderConfirmationPage() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [status, setStatus] = useState('PENDING')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch initial order
  useEffect(() => {
    api.get(`/orders/${id}`)
      .then(res => {
        setOrder(res.data)
        setStatus(res.data.status)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  // Join order's socket room for real-time status updates
  useEffect(() => {
    socket.emit('join_order_room', { orderId: id })

    const handleStatusUpdate = ({ orderId, status: newStatus }) => {
      if (orderId === id) setStatus(newStatus)
    }

    socket.on('order_status_update', handleStatusUpdate)
    return () => socket.off('order_status_update', handleStatusUpdate)
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <span className="text-5xl block mb-4">😕</span>
          <p className="text-gray-600">{error || 'Order not found'}</p>
          <Link to="/menu" className="btn-primary mt-4 inline-flex">Back to Menu</Link>
        </div>
      </div>
    )
  }

  const meta = STATUS_META[status] || STATUS_META.PENDING
  const currentStep = meta.step

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-gray-50 pb-10">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <Link to={`/menu?table=${order.tableNumber}`} className="btn-ghost py-2 px-3 text-sm">
          ← Menu
        </Link>
        <h1 className="text-lg font-extrabold text-gray-900">Order Confirmation</h1>
      </header>

      <div className="page-container max-w-lg space-y-4 mt-4">
        {/* Status Card */}
        <div className={`card ${meta.bg} border-0 p-6 text-center animate-fade-in`}>
          <div className="text-5xl mb-3">{meta.icon}</div>
          <h2 className={`text-2xl font-extrabold ${meta.color}`}>{meta.label}</h2>
          <p className="text-gray-500 text-sm mt-1">
            Order #{id.slice(-8).toUpperCase()} · Table #{order.tableNumber}
          </p>
          {order.estimatedMinutes && status !== 'COMPLETED' && status !== 'CANCELLED' && (
            <div className="mt-3 inline-flex items-center gap-1.5 bg-white/70 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-medium text-gray-700">
              ⏱️ Est. {order.estimatedMinutes} min
            </div>
          )}
        </div>

        {/* Progress stepper */}
        {status !== 'CANCELLED' && (
          <div className="card p-5">
            <div className="flex items-center justify-between">
              {STEPS.map((step, idx) => {
                const sMeta = STATUS_META[step]
                const done = currentStep > idx + 1
                const active = currentStep === idx + 1
                return (
                  <React.Fragment key={step}>
                    <div className="flex flex-col items-center gap-1.5 flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all duration-500 ${
                        done   ? 'bg-green-500 text-white shadow-md'  :
                        active ? 'bg-brand-500 text-white shadow-lg ring-4 ring-brand-200 animate-pulse'  :
                                 'bg-gray-100 text-gray-400'
                      }`}>
                        {done ? '✓' : sMeta.icon}
                      </div>
                      <span className={`text-xs font-medium text-center leading-snug ${active ? 'text-brand-600' : done ? 'text-green-600' : 'text-gray-400'}`}>
                        {sMeta.label}
                      </span>
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div className={`h-0.5 flex-1 mx-1 mb-5 transition-all duration-700 ${currentStep > idx + 1 ? 'bg-green-400' : 'bg-gray-200'}`} />
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </div>
        )}

        {/* Order details */}
        <div className="card p-5 space-y-3">
          <h3 className="font-bold text-gray-800">Order Details</h3>
          <div className="space-y-2">
            {order.items.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-700">{item.menuItem?.name || 'Item'} × {item.quantity}</span>
                <span className="font-semibold text-gray-800">Rs. {(item.price * item.quantity).toFixed(0)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-gray-900">
            <span>Total</span>
            <span className="text-brand-600">Rs. {order.totalPrice.toFixed(0)}</span>
          </div>
        </div>

        {/* Customer info */}
        <div className="card p-5">
          <h3 className="font-bold text-gray-800 mb-3">Your Details</h3>
          <div className="space-y-1 text-sm text-gray-600">
            <p>👤 {order.customerName}</p>
            <p>📱 {order.phone}</p>
            <p>🪑 Table #{order.tableNumber}</p>
          </div>
        </div>

        {/* Success - back to menu */}
        {status === 'COMPLETED' && (
          <Link to={`/menu?table=${order.tableNumber}`} className="btn-primary w-full py-3 text-center block">
            Order Again 🍽️
          </Link>
        )}

        <p className="text-center text-xs text-gray-400 mt-4">
          This page updates automatically · No refresh needed
        </p>
      </div>
    </div>
  )
}
