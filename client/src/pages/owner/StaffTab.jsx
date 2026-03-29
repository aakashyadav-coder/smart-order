// StaffTab.jsx
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


export function StaffTab() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { api.get('/restaurant/staff').then(r => setUsers(r.data)).catch(() => setUsers([])).finally(() => setLoading(false)) }, [])
  const ROLE = { OWNER: 'bg-brand-50 text-brand-700 border-brand-200', KITCHEN: 'bg-blue-50 text-blue-700 border-blue-200', ADMIN: 'bg-purple-50 text-purple-700 border-purple-200' }
  return (
    <div className="max-w-2xl">
      {loading && <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4"><div className="relative overflow-hidden w-10 h-10 bg-gray-100 rounded-full"><div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" /></div><div className="flex-1 space-y-2"><div className="relative overflow-hidden h-3.5 w-32 bg-gray-100 rounded"><div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" /></div><div className="relative overflow-hidden h-2.5 w-48 bg-gray-100 rounded"><div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" /></div></div></div>)}</div>}
      {!loading && users.length === 0 && <div className="text-center py-16"><FaUsers className="w-12 h-12 mx-auto mb-3 text-gray-200" /><p className="font-semibold text-gray-500">No staff yet</p><p className="text-gray-400 text-sm mt-1">Add staff from Super Admin portal</p></div>}
      {!loading && users.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {users.map((u, i) => (
            <div key={u.id} className={`flex items-center gap-4 px-5 py-4 ${i > 0 ? 'border-t border-gray-50' : ''} hover:bg-gray-50 transition-colors`}>
              <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-700 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">{u.name[0].toUpperCase()}</div>
              <div className="flex-1 min-w-0"><p className="font-semibold text-gray-900 text-sm">{u.name}</p><p className="text-gray-400 text-xs truncate">{u.email}</p></div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${ROLE[u.role] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>{u.role}</span>
                <span className={`text-xs px-2.5 py-1 rounded-full border ${u.active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>{u.active ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}



