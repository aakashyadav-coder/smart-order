/**
 * CommandPalette — Global ⌘K / Ctrl+K search
 * Press Ctrl+K anywhere in the Super Admin dashboard to open
 */
import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { FaSearch, FaBuilding, FaUsers, FaShoppingBag, FaTimes, FaArrowRight } from 'react-icons/fa'

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

const STATUS_COLOR = {
  PENDING:    'bg-yellow-100 text-yellow-700',
  PREPARING:  'bg-blue-100 text-blue-700',
  READY:      'bg-indigo-100 text-indigo-700',
  SERVED:     'bg-purple-100 text-purple-700',
  PAID:       'bg-green-100 text-green-700',
  CANCELLED:  'bg-red-100 text-red-700',
}

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate()
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)
  const debouncedQuery = useDebounce(query, 220)

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery(''); setResults(null)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Fetch search results
  useEffect(() => {
    if (!open) return
    if (debouncedQuery.length < 2) { setResults(null); return }
    setLoading(true)
    api.get(`/super/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then(r => setResults(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [debouncedQuery, open])

  const go = useCallback((path) => { navigate(path); onClose() }, [navigate, onClose])

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!open) return null

  const hasResults = results && (results.restaurants?.length || results.users?.length || results.orders?.length)

  return (
    <div className="fixed inset-0 z-[999] flex items-start justify-center pt-[10vh] px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Palette panel */}
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
          <FaSearch className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search restaurants, users, orders…"
            className="flex-1 bg-transparent text-gray-900 text-sm font-medium outline-none placeholder-gray-400"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {loading && <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />}
          <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 flex-shrink-0">
            <FaTimes className="w-3 h-3 text-gray-500" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {!query && (
            <div className="px-4 py-8 text-center text-gray-400">
              <FaSearch className="w-6 h-6 mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-medium">Start typing to search</p>
              <p className="text-xs mt-1">Restaurants · Users · Orders</p>
            </div>
          )}

          {query.length === 1 && (
            <div className="px-4 py-5 text-center text-gray-400 text-sm">Type at least 2 characters…</div>
          )}

          {results && !hasResults && (
            <div className="px-4 py-8 text-center text-gray-400">
              <p className="text-sm font-medium">No results for "<span className="text-gray-700">{query}</span>"</p>
            </div>
          )}

          {/* Restaurants */}
          {results?.restaurants?.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                  <FaBuilding className="w-3 h-3" /> Restaurants
                </p>
              </div>
              {results.restaurants.map(r => (
                <button key={r.id} onClick={() => go(`/super/restaurants/${r.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-brand-50 transition-colors group text-left">
                  <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FaBuilding className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{r.name}</p>
                    <p className="text-xs text-gray-400">{r.active ? '🟢 Active' : '🔴 Inactive'}</p>
                  </div>
                  <FaArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-brand-500 transition-colors flex-shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* Users */}
          {results?.users?.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-gray-50 border-b border-t border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                  <FaUsers className="w-3 h-3" /> Users
                </p>
              </div>
              {results.users.map(u => (
                <button key={u.id} onClick={() => go('/super/users')}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-brand-50 transition-colors group text-left">
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm">
                    {u.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{u.name}</p>
                    <p className="text-xs text-gray-400 truncate">{u.email} · {u.role}</p>
                  </div>
                  <FaArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-brand-500 transition-colors flex-shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* Orders */}
          {results?.orders?.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-gray-50 border-b border-t border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                  <FaShoppingBag className="w-3 h-3" /> Orders
                </p>
              </div>
              {results.orders.map(o => (
                <button key={o.id} onClick={() => go('/super/orders')}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-brand-50 transition-colors group text-left">
                  <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FaShoppingBag className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 font-mono">#{o.id.slice(-8).toUpperCase()}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {o.restaurant?.name || '—'} · Rs. {(o.totalPrice || 0).toLocaleString()}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLOR[o.status] || 'bg-gray-100 text-gray-600'}`}>
                    {o.status}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 flex items-center gap-4 text-[10px] text-gray-400 font-medium">
          <span><kbd className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-mono text-[10px]">↵</kbd> Select</span>
          <span><kbd className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-mono text-[10px]">Esc</kbd> Close</span>
          <span className="ml-auto">Code Yatra Global Search</span>
        </div>
      </div>
    </div>
  )
}
