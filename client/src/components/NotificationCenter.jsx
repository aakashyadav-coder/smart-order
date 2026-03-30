/**
 * NotificationCenter — rebuilt with shadcn ScrollArea, Button, Badge
 * Bell icon dropdown with real-time socket events
 */
import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import socket from '../lib/socket'
import { FaBell, FaCheck, FaTrash, FaTicketAlt, FaTools, FaUser, FaExclamationTriangle } from 'react-icons/fa'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

const MAX_NOTIFS = 100

const TYPE_CONFIG = {
  ticket:      { icon: FaTicketAlt,          bg: 'bg-red-100',    text: 'text-red-600',    label: 'Support Ticket' },
  maintenance: { icon: FaTools,              bg: 'bg-amber-100',  text: 'text-amber-600',  label: 'Maintenance' },
  login:       { icon: FaUser,               bg: 'bg-green-100',  text: 'text-green-600',  label: 'User Login' },
  health:      { icon: FaExclamationTriangle,bg: 'bg-orange-100', text: 'text-orange-600', label: 'Health Alert' },
}

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export default function NotificationCenter() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [, setTick] = useState(0)
  const dropdownRef = useRef(null)

  const unreadCount = notifications.filter(n => !n.read).length

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Refresh timestamps every 30s
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  // Socket subscriptions
  useEffect(() => {
    const add = (type, title, body, action) => {
      setNotifications(prev => ([
        { id: `${type}-${Date.now()}-${Math.random()}`, type, title, body, action, ts: Date.now(), read: false },
        ...prev,
      ].slice(0, MAX_NOTIFS)))
    }

    const onTicket = d => add('ticket', 'New Support Ticket', `"${d.title || 'New ticket'}" from ${d.restaurant?.name || 'a restaurant'}`, '/super/tickets')
    const onMaint  = d => {
      if (d.active) add('maintenance', 'Maintenance Activated', d.message || 'Platform is now in maintenance mode', '/super/health')
      else add('maintenance', 'Maintenance Deactivated', 'Platform is back online', '/super/health')
    }
    const onLogin  = d => add('login', 'User Login', `${d.name || 'User'} (${d.role || ''}) signed in`, '/super/users')

    socket.on('support_ticket_new', onTicket)
    socket.on('maintenance_update', onMaint)
    socket.on('user_last_login', onLogin)

    return () => {
      socket.off('support_ticket_new', onTicket)
      socket.off('maintenance_update', onMaint)
      socket.off('user_last_login', onLogin)
    }
  }, [])

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  const markRead    = (id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  const clearAll    = () => setNotifications([])

  const handleClick = (n) => {
    markRead(n.id)
    if (n.action) navigate(n.action)
    setOpen(false)
  }

  const grouped = notifications.reduce((acc, n) => {
    const group = acc.find(g => g.type === n.type)
    if (group) group.items.push(n)
    else acc.push({ type: n.type, items: [n] })
    return acc
  }, [])

  return (
    <div ref={dropdownRef} className="relative">
      <Button
        variant="outline"
        size="icon"
        onClick={() => setOpen(o => !o)}
        className="relative w-9 h-9 rounded-xl"
        title="Notifications"
      >
        <FaBell className="w-4 h-4 text-gray-600" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1.5 -right-1.5 w-5 h-5 p-0 flex items-center justify-center text-[10px] font-black border-0 animate-bounce-in">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl border border-gray-200 shadow-2xl z-50 overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/80">
            <p className="text-sm font-extrabold text-gray-900">Notifications</p>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllRead}
                  className="text-xs text-brand-600 hover:text-brand-700 h-auto py-1 px-2 gap-1">
                  <FaCheck className="w-2.5 h-2.5" /> Mark all read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button variant="ghost" size="icon" onClick={clearAll}
                  className="w-6 h-6 text-gray-400 hover:text-red-500">
                  <FaTrash className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Body */}
          <ScrollArea className="max-h-96">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-300">
                <FaBell className="w-6 h-6 mb-2" />
                <p className="text-sm font-medium text-gray-400">No notifications yet</p>
                <p className="text-xs mt-1 text-gray-300">Events will appear here in real time</p>
              </div>
            ) : grouped.map((group, gi) => {
              const cfg = TYPE_CONFIG[group.type] || TYPE_CONFIG.ticket
              const GroupIcon = cfg.icon
              return (
                <div key={group.type}>
                  {gi > 0 && <Separator />}
                  {/* Group header */}
                  <div className="px-4 py-1.5 bg-gray-50/70">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                      <GroupIcon className={`w-2.5 h-2.5 ${cfg.text}`} /> {cfg.label} ({group.items.length})
                    </p>
                  </div>
                  {group.items.map(n => (
                    <button key={n.id} onClick={() => handleClick(n)}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${n.read ? 'hover:bg-gray-50' : 'bg-brand-50/40 hover:bg-brand-50'}`}>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.bg}`}>
                        <GroupIcon className={`w-3 h-3 ${cfg.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <p className={`text-xs font-bold leading-snug ${n.read ? 'text-gray-700' : 'text-gray-900'} truncate`}>{n.title}</p>
                          {!n.read && <span className="w-2 h-2 bg-brand-500 rounded-full flex-shrink-0 mt-0.5" />}
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5 truncate">{n.body}</p>
                        <p className="text-[10px] text-gray-300 mt-0.5">{timeAgo(n.ts)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )
            })}
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
