/**
 * CartDrawer — slide-up panel showing cart items and totals
 */
import React from 'react'
import { useCart } from '../context/CartContext'

export default function CartDrawer({ open, onClose, onCheckout, tableNumber }) {
  const { items, updateQuantity, removeItem, totalItems, totalPrice, clearCart } = useCart()

  if (!open) return null

  return (
    <div className="overlay animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] flex flex-col animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900">Your Cart</h2>
            <p className="text-xs text-brand-600 font-medium mt-0.5">Table #{tableNumber}</p>
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button onClick={clearCart} className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors px-2 py-1">
                Clear
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-6xl mb-4">🛒</span>
              <p className="text-gray-500 font-medium">Your cart is empty</p>
              <p className="text-gray-400 text-sm mt-1">Add items from the menu</p>
            </div>
          ) : (
            items.map(item => (
              <div key={item.menuItemId} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                {/* Image */}
                <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-orange-100">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
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
                    className="w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-700 font-bold text-sm flex items-center justify-center hover:border-red-300 hover:text-red-500 transition-colors"
                  >
                    {item.quantity === 1 ? '🗑' : '−'}
                  </button>
                  <span className="w-6 text-center font-bold text-gray-800">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                    className="w-8 h-8 rounded-lg bg-brand-500 text-white font-bold text-sm flex items-center justify-center hover:bg-brand-600 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-4 border-t border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 font-medium">{totalItems} item{totalItems > 1 ? 's' : ''}</span>
              <span className="text-xl font-extrabold text-gray-900">Rs. {totalPrice.toFixed(0)}</span>
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
