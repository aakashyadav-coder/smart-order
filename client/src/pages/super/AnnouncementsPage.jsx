/**
 * AnnouncementsPage - super admin broadcasts to restaurant owners
 */
import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { FaBullhorn, FaPaperPlane, FaTrash, FaBuilding } from 'react-icons/fa'

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([])
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title: '', message: '', restaurantId: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/super/announcements'),
      api.get('/super/restaurants'),
    ]).then(([a, r]) => {
      setAnnouncements(a.data)
      setRestaurants(r.data)
    }).finally(() => setLoading(false))
  }, [])

  const handleSend = async () => {
    if (!form.title.trim() || !form.message.trim()) return toast.error('Title and message required')
    setSaving(true)
    try {
      const res = await api.post('/super/announcements', {
        title: form.title,
        message: form.message,
        restaurantId: form.restaurantId || null,
      })
      setAnnouncements(p => [res.data, ...p])
      setForm({ title: '', message: '', restaurantId: '' })
      toast.success('Announcement sent!')
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return
    try {
      await api.delete(`/super/announcements/${id}`)
      setAnnouncements(p => p.filter(a => a.id !== id))
      toast.success('Deleted')
    } catch (e) { toast.error(e.message) }
  }

  const fmt = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-sm">
          <FaBullhorn className="w-4 h-4" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Announcements</h1>
          <p className="text-gray-400 text-sm mt-1">Broadcast messages to restaurant owners</p>
        </div>
      </div>

      {/* Compose */}
      <div className="super-card p-5 shadow-sm mb-6">
        <h2 className="text-sm font-extrabold text-gray-900 mb-4 flex items-center gap-2">
          <FaBullhorn className="text-brand-600 w-4 h-4" /> New Announcement
        </h2>
        <div className="space-y-3">
          <div>
            <label className="label text-gray-600 text-xs">Title *</label>
            <input type="text" placeholder="e.g. Scheduled Maintenance on Saturday"
              className="input bg-white border-gray-200 text-gray-900 text-sm"
              value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          </div>
          <div>
            <label className="label text-gray-600 text-xs">Message *</label>
            <textarea rows={3} placeholder="Write your message here..."
              className="input bg-white border-gray-200 text-gray-900 text-sm resize-none"
              value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} />
          </div>
          <div>
            <label className="label text-gray-600 text-xs">Target (optional)</label>
            <select className="input bg-white border-gray-200 text-gray-900 text-sm"
              value={form.restaurantId} onChange={e => setForm(p => ({ ...p, restaurantId: e.target.value }))}>
              <option value="">Broadcast to all restaurants</option>
              {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end">
            <button onClick={handleSend} disabled={saving || !form.title || !form.message}
              className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50 shadow-sm inline-flex items-center gap-2">
              <FaPaperPlane className="w-3.5 h-3.5" />
              {saving ? 'Sending...' : 'Send Announcement'}
            </button>
          </div>
        </div>
      </div>

      {/* History */}
      <h2 className="text-sm font-extrabold text-gray-700 mb-3">Sent Announcements ({announcements.length})</h2>
      {loading ? (
        <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : announcements.length === 0 ? (
        <div className="super-card p-8 text-center text-gray-400 shadow-sm">
          No announcements sent yet
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map(a => (
            <div key={a.id} className="super-card p-4 shadow-sm flex items-start gap-4">
              <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                <FaBullhorn className="text-brand-600 w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{a.title}</p>
                    <p className="text-gray-500 text-sm mt-1 leading-relaxed">{a.message}</p>
                  </div>
                  <button onClick={() => handleDelete(a.id)} className="text-gray-300 hover:text-red-400 transition-colors text-xs flex-shrink-0 mt-0.5">
                    <FaTrash className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1.5 ${a.restaurantId ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-700'}`}>
                    <FaBuilding className="w-3 h-3" />
                    {a.restaurant ? a.restaurant.name : 'All Restaurants'}
                  </span>
                  <span className="text-gray-400 text-xs">{fmt(a.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

