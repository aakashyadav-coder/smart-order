/**
 * SuperLayout — Dark sidebar + content area for Super Admin
 */
import React, { useState } from 'react'
import { NavLink, useNavigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  FaThLarge, FaBuilding, FaUsers, FaClipboardList,
  FaCog, FaHeartbeat, FaSignOutAlt, FaShieldAlt, FaBars,
  FaBullhorn, FaInbox,
} from 'react-icons/fa'

const NAV_ITEMS = [
  { to: '/super',              label: 'Dashboard',    icon: FaThLarge,      end: true },
  { to: '/super/restaurants',  label: 'Restaurants',  icon: FaBuilding },
  { to: '/super/users',        label: 'Users',        icon: FaUsers },
  { to: '/super/orders',       label: 'All Orders',   icon: FaClipboardList },
  { to: '/super/features',     label: 'Features',     icon: FaCog },
  { to: '/super/logs',         label: 'Audit Logs',   icon: FaHeartbeat },
  { to: '/super/health',       label: 'Health',       icon: FaHeartbeat },
  { to: '/super/announcements',label: 'Announcements',icon: FaBullhorn },
  { to: '/super/tickets',      label: 'Support',      icon: FaInbox },
]

export default function SuperLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/super/login') }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-white/8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl flex items-center justify-center shadow-lg shadow-brand-600/30">
            <FaShieldAlt className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-extrabold text-white text-sm leading-none">Smart Order</p>
            <p className="text-brand-400 text-xs font-semibold mt-0.5">Super Admin</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/8'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-white'}`} style={{ width: '18px', height: '18px' }} />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-white/8">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-700 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {user?.name?.[0]?.toUpperCase() || 'S'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate leading-none">{user?.name}</p>
            <p className="text-gray-500 text-xs truncate mt-0.5">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 text-xs text-gray-500 hover:text-brand-400 transition-colors py-2 px-2 rounded-lg hover:bg-white/8 font-medium"
        >
          <FaSignOutAlt className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex w-56 flex-col bg-gray-950 border-r border-white/8 flex-shrink-0 shadow-xl">
        <SidebarContent />
      </aside>

      {/* Sidebar (mobile) */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-56 bg-gray-950 border-r border-white/8 flex flex-col transform transition-transform duration-300 ease-out lg:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar (mobile) */}
        <header className="lg:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 shadow-sm">
          <button onClick={() => setSidebarOpen(true)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
            <FaBars className="w-4 h-4 text-gray-600" />
          </button>
          <span className="font-bold text-gray-900 text-sm">Super Admin</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
