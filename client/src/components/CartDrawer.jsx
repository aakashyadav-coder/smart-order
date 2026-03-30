/**
 * CartDrawer — rebuilt with shadcn Drawer (vaul)
 * Theme: White, red gradient header
 */
import React from 'react'
import { useCart } from '../context/CartContext'
import { FaShoppingCart, FaTrash, FaPlus, FaMinus, FaUtensils } from 'react-icons/fa'
import { X } from 'lucide-react'
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

export default function CartDrawer({ open, onClose, onCheckout, tableNumber }) {
  const { items, updateQuantity, removeItem, totalItems, totalPrice, clearCart } = useCart()

  return (
    <Drawer open={open} onOpenChange={(v) => { if (!v) onClose?.() }}>
      <DrawerContent className="max-h-[88vh] p-0 rounded-t-3xl overflow-hidden">
        {/* Branded header */}
        <div className="bg-gradient-to-r from-brand-700 to-brand-500 p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <FaShoppingCart className="w-5 h-5 text-white" />
              </div>
              <div>
                <DrawerTitle className="text-lg font-extrabold leading-none text-white">Your Cart</DrawerTitle>
                <p className="text-brand-200 text-xs mt-0.5">Table #{tableNumber}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {items.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearCart}
                  className="text-brand-200 hover:text-white hover:bg-white/15 text-xs h-auto py-1.5 px-2.5"
                >
                  Clear all
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/20 w-8 h-8 rounded-xl"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Items list */}
        <ScrollArea className="flex-1 max-h-[50vh]">
          <div className="p-4 space-y-3">
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
                  <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-brand-50">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FaUtensils className="w-6 h-6 text-brand-300" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{item.name}</p>
                    <p className="text-brand-600 font-bold text-sm mt-0.5">
                      Rs. {(item.price * item.quantity).toFixed(0)}
                    </p>
                  </div>

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
        </ScrollArea>

        {/* Footer */}
        {items.length > 0 && (
          <DrawerFooter className="border-t border-gray-100 bg-white space-y-3 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 font-medium text-sm">{totalItems} item{totalItems > 1 ? 's' : ''}</span>
              <span className="text-xl font-black text-gray-900">Rs. {totalPrice.toFixed(0)}</span>
            </div>
            <Button size="lg" className="w-full" onClick={onCheckout}>
              Proceed to Checkout →
            </Button>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  )
}
