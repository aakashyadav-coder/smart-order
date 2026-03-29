/**
 * LoadingSpinner — Branded full-screen loader
 * Theme: White bg with animated brand logo
 */
import React from 'react'
import { FaUtensils } from 'react-icons/fa'

export default function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-5 animate-fade-in">
        <div className="relative">
          <div className="w-16 h-16 bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl flex items-center justify-center shadow-xl shadow-brand-600/30">
            <FaUtensils className="w-8 h-8 text-white" />
          </div>
          <div className="absolute -inset-2 border-2 border-brand-400/30 rounded-3xl animate-ping-slow" />
        </div>
        <div className="text-center">
          <p className="text-gray-800 font-bold text-sm">Code Yatra</p>
          <p className="text-gray-400 text-xs mt-1">Loading…</p>
        </div>
      </div>
    </div>
  )
}
