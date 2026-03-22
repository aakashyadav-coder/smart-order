/**
 * MenuItemCard — individual food item card with add-to-cart
 */
import React, { useState } from 'react'
import { useCart } from '../context/CartContext'

export default function MenuItemCard({ item }) {
  const { items, addItem, updateQuantity } = useCart()
  const [imgError, setImgError] = useState(false)

  const cartItem = items.find(i => i.menuItemId === item.id)
  const qty = cartItem?.quantity || 0

  const handleAdd = () => {
    addItem({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      imageUrl: item.imageUrl,
    })
  }

  return (
    <div className="card-hover flex flex-col">
      {/* Item image */}
      <div className="relative h-48 bg-gray-100 overflow-hidden">
        {!imgError && item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-orange-50 to-orange-100">
            🍽️
          </div>
        )}
        {/* Price badge */}
        <div className="absolute top-3 right-3 bg-black/70 text-white text-sm font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
          Rs. {item.price}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          <h3 className="font-bold text-gray-900 text-base leading-snug">{item.name}</h3>
          {item.description && (
            <p className="text-gray-500 text-sm mt-1 line-clamp-2">{item.description}</p>
          )}
        </div>

        {/* Add / Quantity controls */}
        {qty === 0 ? (
          <button
            onClick={handleAdd}
            className="btn-primary w-full text-sm py-2.5"
          >
            + Add to Cart
          </button>
        ) : (
          <div className="flex items-center justify-between bg-brand-50 rounded-xl p-1">
            <button
              onClick={() => updateQuantity(item.id, qty - 1)}
              className="w-9 h-9 rounded-lg bg-white border border-brand-200 text-brand-600 font-bold text-lg flex items-center justify-center hover:bg-brand-100 transition-colors"
            >
              −
            </button>
            <span className="font-bold text-brand-700 text-base">{qty}</span>
            <button
              onClick={() => updateQuantity(item.id, qty + 1)}
              className="w-9 h-9 rounded-lg bg-brand-500 text-white font-bold text-lg flex items-center justify-center hover:bg-brand-600 transition-colors"
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
