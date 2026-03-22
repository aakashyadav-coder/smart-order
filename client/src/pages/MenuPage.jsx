/**
 * MenuPage — Customer-facing menu with categories, cart, and checkout
 * Reads ?table=X from URL to capture table number automatically
 */
import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../lib/api'
import { useCart } from '../context/CartContext'
import MenuItemCard from '../components/MenuItemCard'
import CartDrawer from '../components/CartDrawer'
import CheckoutModal from '../components/CheckoutModal'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorState from '../components/ErrorState'

const CATEGORY_ICONS = {
  'Drinks':      '🥤',
  'Starters':    '🥗',
  'Main Course': '🍛',
  'Desserts':    '🍮',
}

export default function MenuPage() {
  const [searchParams] = useSearchParams()
  const tableNumber = searchParams.get('table') || '1'

  const [categories, setCategories] = useState({})
  const [activeCategory, setActiveCategory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  const { totalItems, totalPrice } = useCart()

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await api.get('/menu')
        const cats = res.data.categories
        setCategories(cats)
        setActiveCategory(Object.keys(cats)[0] || null)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchMenu()
  }, [])

  if (loading) return <LoadingSpinner />
  if (error)   return <ErrorState message={error} />

  const categoryList = Object.keys(categories)

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-gray-50 pb-28">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="page-container py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-extrabold text-gray-900 leading-tight">
                🍽️ Smart Order
              </h1>
              <p className="text-xs text-brand-600 font-semibold mt-0.5">
                Table #{tableNumber}
              </p>
            </div>
            <button
              onClick={() => setCartOpen(true)}
              className="relative btn-primary py-2.5 px-4 text-sm"
            >
              🛒 Cart
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center animate-bounce-in">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 pt-1 scrollbar-none">
          {categoryList.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                activeCategory === cat
                  ? 'bg-brand-500 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-brand-300 hover:text-brand-600'
              }`}
            >
              <span>{CATEGORY_ICONS[cat] || '🍽️'}</span>
              <span>{cat}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Menu items grid */}
      <main className="page-container mt-4">
        {activeCategory && (
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span>{CATEGORY_ICONS[activeCategory] || '🍽️'}</span>
              <span>{activeCategory}</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(categories[activeCategory] || []).map(item => (
                <MenuItemCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Floating cart bar at bottom */}
      {totalItems > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-30 animate-slide-up">
          <div className="max-w-lg mx-auto">
            <button
              onClick={() => setCartOpen(true)}
              className="w-full btn-primary py-4 text-base rounded-2xl shadow-xl"
            >
              <span className="flex items-center justify-between w-full">
                <span className="bg-white/20 rounded-lg px-2.5 py-1 text-sm font-bold">
                  {totalItems} item{totalItems > 1 ? 's' : ''}
                </span>
                <span>View Cart</span>
                <span className="font-bold">Rs. {totalPrice.toFixed(0)}</span>
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={() => { setCartOpen(false); setCheckoutOpen(true) }}
        tableNumber={tableNumber}
      />

      {/* Checkout Modal */}
      {checkoutOpen && (
        <CheckoutModal
          tableNumber={tableNumber}
          onClose={() => setCheckoutOpen(false)}
        />
      )}
    </div>
  )
}
