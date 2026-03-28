/**
 * RestaurantDetailPage - deep profile: hours, tables, staff, revenue, QR codes
 */
import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import { FaArrowLeft, FaQrcode, FaDownload, FaMapMarkerAlt, FaPhoneAlt, FaCheckCircle, FaTimesCircle } from 'react-icons/fa'

const DAY_LABELS = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' }
const ROLE_COLORS = { OWNER: 'badge-accepted', KITCHEN: 'badge-preparing', ADMIN: 'badge-pending' }

function fmtDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
}

function downloadQR(tableNumber, restaurantId, restaurantName) {
  const baseUrl = window.location.origin
  const url = `${baseUrl}/menu/${restaurantId}?table=${tableNumber}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`
  const a = document.createElement('a')
  a.href = qrUrl
  a.download = `${restaurantName}_Table${tableNumber}_QR.png`
  a.target = '_blank'
  a.click()
}

export default function RestaurantDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')

  useEffect(() => {
    api.get(`/super/restaurants/${id}`)
      .then(r => setRestaurant(r.data))
      .catch(() => navigate('/super/restaurants'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!restaurant) return null

  const r = restaurant
  const hours = r.openingHours || {}
  const tableCount = r.tableCount || 0
  const tables = tableCount > 0 ? Array.from({ length: tableCount }, (_, i) => i + 1) : []

  const StatCard = ({ label, value, color = 'text-gray-900' }) => (
    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
      <p className="text-gray-400 text-xs font-medium">{label}</p>
      <p className={`text-2xl font-extrabold mt-1 ${color}`}>{value}</p>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <button onClick={() => navigate('/super/restaurants')} className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors mt-0.5">
          <FaArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-extrabold text-gray-900">{r.name}</h1>
            <span className={`badge text-xs ${r.active ? 'badge-completed' : 'badge-cancelled'}`}>{r.active ? 'Active' : 'Inactive'}</span>
            {r.cuisineType && <span className="text-xs bg-brand-50 text-brand-600 border border-brand-200 px-2 py-0.5 rounded-full font-medium">{r.cuisineType}</span>}
          </div>
          {r.address && (
            <p className="text-gray-400 text-sm mt-1 inline-flex items-center gap-1.5">
              <FaMapMarkerAlt className="w-3.5 h-3.5" /> {r.address}
            </p>
          )}
          {r.phone && (
            <p className="text-gray-400 text-sm inline-flex items-center gap-1.5">
              <FaPhoneAlt className="w-3.5 h-3.5" /> {r.phone}
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'hours', label: 'Hours' },
          { key: 'tables', label: `QR Tables (${tableCount})` },
          { key: 'staff', label: `Staff (${r.users?.length || 0})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Total Revenue" value={`Rs. ${(r.totalRevenue || 0).toLocaleString()}`} color="text-green-600" />
            <StatCard label="Total Orders" value={r._count?.orders || 0} />
            <StatCard label="Menu Items" value={r._count?.menuItems || 0} />
            <StatCard label="Staff Members" value={r._count?.users || 0} />
          </div>
          <div className="super-card p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-3">Onboarding Checklist</h3>
            <div className="space-y-2">
              {[
                { label: 'Menu items added', done: (r._count?.menuItems || 0) > 0 },
                { label: 'Staff accounts created', done: (r._count?.users || 0) > 0 },
                { label: 'First order received', done: (r._count?.orders || 0) > 0 },
                { label: 'Table count configured', done: !!r.tableCount },
                { label: 'Opening hours set', done: !!r.openingHours },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2.5">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${item.done ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                    {item.done ? <FaCheckCircle className="w-3 h-3" /> : <FaTimesCircle className="w-3 h-3" />}
                  </span>
                  <span className={`text-sm ${item.done ? 'text-gray-700' : 'text-gray-400'}`}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Opening Hours */}
      {tab === 'hours' && (
        <div className="super-card p-5 shadow-sm max-w-md">
          <h3 className="font-bold text-gray-900 mb-4">Opening Hours</h3>
          {Object.keys(DAY_LABELS).length === 0 || !r.openingHours ? (
            <p className="text-gray-400 text-sm">No hours configured yet. Edit the restaurant to set hours.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(DAY_LABELS).map(([day, label]) => {
                const h = hours[day]
                return (
                  <div key={day} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm font-medium text-gray-700 w-24">{label}</span>
                    {h?.closed ? (
                      <span className="text-xs text-red-400 font-medium">Closed</span>
                    ) : h ? (
                      <span className="text-sm text-gray-600">{h.open} - {h.close}</span>
                    ) : (
                      <span className="text-xs text-gray-300">-</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* QR Codes per Table */}
      {tab === 'tables' && (
        <div>
          {tableCount === 0 ? (
            <div className="super-card p-8 text-center shadow-sm">
              <FaQrcode className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No table count configured</p>
              <p className="text-gray-400 text-sm mt-1">Edit the restaurant to set number of tables</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {tables.map(num => {
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${window.location.origin}/menu/${r.id}?table=${num}`)}`
                return (
                  <div key={num} className="super-card p-3 flex flex-col items-center gap-2 shadow-sm hover:shadow-md transition-shadow">
                    <img src={qrUrl} alt={`Table ${num}`} className="w-24 h-24 rounded-lg" />
                    <span className="text-xs font-bold text-gray-700">Table {num}</span>
                    <button
                      onClick={() => downloadQR(num, r.id, r.name)}
                      className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
                    >
                      <FaDownload className="w-3 h-3" /> Download
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Staff */}
      {tab === 'staff' && (
        <div className="super-card overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Name', 'Email', 'Role', 'Status', 'Last Login'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(r.users || []).length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-gray-400">No staff yet</td></tr>
              ) : r.users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{u.email}</td>
                  <td className="px-4 py-3"><span className={`badge text-xs ${ROLE_COLORS[u.role] || 'badge-pending'}`}>{u.role}</span></td>
                  <td className="px-4 py-3"><span className={`badge text-xs ${u.active ? 'badge-completed' : 'badge-cancelled'}`}>{u.active ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(u.lastLoginAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

