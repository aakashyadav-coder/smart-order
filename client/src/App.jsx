/**
 * App.jsx — main router
 * Customer:    /menu, /order/:id
 * Kitchen:     /kitchen/login, /kitchen
 * Owner:       /owner/login, /owner
 * Super Admin: /super/login, /super/*
 */
import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

// Customer pages
import MenuPage               from './pages/MenuPage'
import OrderConfirmationPage  from './pages/OrderConfirmationPage'

// Kitchen pages
import KitchenLoginPage     from './pages/KitchenLoginPage'
import KitchenDashboardPage from './pages/KitchenDashboardPage'

// Owner pages
import OwnerLoginPage     from './pages/OwnerLoginPage'
import OwnerDashboardPage from './pages/OwnerDashboardPage'

// Super Admin pages
import SuperLoginPage     from './pages/super/SuperLoginPage'
import SuperDashboardPage from './pages/super/SuperDashboardPage'
import RestaurantsPage    from './pages/super/RestaurantsPage'
import UsersPage          from './pages/super/UsersPage'
import FeaturesPage       from './pages/super/FeaturesPage'
import GlobalOrdersPage   from './pages/super/GlobalOrdersPage'
import ActivityLogsPage   from './pages/super/ActivityLogsPage'

// Route guards & layouts
import ProtectedRoute  from './components/ProtectedRoute'
import OwnerRoute      from './components/OwnerRoute'
import SuperAdminRoute from './components/SuperAdminRoute'
import SuperLayout     from './components/SuperLayout'

export default function App() {
  return (
    <Routes>
      {/* ── Customer ─────────────────────────────────── */}
      <Route path="/"          element={<Navigate to="/menu" replace />} />
      <Route path="/menu"      element={<MenuPage />} />
      <Route path="/order/:id" element={<OrderConfirmationPage />} />

      {/* ── Kitchen Staff ─────────────────────────────── */}
      <Route path="/kitchen/login" element={<KitchenLoginPage />} />
      <Route path="/kitchen" element={
        <ProtectedRoute><KitchenDashboardPage /></ProtectedRoute>
      } />

      {/* ── Owner / Admin ─────────────────────────────── */}
      <Route path="/owner/login" element={<OwnerLoginPage />} />
      <Route path="/owner" element={
        <OwnerRoute><OwnerDashboardPage /></OwnerRoute>
      } />

      {/* ── Super Admin ───────────────────────────────── */}
      <Route path="/super/login" element={<SuperLoginPage />} />
      <Route path="/super" element={
        <SuperAdminRoute><SuperLayout /></SuperAdminRoute>
      }>
        <Route index              element={<SuperDashboardPage />} />
        <Route path="restaurants" element={<RestaurantsPage />} />
        <Route path="users"       element={<UsersPage />} />
        <Route path="orders"      element={<GlobalOrdersPage />} />
        <Route path="features"    element={<FeaturesPage />} />
        <Route path="logs"        element={<ActivityLogsPage />} />
      </Route>

      {/* ── 404 ──────────────────────────────────────── */}
      <Route path="*" element={
        <div className="min-h-screen bg-gray-950 flex items-center justify-center flex-col gap-4">
          <div className="text-6xl font-black text-gray-800">404</div>
          <p className="text-gray-400">Page not found</p>
          <a href="/" className="text-brand-500 hover:underline text-sm">Go home →</a>
        </div>
      } />
    </Routes>
  )
}

