/**
 * CheckoutModal — form for customer name and phone, then submits order
 */
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useCart } from '../context/CartContext'

export default function CheckoutModal({ tableNumber, restaurantId, onClose }) {
  const navigate = useNavigate()
  const { items, totalPrice, clearCart } = useCart()

  const [form, setForm] = useState({ customerName: '', phone: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const errs = {}
    if (!form.customerName.trim() || form.customerName.trim().length < 2) {
      errs.customerName = 'Please enter your name (at least 2 characters)'
    }
    const phoneRegex = /^[+]?[\d\s\-()]{7,15}$/
    if (!form.phone.trim() || !phoneRegex.test(form.phone.trim())) {
      errs.phone = 'Please enter a valid phone number'
    }
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setLoading(true)
    try {
      const payload = {
        customerName: form.customerName.trim(),
        phone: form.phone.trim(),
        tableNumber: parseInt(tableNumber),
        items: items.map(i => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
        ...(restaurantId && { restaurantId }),
      }

      const res = await api.post('/orders', payload)
      const order = res.data

      clearCart()
      toast.success('Order placed successfully! 🎉')
      navigate(`/order/${order.id}`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="overlay animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-bounce-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-500 to-brand-600 p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold">Checkout</h2>
              <p className="text-brand-100 text-sm">Table #{tableNumber}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Order summary */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
            <p className="text-sm font-semibold text-gray-700 mb-2">Order Summary</p>
            {items.map(item => (
              <div key={item.menuItemId} className="flex justify-between text-sm text-gray-600">
                <span>{item.name} × {item.quantity}</span>
                <span className="font-medium">Rs. {(item.price * item.quantity).toFixed(0)}</span>
              </div>
            ))}
            <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-bold text-gray-900">
              <span>Total</span>
              <span className="text-brand-600">Rs. {totalPrice.toFixed(0)}</span>
            </div>
          </div>

          {/* Customer Name */}
          <div>
            <label className="label">Your Name *</label>
            <input
              type="text"
              placeholder="e.g. Anil Sharma"
              className={`input ${errors.customerName ? 'input-error' : ''}`}
              value={form.customerName}
              onChange={e => { setForm(p => ({ ...p, customerName: e.target.value })); setErrors(p => ({ ...p, customerName: null })) }}
            />
            {errors.customerName && <p className="text-red-500 text-xs mt-1">{errors.customerName}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="label">Phone Number *</label>
            <input
              type="tel"
              placeholder="e.g. 9800000000"
              className={`input ${errors.phone ? 'input-error' : ''}`}
              value={form.phone}
              onChange={e => { setForm(p => ({ ...p, phone: e.target.value })); setErrors(p => ({ ...p, phone: null })) }}
            />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
          </div>

          {/* Table (read-only) */}
          <div>
            <label className="label">Table Number</label>
            <input type="text" value={`Table #${tableNumber}`} readOnly className="input bg-gray-50 text-gray-500 cursor-not-allowed" />
          </div>

          <button
            type="submit"
            disabled={loading || items.length === 0}
            className="btn-primary w-full py-3.5 text-base mt-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Placing Order…
              </span>
            ) : (
              `Place Order — Rs. ${totalPrice.toFixed(0)}`
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
