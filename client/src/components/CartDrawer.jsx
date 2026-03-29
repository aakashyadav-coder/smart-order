/**
 * CartDrawer — Premium slide-up cart panel
 * Theme: White, red gradient header
 */
import React, { useState, useEffect } from 'react'
import { useCart } from '../context/CartContext'
import { FaShoppingCart, FaTimes, FaTrash, FaPlus, FaMinus, FaUtensils } from 'react-icons/fa'

export default function CartDrawer({ open, onClose, onCheckout, tableNumber }) {
  const { items, updateQuantity, removeItem, totalItems, totalPrice, clearCart } = useCart()
  const [visible, setVisible] = useState(false)
  const [animOut, setAnimOut] = useState(false)

  useEffect(() => {
    if (open) { setVisible(true); setAnimOut(false) }
    else if (visible) {
      setAnimOut(true)
      const t = setTimeout(() => { setVisible(false); setAnimOut(false) }, 280)
      return () => clearTimeout(t)
    }
  }, [open])

  if (!visible) return null

  return (
    <div className={`overlay ${animOut ? 'opacity-0' : 'animate-fade-in'} transition-opacity duration-280`} onClick={onClose}>
      <div
        className={`w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[88vh] flex flex-col overflow-hidden ${
          animOut ? 'animate-slide-down' : 'animate-slide-up'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-700 to-brand-500 p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <FaShoppingCart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold leading-none">Your Cart</h2>
                <p className="text-brand-200 text-xs mt-0.5">Table #{tableNumber}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {items.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-brand-200 hover:text-white font-medium transition-colors px-2.5 py-1.5 rounded-lg hover:bg-white/15"
                >
                  Clear all
                </button>
              )}
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
              >
                <FaTimes className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mb-4">
                <FaShoppingCart className="w-10 h-10 text-brand-300" />
              </div>
              <p className="text-gray-700 font-semibold">Your cart is empty</p>
              <p className="text-gray-400 text-sm mt-1">Add items from the menu</p>
            </div>
          ) : (
            items.map(item => (
              <div key={item.menuItemId} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
                {/* Image */}
                <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-brand-50">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FaUtensils className="w-6 h-6 text-brand-300" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{item.name}</p>
                  <p className="text-brand-600 font-bold text-sm mt-0.5">
                    Rs. {(item.price * item.quantity).toFixed(0)}
                  </p>
                </div>

                {/* Qty controls */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                    className="w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-600 flex items-center justify-center hover:border-brand-300 hover:text-brand-600 transition-colors"
                  >
                    {item.quantity === 1 ? <FaTrash className="w-3.5 h-3.5" /> : <FaMinus className="w-3.5 h-3.5" />}
                  </button>
                  <span className="w-6 text-center font-bold text-gray-800 text-sm">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                    className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-600 to-brand-500 text-white flex items-center justify-center hover:from-brand-700 hover:to-brand-600 transition-all"
                  >
                    <FaPlus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-4 border-t border-gray-100 space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 font-medium text-sm">{totalItems} item{totalItems > 1 ? 's' : ''}</span>
              <span className="text-xl font-black text-gray-900">Rs. {totalPrice.toFixed(0)}</span>
            </div>
            <button onClick={onCheckout} className="btn-primary w-full py-3.5 text-base">
              Proceed to Checkout →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
