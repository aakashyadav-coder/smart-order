/**
 * CheckoutModal — rebuilt with shadcn Dialog
 * Fix #18: Outside-click no longer closes (onInteractOutside prevented)
 * Fix #21: tableNumber validated as a positive integer before submission
 */
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useCart } from '../context/CartContext'
import { FaUser, FaPhoneAlt, FaShoppingCart } from 'react-icons/fa'
import { ShoppingCart, Loader2, X } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const PHONE_REGEX = /^(\+?\d{1,3}[\s\-]?)?\d{7,14}$/

export default function CheckoutModal({ open, tableNumber, restaurantId, onClose }) {
  const navigate = useNavigate()
  const { items, totalPrice, clearCart } = useCart()

  const [form, setForm] = useState({ customerName: '', phone: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const parsedTable = parseInt(tableNumber)
  const tableValid = !isNaN(parsedTable) && parsedTable > 0

  const validate = () => {
    const errs = {}
    if (!form.customerName.trim() || form.customerName.trim().length < 2)
      errs.customerName = 'Please enter your name (at least 2 characters)'
    if (!form.phone.trim() || !PHONE_REGEX.test(form.phone.replace(/[\s\-()]/g, '')))
      errs.phone = 'Please enter a valid phone number (7–15 digits)'
    if (!tableValid)
      errs.table = 'Invalid table number in URL. Please scan the QR code again.'
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
      clearCart()
      toast.success('Order placed successfully!')
      navigate(`/order/${res.data.id}`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose?.() }}>
      <DialogContent
        className="max-w-md p-0 overflow-hidden rounded-3xl"
        // Fix #18: prevent accidental dismiss on outside click
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Branded header */}
        <div className="bg-gradient-to-r from-brand-700 to-brand-500 p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-extrabold leading-none text-white">Checkout</DialogTitle>
                <p className="text-brand-200 text-xs mt-0.5">Table #{tableValid ? parsedTable : '—'}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-xl"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
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

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="checkout-name">Your Name</Label>
            <div className="relative">
              <FaUser className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="checkout-name"
                type="text"
                placeholder="e.g. Anil Sharma"
                className={`pl-10 ${errors.customerName ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                value={form.customerName}
                onChange={e => { setForm(p => ({ ...p, customerName: e.target.value })); setErrors(p => ({ ...p, customerName: null })) }}
              />
            </div>
            {errors.customerName && <p className="text-red-500 text-xs">{errors.customerName}</p>}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="checkout-phone">Phone Number</Label>
            <div className="relative">
              <FaPhoneAlt className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="checkout-phone"
                type="tel"
                placeholder="e.g. 9800000000"
                className={`pl-10 ${errors.phone ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                value={form.phone}
                onChange={e => { setForm(p => ({ ...p, phone: e.target.value })); setErrors(p => ({ ...p, phone: null })) }}
              />
            </div>
            {errors.phone && <p className="text-red-500 text-xs">{errors.phone}</p>}
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full mt-2"
            disabled={loading || items.length === 0 || !tableValid}
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Placing Order…</>
            ) : (
              `Place Order — Rs. ${totalPrice.toFixed(0)}`
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
