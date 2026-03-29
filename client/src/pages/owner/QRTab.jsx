// QRTab.jsx
import React, { useEffect, useState, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import Heatmap from './Heatmap'
import {
  FaChartLine, FaClipboardList, FaUtensils, FaUsers,
  FaTimesCircle, FaCheckCircle, FaPrint, FaPlus, FaTrash, FaInbox, FaPaperPlane
} from 'react-icons/fa'
import {
  StatCardSkeleton, ChartSkeleton, OrderRowSkeleton, MenuSkeleton
} from '../../components/Skeleton'


// ── QR Tab ─────────────────────────────────────────────────────────────────────
export function QRTab({ restaurantId }) {
  const [baseUrl, setBaseUrl] = useState(window.location.origin)
  const [tables, setTables] = useState(10)

  // Fix #41: Guard against missing restaurantId — generates broken ?rid=null otherwise
  if (!restaurantId) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
        <p className="text-amber-700 font-bold text-base">No restaurant linked to your account.</p>
        <p className="text-amber-600 text-sm mt-1">Contact your Super Admin to link a restaurant before generating QR codes.</p>
      </div>
    )
  }

  const qrUrl = t => `${baseUrl}/menu?table=${t}&rid=${restaurantId}`
  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-wrap gap-4 items-end">
        <div><label className="label">Base URL</label><input className="input w-64 text-sm" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} /></div>
        <div><label className="label">Tables</label><input type="number" min={1} max={100} className="input w-24 text-sm" value={tables} onChange={e => setTables(parseInt(e.target.value) || 1)} /></div>
        <button onClick={() => window.print()} className="btn-primary px-5 py-2.5 text-sm print:hidden"><FaPrint className="w-4 h-4" /> Print All</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
        {Array.from({ length: tables }, (_, i) => i + 1).map(t => (
          <div key={t} className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col items-center gap-2.5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 shadow-sm">
            <p className="font-extrabold text-gray-900 text-sm">Table {t}</p>
            <div className="bg-gray-50 p-2 rounded-xl border border-gray-100"><QRCodeSVG value={qrUrl(t)} size={100} bgColor="#f9fafb" fgColor="#111111" level="M" /></div>
            <p className="text-gray-400 text-[9px] text-center break-all leading-tight">/menu?table={t}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

