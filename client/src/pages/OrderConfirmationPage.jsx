/**
 * OrderConfirmationPage — Live status tracking
 * Theme: White/brand, consistent with customer pages
 */
import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../lib/api'
import socket from '../lib/socket'
import {
  FaArrowLeft, FaClock, FaCheckCircle, FaFire, FaUtensils,
  FaTimesCircle, FaPhoneAlt, FaUser, FaTable
} from 'react-icons/fa'

const STATUS_META = {
  PENDING:   { label: 'Order Received',    icon: FaClock,       color: 'text-amber-600',  bg: 'bg-amber-50',   border: 'border-amber-200', step: 1 },
  ACCEPTED:  { label: 'Order Accepted',    icon: FaCheckCircle, color: 'text-blue-600',   bg: 'bg-blue-50',    border: 'border-blue-200',   step: 2 },
  PREPARING: { label: 'Being Prepared',    icon: FaFire,        color: 'text-purple-600', bg: 'bg-purple-50',  border: 'border-purple-200', step: 3 },
  COMPLETED: { label: 'Ready for Pickup!', icon: FaCheckCircle, color: 'text-green-600',  bg: 'bg-green-50',   border: 'border-green-200',  step: 4 },
  CANCELLED: { label: 'Order Cancelled',   icon: FaTimesCircle, color: 'text-red-600',    bg: 'bg-red-50',     border: 'border-red-200',    step: 0 },
}

const STEPS = ['PENDING', 'ACCEPTED', 'PREPARING', 'COMPLETED']

export default function OrderConfirmationPage() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [status, setStatus] = useState('PENDING')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get(`/orders/${id}`)
      .then(res => { setOrder(res.data); setStatus(res.data.status) })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

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
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderWidth: '3px' }} />
          <p className="text-gray-400 text-sm mt-4">Loading your order…</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <FaTimesCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">{error || 'Order not found'}</p>
          <Link to="/menu" className="btn-primary mt-4 inline-flex">Back to Menu</Link>
        </div>
      </div>
    )
  }

  const meta = STATUS_META[status] || STATUS_META.PENDING
  const currentStep = meta.step
  const StatusIcon = meta.icon

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-20 shadow-sm">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link to={`/menu?table=${order.tableNumber}`} className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
            <FaArrowLeft className="w-4 h-4 text-gray-600" />
          </Link>
          <h1 className="text-base font-extrabold text-gray-900">Order Confirmation</h1>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Live updates
          </div>
        </div>
      </header>

      <div className="page-container max-w-lg space-y-4 mt-4">
        {/* Status Hero Card */}
        <div className={`card ${meta.bg} ${meta.border} border-2 p-6 text-center animate-fade-in`}>
          <div className={`w-20 h-20 rounded-full ${meta.bg} ${meta.border} border-2 flex items-center justify-center mx-auto mb-4 ${status === 'PENDING' || status === 'PREPARING' ? 'animate-pulse' : ''}`}>
            <StatusIcon className={`w-10 h-10 ${meta.color}`} />
          </div>
          <h2 className={`text-2xl font-extrabold ${meta.color}`}>{meta.label}</h2>
          <p className="text-gray-500 text-sm mt-1.5">
            Order #{id.slice(-8).toUpperCase()} · Table #{order.tableNumber}
          </p>
          {order.estimatedMinutes && status !== 'COMPLETED' && status !== 'CANCELLED' && (
            <div className="mt-3 inline-flex items-center gap-2 bg-white/70 backdrop-blur px-4 py-2 rounded-full text-sm font-medium text-gray-700 border border-white">
              <FaClock className="w-4 h-4 text-gray-500" />
              Est. {order.estimatedMinutes} min
            </div>
          )}
        </div>

        {/* Progress Stepper */}
        {status !== 'CANCELLED' && (
          <div className="card p-5">
            <div className="flex items-center">
              {STEPS.map((step, idx) => {
                const sMeta = STATUS_META[step]
                const SIcon = sMeta.icon
                const done   = currentStep > idx + 1
                const active = currentStep === idx + 1
                return (
                  <React.Fragment key={step}>
                    <div className="flex flex-col items-center gap-2 flex-shrink-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                        done   ? 'bg-green-500 text-white shadow-md'
                        : active ? 'bg-gradient-to-br from-brand-600 to-brand-500 text-white shadow-lg shadow-brand-500/30 ring-4 ring-brand-100'
                                 : 'bg-gray-100 text-gray-400'
                      }`}>
                        {done
                          ? <FaCheckCircle className="w-5 h-5" />
                          : <SIcon className="w-5 h-5" />
                        }
                      </div>
                      <span className={`text-[10px] font-semibold text-center leading-tight max-w-[52px] ${
                        active ? 'text-brand-600' : done ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        {sMeta.label.split(' ').slice(0,2).join(' ')}
                      </span>
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div className={`h-0.5 flex-1 mx-2 mb-6 transition-all duration-700 rounded-full ${currentStep > idx + 1 ? 'bg-green-400' : 'bg-gray-200'}`} />
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </div>
        )}

        {/* Order Details */}
        <div className="card p-5 space-y-3">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <FaUtensils className="w-4 h-4 text-brand-500" />
            Order Details
          </h3>
          <div className="space-y-2">
            {order.items.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-700">{item.menuItem?.name || 'Item'} <span className="text-gray-400">×{item.quantity}</span></span>
                <span className="font-semibold text-gray-800">Rs. {(item.price * item.quantity).toFixed(0)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-gray-900">
            <span>Total</span>
            <span className="text-brand-600 text-lg">Rs. {order.totalPrice.toFixed(0)}</span>
          </div>
        </div>

        {/* Customer Info */}
        <div className="card p-5">
          <h3 className="font-bold text-gray-800 mb-3">Your Details</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2.5">
              <FaUser className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>{order.customerName}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <FaPhoneAlt className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>{order.phone}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <FaTable className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>Table #{order.tableNumber}</span>
            </div>
          </div>
        </div>

        {status === 'COMPLETED' && (
          <Link to={`/menu?table=${order.tableNumber}`} className="btn-primary w-full py-3.5 text-center flex items-center justify-center gap-2">
            <FaUtensils className="w-4 h-4" />
            Order Again
          </Link>
        )}

        <p className="text-center text-xs text-gray-400 mt-4">
          This page updates automatically · No refresh needed
        </p>
      </div>
    </div>
  )
}
