/**
 * MenuItemCard — rebuilt with shadcn Card, Button, Badge
 */
import React, { useState } from 'react'
import { useCart } from '../context/CartContext'
import { FaPlus, FaMinus, FaUtensils } from 'react-icons/fa'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

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
    <Card className="group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col">
      {/* Image */}
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        {/* Price badge */}
        <Badge className="absolute top-3 right-3 bg-gradient-to-r from-brand-600 to-brand-500 text-white border-0 shadow-lg shadow-brand-600/30 text-xs">
          Rs. {item.price}
        </Badge>
      </div>

      <CardContent className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          <h3 className="font-bold text-gray-900 text-base leading-snug">{item.name}</h3>
          {item.description && (
            <p className="text-gray-500 text-sm mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
          )}
        </div>

        {/* Add / Qty controls */}
        {qty === 0 ? (
          <Button onClick={handleAdd} className="w-full text-sm" size="sm">
            <FaPlus className="w-4 h-4" />
            Add to Cart
          </Button>
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
      </CardContent>
    </Card>
  )
}
