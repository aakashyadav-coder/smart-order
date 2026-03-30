/**
 * CommandPalette — rebuilt with shadcn CommandDialog
 * Global ⌘K / Ctrl+K search across Super Admin
 */
import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { FaBuilding, FaUsers, FaShoppingBag } from 'react-icons/fa'
import { ArrowRight, Loader2 } from 'lucide-react'
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandSeparator,
} from '@/components/ui/command'
import { Badge } from '@/components/ui/badge'

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

const STATUS_VARIANT = {
  PENDING:   'pending',
  PREPARING: 'preparing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  ACCEPTED:  'accepted',
}

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate()
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const debouncedQuery = useDebounce(query, 220)

  // Reset on open
  useEffect(() => {
    if (open) { setQuery(''); setResults(null) }
  }, [open])

  // Fetch results
  useEffect(() => {
    if (!open || debouncedQuery.length < 2) { setResults(null); return }
    setLoading(true)
    api.get(`/super/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then(r => setResults(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [debouncedQuery, open])

  const go = useCallback((path) => { navigate(path); onClose() }, [navigate, onClose])

  const hasResults = results && (results.restaurants?.length || results.users?.length || results.orders?.length)

  return (
    <CommandDialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <div className="relative">
        <CommandInput
          placeholder="Search restaurants, users, orders…"
          value={query}
          onValueChange={setQuery}
        />
        {loading && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-500 animate-spin" />
        )}
      </div>

      <CommandList>
        {!query && (
          <div className="px-4 py-8 text-center text-gray-400">
            <FaBuilding className="w-6 h-6 mx-auto mb-2 text-gray-300" />
            <p className="text-sm font-medium">Start typing to search</p>
            <p className="text-xs mt-1">Restaurants · Users · Orders</p>
          </div>
        )}

        {query.length === 1 && (
          <CommandEmpty>Type at least 2 characters…</CommandEmpty>
        )}

        {results && !hasResults && query.length >= 2 && (
          <CommandEmpty>No results for "{query}"</CommandEmpty>
        )}

        {/* Restaurants */}
        {results?.restaurants?.length > 0 && (
          <CommandGroup heading="Restaurants">
            {results.restaurants.map(r => (
              <CommandItem key={r.id} onSelect={() => go(`/super/restaurants/${r.id}`)}>
                <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FaBuilding className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.active ? '🟢 Active' : '🔴 Inactive'}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results?.restaurants?.length > 0 && results?.users?.length > 0 && <CommandSeparator />}

        {/* Users */}
        {results?.users?.length > 0 && (
          <CommandGroup heading="Users">
            {results.users.map(u => (
              <CommandItem key={u.id} onSelect={() => go('/super/users')}>
                <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm">
                  {u.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{u.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email} · {u.role}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results?.users?.length > 0 && results?.orders?.length > 0 && <CommandSeparator />}

        {/* Orders */}
        {results?.orders?.length > 0 && (
          <CommandGroup heading="Orders">
            {results.orders.map(o => (
              <CommandItem key={o.id} onSelect={() => go('/super/orders')}>
                <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FaShoppingBag className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold font-mono">#{o.id.slice(-8).toUpperCase()}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {o.restaurant?.name || '—'} · Rs. {(o.totalPrice || 0).toLocaleString()}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[o.status] || 'outline'} className="text-[10px] flex-shrink-0">
                  {o.status}
                </Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 flex items-center gap-4 text-[10px] text-gray-400 font-medium">
        <span><kbd className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-mono text-[10px]">↵</kbd> Select</span>
        <span><kbd className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-mono text-[10px]">Esc</kbd> Close</span>
        <span className="ml-auto">Code Yatra Global Search</span>
      </div>
    </CommandDialog>
  )
}
