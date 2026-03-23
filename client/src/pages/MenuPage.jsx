/**
 * MenuPage — Premium customer-facing menu
 * Shows restaurant logo, name, table number hero from QR code
 * Real-time branding updates via Socket.io (restaurant_updated event)
 * URL: /menu?table=3&rid=<restaurantId>
 */
import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../lib/api'
import socket from '../lib/socket'
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
  const tableNumber  = searchParams.get('table') || '1'
  const restaurantId = searchParams.get('rid')   || null

  const [categories, setCategories]     = useState({})
  const [activeCategory, setActiveCategory] = useState(null)
  const [restaurant, setRestaurant]     = useState(null)
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [cartOpen, setCartOpen]         = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  const { totalItems, totalPrice } = useCart()

  // Fetch menu + restaurant branding together
  useEffect(() => {
    const init = async () => {
      try {
        const params = new URLSearchParams()
        if (restaurantId) params.set('restaurantId', restaurantId)

        const menuRes = await api.get(`/menu?${params.toString()}`)
        const cats    = menuRes.data.categories || {}
        const resId   = menuRes.data.restaurantId

        setCategories(cats)
        setActiveCategory(Object.keys(cats)[0] || null)

        // Fetch restaurant public info (name, logo)
        if (resId) {
          const infoRes = await api.get(`/restaurant/info/${resId}`)
          setRestaurant(infoRes.data)

          // Join restaurant room for real-time branding
          socket.emit('join_restaurant', { restaurantId: resId })
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [restaurantId])

  // Real-time restaurant branding update
  useEffect(() => {
    const onUpdate = (data) => {
      setRestaurant(prev => prev ? { ...prev, name: data.name, logoUrl: data.logoUrl } : prev)
    }
    socket.on('restaurant_updated', onUpdate)
    return () => socket.off('restaurant_updated', onUpdate)
  }, [])

  if (loading) return <LoadingSpinner />
  if (error)   return <ErrorState message={error} />

  const categoryList = Object.keys(categories)

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* ── Restaurant Hero ─────────────────────────────────────────────────── */}
      {restaurant && (
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white px-4 py-8 text-center relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '32px 32px'
          }} />
          <div className="relative z-10">
            {/* Logo */}
            {restaurant.logoUrl ? (
              <img
                src={restaurant.logoUrl}
                alt={restaurant.name}
                className="w-20 h-20 rounded-2xl object-cover mx-auto mb-3 ring-4 ring-white/20 shadow-2xl"
              />
            ) : (
              <div className="w-20 h-20 bg-gradient-to-br from-brand-500 to-orange-600 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-3 shadow-2xl">
                🍽️
              </div>
            )}
            {/* Restaurant name */}
            <h1 className="text-2xl font-extrabold tracking-tight">{restaurant.name}</h1>
            {restaurant.address && (
              <p className="text-gray-400 text-xs mt-1">📍 {restaurant.address}</p>
            )}
            {/* Table badge */}
            <div className="inline-flex items-center gap-2 mt-4 bg-white/10 backdrop-blur border border-white/20 rounded-full px-5 py-2">
              <span className="text-xl">🪑</span>
              <span className="font-extrabold text-lg">Table {tableNumber}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Sticky header (when no restaurant hero or after scroll) ─────────── */}
      <header className={`sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm ${restaurant ? '' : ''}`}>
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              {!restaurant && (
                <h1 className="text-xl font-extrabold text-gray-900 leading-tight">🍽️ Smart Order</h1>
              )}
              {restaurant && (
                <div className="flex items-center gap-2">
                  {restaurant.logoUrl && (
                    <img src={restaurant.logoUrl} alt="" className="w-7 h-7 rounded-lg object-cover" />
                  )}
                  <span className="font-bold text-gray-800 text-sm">{restaurant.name}</span>
                </div>
              )}
              <p className="text-xs text-brand-600 font-semibold mt-0.5">Table #{tableNumber}</p>
            </div>
            <button onClick={() => setCartOpen(true)} className="relative btn-primary py-2.5 px-4 text-sm">
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
        <div className="flex gap-2 overflow-x-auto max-w-2xl mx-auto px-4 pb-3 pt-1 scrollbar-none">
          {categoryList.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                activeCategory === cat
                  ? 'bg-brand-500 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-brand-300 hover:text-brand-600'
              }`}>
              <span>{CATEGORY_ICONS[cat] || '🍽️'}</span>
              <span>{cat}</span>
            </button>
          ))}
        </div>
      </header>

      {/* ── Menu items ──────────────────────────────────────────────────────── */}
      <main className="max-w-2xl mx-auto px-4 mt-4">
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
        {categoryList.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-4">🍽️</div>
            <p className="font-semibold">Menu is being prepared</p>
            <p className="text-sm mt-1">Check back soon!</p>
          </div>
        )}
      </main>

      {/* ── Floating cart bar ───────────────────────────────────────────────── */}
      {totalItems > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-30 animate-slide-up">
          <div className="max-w-lg mx-auto">
            <button onClick={() => setCartOpen(true)} className="w-full btn-primary py-4 text-base rounded-2xl shadow-xl">
              <span className="flex items-center justify-between w-full">
                <span className="bg-white/20 rounded-lg px-2.5 py-1 text-sm font-bold">{totalItems} item{totalItems > 1 ? 's' : ''}</span>
                <span>View Cart</span>
                <span className="font-bold">Rs. {totalPrice.toFixed(0)}</span>
              </span>
            </button>
          </div>
        </div>
      )}

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)}
        onCheckout={() => { setCartOpen(false); setCheckoutOpen(true) }}
        tableNumber={tableNumber} />

      {checkoutOpen && (
        <CheckoutModal tableNumber={tableNumber} restaurantId={restaurantId}
          onClose={() => setCheckoutOpen(false)} />
      )}
    </div>
  )
}
