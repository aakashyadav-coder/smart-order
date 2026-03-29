/**
 * Cart Context — manages cart state across the app
 * Cart is persisted to localStorage so a page refresh doesn't wipe items.
 */
import React, { createContext, useContext, useReducer, useEffect } from 'react'
import toast from 'react-hot-toast'

const CartContext = createContext(null)

const STORAGE_KEY = 'smart_order_cart'

function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { items: [] }
    return JSON.parse(raw)
  } catch {
    return { items: [] }
  }
}

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find(i => i.menuItemId === action.item.menuItemId)
      if (existing) {
        return {
          ...state,
          items: state.items.map(i =>
            i.menuItemId === action.item.menuItemId
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        }
      }
      return { ...state, items: [...state.items, { ...action.item, quantity: 1 }] }
    }
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter(i => i.menuItemId !== action.menuItemId) }
    case 'UPDATE_QUANTITY': {
      if (action.quantity <= 0) {
        return { ...state, items: state.items.filter(i => i.menuItemId !== action.menuItemId) }
      }
      return {
        ...state,
        items: state.items.map(i =>
          i.menuItemId === action.menuItemId ? { ...i, quantity: action.quantity } : i
        ),
      }
    }
    case 'CLEAR':
      return { items: [] }
    default:
      return state
  }
}

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, undefined, loadCart)

  // Persist every change to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch { /* ignore quota errors */ }
  }, [state])

  const addItem = (item) => {
    dispatch({ type: 'ADD_ITEM', item })
    toast.success(`${item.name} added to cart`, { icon: '🛒' })
  }

  const removeItem = (menuItemId) => dispatch({ type: 'REMOVE_ITEM', menuItemId })

  const updateQuantity = (menuItemId, quantity) => {
    dispatch({ type: 'UPDATE_QUANTITY', menuItemId, quantity })
  }

  const clearCart = () => dispatch({ type: 'CLEAR' })

  const totalItems = state.items.reduce((s, i) => s + i.quantity, 0)
  const totalPrice = state.items.reduce((s, i) => s + i.price * i.quantity, 0)

  return (
    <CartContext.Provider value={{ items: state.items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
