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
import SuperLoginPage        from './pages/super/SuperLoginPage'
import SuperDashboardPage    from './pages/super/SuperDashboardPage'
import RestaurantsPage       from './pages/super/RestaurantsPage'
import RestaurantDetailPage  from './pages/super/RestaurantDetailPage'
import UsersPage             from './pages/super/UsersPage'
import FeaturesPage          from './pages/super/FeaturesPage'
import GlobalOrdersPage      from './pages/super/GlobalOrdersPage'
import ActivityLogsPage      from './pages/super/ActivityLogsPage'
import HealthPage            from './pages/super/HealthPage'
import AnnouncementsPage     from './pages/super/AnnouncementsPage'
import SupportTicketsPage    from './pages/super/SupportTicketsPage'
import RevenuePage           from './pages/super/RevenuePage'
import OnboardingPage        from './pages/super/OnboardingPage'
import SettingsPage          from './pages/super/SettingsPage'

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
        <Route index                       element={<SuperDashboardPage />} />
        <Route path="restaurants"          element={<RestaurantsPage />} />
        <Route path="restaurants/:id"      element={<RestaurantDetailPage />} />
        <Route path="users"                element={<UsersPage />} />
        <Route path="orders"               element={<GlobalOrdersPage />} />
        <Route path="features"             element={<FeaturesPage />} />
        <Route path="logs"                 element={<ActivityLogsPage />} />
        <Route path="health"               element={<HealthPage />} />
        <Route path="announcements"        element={<AnnouncementsPage />} />
        <Route path="tickets"              element={<SupportTicketsPage />} />
        <Route path="revenue"              element={<RevenuePage />} />
        <Route path="onboarding"           element={<OnboardingPage />} />
        <Route path="settings"             element={<SettingsPage />} />
      </Route>

      {/* ── 404 ──────────────────────────────────────────────── */}
      <Route path="*" element={
        <div className="min-h-screen bg-gray-950 flex items-center justify-center flex-col gap-4">
          <div className="text-7xl font-black text-gray-800 tracking-tighter">404</div>
          <p className="text-gray-500 font-medium">Page not found</p>
          <a href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-brand-500 px-5 py-2.5 rounded-xl hover:from-brand-700 hover:to-brand-600 transition-all mt-2">
            Go home →
          </a>
        </div>
      } />
    </Routes>
  )
}
