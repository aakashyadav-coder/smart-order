/**
 * App.jsx — Root router
 * Defines all client-side routes
 */
import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import MenuPage from './pages/MenuPage'
import OrderConfirmationPage from './pages/OrderConfirmationPage'
import KitchenLoginPage from './pages/KitchenLoginPage'
import KitchenDashboardPage from './pages/KitchenDashboardPage'
import QRGeneratorPage from './pages/QRGeneratorPage'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      {/* Customer routes */}
      <Route path="/menu" element={<MenuPage />} />
      <Route path="/order/:id" element={<OrderConfirmationPage />} />

      {/* Kitchen staff */}
      <Route path="/kitchen/login" element={<KitchenLoginPage />} />
      <Route
        path="/kitchen"
        element={
          <ProtectedRoute>
            <KitchenDashboardPage />
          </ProtectedRoute>
        }
      />

      {/* Admin — QR code generator */}
      <Route
        path="/admin/qr"
        element={
          <ProtectedRoute>
            <QRGeneratorPage />
          </ProtectedRoute>
        }
      />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/menu?table=1" replace />} />
      <Route path="*" element={<Navigate to="/menu?table=1" replace />} />
    </Routes>
  )
}
