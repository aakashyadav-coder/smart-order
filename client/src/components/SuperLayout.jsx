/**
 * SuperLayout — Dark sidebar + content area for Super Admin
 * Upgraded: Sheet mobile sidebar, Avatar + user card, Badge nav items, Tooltip actions
 */
import React, { useEffect, useState } from 'react'
import { NavLink, useNavigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import socket from '../lib/socket'
import {
  FaThLarge, FaBuilding, FaUsers, FaClipboardList,
  FaCog, FaHeartbeat, FaSignOutAlt, FaShieldAlt, FaBars,
  FaBullhorn, FaInbox, FaChartBar, FaRocket, FaSearch, FaUserCog, FaHistory, FaFileUpload,
} from 'react-icons/fa'
import NotificationCenter from './NotificationCenter'
import ConfirmModal from './ConfirmModal'
import CommandPalette from './CommandPalette'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

/* ─── Navigation config ────────────────────────────────────────────── */
const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/super', label: 'Dashboard', icon: FaThLarge, end: true },
    ],
  },
  {
    label: 'Platform',
    items: [
      { to: '/super/onboarding', label: 'Onboarding', icon: FaRocket },
      { to: '/super/restaurants', label: 'Restaurants', icon: FaBuilding },
      { to: '/super/menu-upload', label: 'Menu Upload', icon: FaFileUpload },
      { to: '/super/users', label: 'Users', icon: FaUsers },
      { to: '/super/orders', label: 'All Orders', icon: FaClipboardList },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { to: '/super/revenue', label: 'Revenue BI', icon: FaChartBar },
      { to: '/super/logs', label: 'Audit Logs', icon: FaHistory },
      { to: '/super/health', label: 'Health', icon: FaHeartbeat },
    ],
  },
  {
    label: 'Communication',
    items: [
      { to: '/super/announcements', label: 'Announcements', icon: FaBullhorn },
      { to: '/super/tickets', label: 'Support', icon: FaInbox },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/super/features', label: 'Features', icon: FaCog },
      { to: '/super/settings', label: 'Settings', icon: FaUserCog },
    ],
  },
]

