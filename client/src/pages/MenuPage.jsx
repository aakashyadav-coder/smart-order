/**
 * MenuPage — Premium customer-facing menu
 * Theme: White/red — aurora hero, glassmorphism header
 */
import React, { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../lib/api'
import socket from '../lib/socket'
import { useCart } from '../context/CartContext'
import MenuItemCard from '../components/MenuItemCard'
import CartDrawer from '../components/CartDrawer'
import CheckoutModal from '../components/CheckoutModal'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorState from '../components/ErrorState'
import { FaShoppingCart, FaMapMarkerAlt, FaUtensils, FaTools } from 'react-icons/fa'

const CATEGORY_ICONS = {
  // English
  'Drinks':       '🥤', 'Beverages':    '☕', 'Coffee':       '☕',
  'Starters':     '🥗', 'Appetizers':   '🥗', 'Snacks':       '🍟',
  'Main Course':  '🍛', 'Mains':        '🍽️', 'Entrees':      '🍽️',
  'Desserts':     '🍮', 'Sweets':       '🍰', 'Bakery':       '🥐',
  'Pizza':        '🍕', 'Burgers':      '🍔', 'Sandwiches':   '🥪',
  'Pasta':        '🍝', 'Noodles':      '🍜', 'Rice':         '🍚',
  'Salads':       '🥙', 'Soups':        '🍲', 'Breakfast':    '🍳',
  'Seafood':      '🦐', 'Grills':       '🍖', 'BBQ':          '🔥',
  'Veg':          '🥦', 'Vegetarian':   '🥦', 'Vegan':        '🌱',
  'Non-Veg':      '🍗', 'Specials':     '⭐', 'Chef Special':  '👨‍🍳',
  // Nepali / South-Asian
  'दाल भात':      '🍚', 'मोमो':         '🥟', 'चिया':         '☕',
}

export default function MenuPage() {
  const [searchParams] = useSearchParams()
  const tableNumber  = searchParams.get('table') || '1'
  const restaurantId = searchParams.get('rid')   || null

  const [categories, setCategories]       = useState({})
  const [activeCategory, setActiveCategory] = useState(null)
  const [restaurant, setRestaurant]       = useState(null)
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)
  const [cartOpen, setCartOpen]           = useState(false)
  const [checkoutOpen, setCheckoutOpen]   = useState(false)
  const [maintenance, setMaintenance]     = useState(null)
  const [countdown, setCountdown]         = useState(null)

  const itemsSectionRef = useRef(null) // for scroll-to-top on category switch

  const { totalItems, totalPrice } = useCart()

  // ── Maintenance Mode ────────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/maintenance').then(r => setMaintenance(r.data)).catch(() => {})
    const onMaint = d => setMaintenance(d)
    socket.on('maintenance_update', onMaint)
    return () => socket.off('maintenance_update', onMaint)
  }, [])

  // Countdown timer for scheduled downtime
  useEffect(() => {
    if (!maintenance?.scheduledAt || maintenance?.active) { setCountdown(null); return }
    const tick = () => {
      const diff = new Date(maintenance.scheduledAt).getTime() - Date.now()
      if (diff <= 0) { setCountdown(null); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setCountdown(`${h > 0 ? `${h}h ` : ''}${m}m ${s}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [maintenance?.scheduledAt, maintenance?.active])

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

        if (resId) {
          const infoRes = await api.get(`/restaurant/info/${resId}`)
          setRestaurant(infoRes.data)
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

  useEffect(() => {
    const onUpdate = (data) => {
      setRestaurant(prev => prev ? { ...prev, name: data.name, logoUrl: data.logoUrl } : prev)
    }
    socket.on('restaurant_updated', onUpdate)
    return () => socket.off('restaurant_updated', onUpdate)
  }, [])

  // ── Maintenance overlay ─────────────────────────────────────────────────────
  if (maintenance?.active) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-brand-950 to-gray-900 flex items-center justify-center p-6 text-white text-center">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-brand-800/15 rounded-full blur-2xl" />
      </div>
      <div className="relative z-10 max-w-md">
        <div className="w-20 h-20 bg-white/10 backdrop-blur rounded-3xl flex items-center justify-center mx-auto mb-6 ring-1 ring-white/20">
          <FaTools className="w-9 h-9 text-white animate-pulse" />
        </div>
        <h1 className="text-3xl font-black tracking-tight mb-3">Down for Maintenance</h1>
        <p className="text-gray-300 text-lg leading-relaxed">
          {maintenance.message || "We'll be back soon! Scheduled maintenance in progress."}
        </p>
        {countdown && (
          <div className="mt-6 inline-flex items-center gap-3 bg-white/10 backdrop-blur border border-white/15 rounded-2xl px-6 py-4">
            <div className="text-center">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-widest mb-1">Scheduled in</p>
              <p className="text-2xl font-black font-mono">{countdown}</p>
            </div>
          </div>
        )}
        <p className="mt-8 text-gray-500 text-sm">Please try again in a few minutes.</p>
      </div>
    </div>
  )

  if (loading) return <LoadingSpinner />
  if (error)   return <ErrorState message={error} />

  const categoryList = Object.keys(categories)

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* ── Restaurant Hero ──────────────────────────────────────────────── */}
      {restaurant && (
        <div className="relative bg-gradient-to-br from-gray-950 via-brand-950 to-gray-900 text-white px-4 py-10 text-center overflow-hidden">
          {/* Aurora blobs */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/4 w-64 h-64 bg-brand-600/25 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-brand-800/20 rounded-full blur-2xl" />
          </div>
          {/* Dot grid */}
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '28px 28px'
          }} />

          <div className="relative z-10">
            {restaurant.logoUrl ? (
              <img
                src={restaurant.logoUrl}
                alt={restaurant.name}
                className="w-24 h-24 rounded-3xl object-cover mx-auto mb-4 ring-4 ring-white/15 shadow-2xl shadow-black/50"
              />
            ) : (
              <div className="w-24 h-24 bg-gradient-to-br from-brand-500 to-brand-700 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-brand-600/40">
                <FaUtensils className="w-12 h-12 text-white" />
              </div>
            )}
            <h1 className="text-3xl font-black tracking-tight">{restaurant.name}</h1>
            {restaurant.address && (
              <p className="text-gray-400 text-sm mt-2 flex items-center justify-center gap-1.5">
                <FaMapMarkerAlt className="w-3.5 h-3.5" />
                {restaurant.address}
              </p>
            )}
            <div className="inline-flex items-center gap-2 mt-5 bg-white/10 backdrop-blur border border-white/15 rounded-full px-5 py-2.5 text-sm font-bold">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Table {tableNumber}
            </div>
          </div>
        </div>
      )}

      {/* ── Sticky Header ────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              {!restaurant && (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-gradient-to-br from-brand-500 to-brand-700 rounded-lg flex items-center justify-center">
                    <FaUtensils className="w-4 h-4 text-white" />
                  </div>
                  <h1 className="text-base font-black text-gray-900">Smart Order</h1>
                </div>
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

            <button
              onClick={() => setCartOpen(true)}
              className="relative flex items-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-sm hover:shadow-brand-500/25 hover:shadow-lg transition-all active:scale-[0.97]"
            >
              <FaShoppingCart className="w-4 h-4" />
              Cart
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-gray-900 text-white text-xs font-black w-5 h-5 rounded-full flex items-center justify-center animate-bounce-in">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto max-w-2xl mx-auto px-4 pb-3 pt-1 scrollbar-none">
          {categoryList.map(cat => (
            <button key={cat} onClick={() => {
              setActiveCategory(cat)
              // Scroll to items section top so user sees new category from top
              setTimeout(() => itemsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
            }}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                activeCategory === cat
                  ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-md shadow-brand-500/25'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-brand-300 hover:text-brand-600'
              }`}>
              <span>{CATEGORY_ICONS[cat] || '🍽️'}</span>
              <span>{cat}</span>
            </button>
          ))}
        </div>
      </header>

      {/* ── Menu Items ───────────────────────────────────────────────────── */}
      <main ref={itemsSectionRef} className="max-w-2xl mx-auto px-4 mt-5">
        {activeCategory && (
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="text-xl">{CATEGORY_ICONS[activeCategory] || '🍽️'}</span>
              <span>{activeCategory}</span>
              <span className="text-sm font-normal text-gray-400 ml-1">({(categories[activeCategory] || []).length})</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(categories[activeCategory] || []).map(item => (
                <MenuItemCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}
        {categoryList.length === 0 && (
          <div className="text-center py-24 text-gray-400">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <FaUtensils className="w-10 h-10 text-gray-300" />
            </div>
            <p className="font-semibold text-gray-500">Menu is being prepared</p>
            <p className="text-sm mt-1">Check back soon!</p>
          </div>
        )}
      </main>

      {/* ── Floating Cart Bar ────────────────────────────────────────────── */}
      {totalItems > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-30 animate-slide-up">
          <div className="max-w-lg mx-auto">
            <button
              onClick={() => setCartOpen(true)}
              className="w-full bg-gradient-to-r from-brand-700 to-brand-500 text-white py-4 px-5 rounded-2xl shadow-xl shadow-brand-600/30 hover:shadow-brand-600/50 transition-all active:scale-[0.98]"
            >
              <span className="flex items-center justify-between w-full font-semibold">
                <span className="bg-white/20 rounded-lg px-2.5 py-1 text-sm font-bold">{totalItems} item{totalItems > 1 ? 's' : ''}</span>
                <span className="flex items-center gap-2">
                  <FaShoppingCart className="w-4 h-4" />
                  View Cart
                </span>
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
