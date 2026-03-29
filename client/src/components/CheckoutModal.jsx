/**
 * CheckoutModal — Premium order form
 * Theme: White modal, gradient header, icon inputs
 * Fix #18: Outside-click no longer closes the modal (prevents accidental form loss)
 * Fix #21: tableNumber validated as a positive integer before submission
 */
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useCart } from '../context/CartContext'
import { FaTimes, FaUser, FaPhoneAlt, FaShoppingCart } from 'react-icons/fa'

// Nepali phone: 10 digits starting with 97/98, or international +XXX format
const PHONE_REGEX = /^(\+?\d{1,3}[\s\-]?)?\d{7,14}$/

export default function CheckoutModal({ tableNumber, restaurantId, onClose }) {
  const navigate = useNavigate()
  const { items, totalPrice, clearCart } = useCart()

  const [form, setForm] = useState({ customerName: '', phone: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  // Validate tableNumber is a safe positive integer
  const parsedTable = parseInt(tableNumber)
  const tableValid = !isNaN(parsedTable) && parsedTable > 0

  const validate = () => {
    const errs = {}
    if (!form.customerName.trim() || form.customerName.trim().length < 2) {
      errs.customerName = 'Please enter your name (at least 2 characters)'
    }
    if (!form.phone.trim() || !PHONE_REGEX.test(form.phone.replace(/[\s\-()]/g, ''))) {
      errs.phone = 'Please enter a valid phone number (7–15 digits)'
    }
    if (!tableValid) {
      errs.table = 'Invalid table number in URL. Please scan the QR code again.'
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
        tableNumber: parsedTable,
        items: items.map(i => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
        ...(restaurantId && { restaurantId }),
      }

      const res = await api.post('/orders', payload)
      const order = res.data

      clearCart()
      toast.success('Order placed successfully!')
      navigate(`/order/${order.id}`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    // Fix #18: removed onClick={onClose} from backdrop — outside-click no longer dismisses.
    // User must click ✕ to close, preventing accidental form data loss.
    <div className="overlay animate-fade-in">
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-bounce-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-700 to-brand-500 p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <FaShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold leading-none">Checkout</h2>
                <p className="text-brand-200 text-xs mt-0.5">Table #{tableValid ? parsedTable : '—'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
            >
              <FaTimes className="w-4 h-4" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Table number error */}
          {errors.table && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-red-600 text-sm font-medium">
              {errors.table}
            </div>
          )}

          {/* Order summary */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-2 border border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Order Summary</p>
            {items.map(item => (
              <div key={item.menuItemId} className="flex justify-between text-sm">
                <span className="text-gray-700">{item.name} <span className="text-gray-400">×{item.quantity}</span></span>
                <span className="font-semibold text-gray-800">Rs. {(item.price * item.quantity).toFixed(0)}</span>
              </div>
            ))}
            <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between">
              <span className="font-bold text-gray-900">Total</span>
              <span className="font-black text-brand-600 text-base">Rs. {totalPrice.toFixed(0)}</span>
            </div>
          </div>

          {/* Customer Name */}
          <div>
            <label className="label">Your Name</label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <FaUser className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="e.g. Anil Sharma"
                className={`input pl-10 ${errors.customerName ? 'input-error' : ''}`}
                value={form.customerName}
                onChange={e => { setForm(p => ({ ...p, customerName: e.target.value })); setErrors(p => ({ ...p, customerName: null })) }}
              />
            </div>
            {errors.customerName && <p className="text-red-500 text-xs mt-1.5">{errors.customerName}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="label">Phone Number</label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <FaPhoneAlt className="w-4 h-4" />
              </div>
              <input
                type="tel"
                placeholder="e.g. 9800000000"
                className={`input pl-10 ${errors.phone ? 'input-error' : ''}`}
                value={form.phone}
                onChange={e => { setForm(p => ({ ...p, phone: e.target.value })); setErrors(p => ({ ...p, phone: null })) }}
              />
            </div>
            {errors.phone && <p className="text-red-500 text-xs mt-1.5">{errors.phone}</p>}
          </div>

          <button
            type="submit"
            disabled={loading || items.length === 0 || !tableValid}
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