/* ─── Sidebar inner content (shared desktop + mobile) ──────────────── */
function SidebarContent({ onClose, userInitials, user, onPaletteOpen, onLogout }) {
  return (
    <div className="flex flex-col h-full">
      {/* Brand / Logo */}
      <div className="p-5 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl flex items-center justify-center shadow-lg shadow-brand-600/30 flex-shrink-0">
            <FaShieldAlt className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-extrabold text-white text-sm leading-none">Code Yatra</p>
            <p className="text-brand-400 text-xs font-semibold mt-0.5">Super Admin</p>
          </div>
        </div>
      </div>

      {/* Command palette shortcut */}
      <div className="px-3 pt-3">
        <button
          onClick={onPaletteOpen}
          className="w-full flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 bg-white/5 hover:bg-white/10 border border-white/[0.08] rounded-lg px-3 py-2 transition-all"
        >
          <FaSearch className="w-3 h-3 flex-shrink-0" />
          <span className="flex-1 text-left">Search...</span>
          <span className="bg-white/10 text-gray-400 px-1.5 py-0.5 rounded text-[10px] font-mono">⌘K</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto mt-1 scrollbar-none">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="nav-section-label">{group.label}</p>
            <div className="space-y-0.5 mb-1">
              {group.items.map(item => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `group relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${isActive
                        ? 'bg-white/[0.10] text-white'
                        : 'text-gray-400 hover:text-white hover:bg-white/[0.06]'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-400 rounded-r-full" />
                        )}
                        <Icon
                          className={`flex-shrink-0 transition-colors ${isActive ? 'text-brand-400' : 'text-gray-500 group-hover:text-gray-300'}`}
                          style={{ width: '16px', height: '16px' }}
                        />
                        <span className="flex-1">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <Separator className="bg-white/[0.08] mx-3 w-auto" />

      {/* User card + logout */}
      <div className="p-3 space-y-2">
        {/* User info */}
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.07]">
          <Avatar className="w-7 h-7 flex-shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-brand-600 to-brand-800 text-white text-[10px] font-bold">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-white text-xs font-bold truncate leading-none">{user?.name || 'Super Admin'}</p>
            <p className="text-gray-500 text-[10px] truncate mt-0.5">{user?.email || ''}</p>
          </div>
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0.5 bg-brand-900/60 text-brand-300 border-brand-700/40 flex-shrink-0">
            ADMIN
          </Badge>
        </div>

        <Button
          variant="ghost"
          onClick={onLogout}
          className="w-full justify-start gap-3 text-gray-400 hover:text-white hover:bg-white/[0.08] font-semibold text-sm h-9"
        >
          <FaSignOutAlt className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}

/* ─── Main Layout ───────────────────────────────────────────────────── */
export default function SuperLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const userInitials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'SA'

  useEffect(() => {
    socket.connect()
    socket.emit('join_super_admin')
    const onConnect = () => socket.emit('join_super_admin')
    socket.on('connect', onConnect)
    return () => socket.off('connect', onConnect)
  }, [])

  // Ctrl+K / ⌘K global shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen(p => !p)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const handleLogout = () => setConfirmOpen(true)
  const doLogout = () => { logout(); navigate('/super/login') }

  const sidebarProps = {
    user,
    userInitials,
    onClose: () => setSidebarOpen(false),
    onPaletteOpen: () => setPaletteOpen(true),
    onLogout: handleLogout,
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-gray-50 overflow-hidden">

        {/* ── Desktop Sidebar ────────────────────────────────────────── */}
        <aside className="hidden lg:flex w-56 flex-col bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 border-r border-white/[0.08] flex-shrink-0 shadow-xl">
          <SidebarContent {...sidebarProps} onClose={undefined} />
        </aside>

        {/* ── Mobile Sidebar (Sheet) ──────────────────────────────────── */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent
            side="left"
            className="w-56 p-0 border-r border-white/[0.08] [&>button]:hidden"
            style={{ background: 'linear-gradient(180deg, #030712 0%, #0f172a 50%, #030712 100%)' }}
          >
            <SidebarContent {...sidebarProps} />
          </SheetContent>
        </Sheet>

        {/* ── Main content ────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Topbar */}
          <header className="super-topbar px-4 py-3 flex items-center gap-3 shadow-sm relative z-40">
            {/* Mobile hamburger */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-xl"
                >
                  <FaBars className="w-4 h-4 text-gray-600" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open navigation</TooltipContent>
            </Tooltip>

            <span className="font-bold text-gray-900 text-sm lg:hidden">Super Admin</span>

            {/* Desktop search */}
            <button
              onClick={() => setPaletteOpen(true)}
              className="hidden lg:flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-xl px-3 py-2 transition-all group"
            >
              <FaSearch className="w-3 h-3 group-hover:scale-110 transition-transform" />
              <span>Search anything...</span>
              <span className="bg-white border border-gray-200 text-gray-400 px-1.5 py-0.5 rounded text-[10px] font-mono ml-1">⌘K</span>
            </button>

            {/* Right section */}
            <div className="ml-auto flex items-center gap-2">
              <NotificationCenter />

              {/* Avatar — opens settings */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => navigate('/super/settings')}
                    className="focus:outline-none focus:ring-2 focus:ring-brand-400 rounded-full"
                  >
                    <Avatar className="w-9 h-9 ring-2 ring-transparent hover:ring-brand-300 transition-all cursor-pointer">
                      <AvatarFallback className="bg-gradient-to-br from-brand-500 to-brand-700 text-white text-xs font-bold">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </TooltipTrigger>
                <TooltipContent>{user?.name || 'Super Admin'}</TooltipContent>
              </Tooltip>


            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden super-shell p-6 relative">
            <div className="super-bg" />
            <div className="relative z-10">
              <Outlet />
            </div>
          </main>
        </div>

        {/* Global Command Palette */}
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

        {/* Sign-out confirmation */}
        <ConfirmModal
          open={confirmOpen}
          title="Sign Out?"
          message="Sign out of the Super Admin portal?"
          confirmLabel="Sign Out"
          type="danger"
          onConfirm={doLogout}
          onCancel={() => setConfirmOpen(false)}
        />
      </div>
    </TooltipProvider>
  )
}
