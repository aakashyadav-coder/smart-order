/**
 * MenuItemCard — Premium food item card with add-to-cart
 * Theme: White card, red gradient add button
 */
import React, { useState } from 'react'
import { useCart } from '../context/CartContext'
import { FaPlus, FaMinus, FaUtensils } from 'react-icons/fa'

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
    <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden flex flex-col">
      {/* Item image */}
      <div className="relative h-48 bg-gray-100 overflow-hidden">
        {!imgError && item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100">
            <FaUtensils className="w-12 h-12 text-brand-300" />
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        {/* Price badge */}
        <div className="absolute top-3 right-3 bg-gradient-to-r from-brand-600 to-brand-500 text-white text-xs font-bold px-2.5 py-1.5 rounded-full shadow-lg shadow-brand-600/30">
          Rs. {item.price}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          <h3 className="font-bold text-gray-900 text-base leading-snug">{item.name}</h3>
          {item.description && (
            <p className="text-gray-500 text-sm mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
          )}
        </div>

        {/* Add / Quantity controls */}
        {qty === 0 ? (
          <button
            onClick={handleAdd}
            className="btn-primary w-full text-sm py-2.5 rounded-xl"
          >
            <FaPlus className="w-4 h-4" />
            Add to Cart
          </button>
        ) : (
          <div className="flex items-center justify-between bg-brand-50 border border-brand-100 rounded-xl p-1">
            <button
              onClick={() => updateQuantity(item.id, qty - 1)}
              className="w-9 h-9 rounded-lg bg-white border border-brand-200 text-brand-600 flex items-center justify-center hover:bg-brand-600 hover:text-white hover:border-brand-600 transition-all duration-150"
            >
              <FaMinus className="w-4 h-4" />
            </button>
            <span className="font-black text-brand-700 text-base min-w-[2ch] text-center">{qty}</span>
            <button
              onClick={() => updateQuantity(item.id, qty + 1)}
              className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-600 to-brand-500 text-white flex items-center justify-center hover:from-brand-700 hover:to-brand-600 transition-all duration-150 shadow-sm"
            >
              <FaPlus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
