// SupportTab.jsx
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


// -- Support Tab (Owner) --
export function SupportTab() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ subject: '', message: '' })
  const [saving, setSaving] = useState(false)

  const STATUS = {
    OPEN: 'bg-red-50 text-red-600 border-red-200',
    IN_REVIEW: 'bg-amber-50 text-amber-600 border-amber-200',
    RESOLVED: 'bg-green-50 text-green-700 border-green-200',
  }

  useEffect(() => {
    api.get('/restaurant/tickets')
      .then(r => setTickets(r.data))
      .catch(() => setTickets([]))
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.subject.trim() || !form.message.trim()) return toast.error('Subject and message required')
    setSaving(true)
    try {
      const res = await api.post('/restaurant/tickets', {
        subject: form.subject.trim(),
        message: form.message.trim(),
      })
      setTickets(p => [res.data, ...p])
      setForm({ subject: '', message: '' })
      toast.success('Support ticket submitted')
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const fmt = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm sticky top-24">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-50 rounded-lg flex items-center justify-center">
              <FaPaperPlane className="w-3.5 h-3.5 text-brand-600" />
            </div>
            Submit Support Ticket
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              className="input text-sm"
              placeholder="Subject (e.g. Payment issue)"
              value={form.subject}
              onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
            />
            <textarea
              rows={5}
              className="input text-sm resize-none"
              placeholder="Describe your issue in detail..."
              value={form.message}
              onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
            />
            <button
              type="submit"
              disabled={saving}
              className="btn-primary w-full py-2.5 text-sm"
            >
              {saving ? 'Sending...' : 'Send Ticket'}
            </button>
          </form>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-4">
        <h3 className="font-bold text-gray-900">Your Tickets</h3>
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">Loading...</div>
        ) : tickets.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
            <FaInbox className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            No tickets yet
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map(t => (
              <div key={t.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{t.subject}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{fmt(t.createdAt)}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${STATUS[t.status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                    {t.status}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mt-2">{t.message}</p>
                {t.reply && (
                  <div className="mt-3 bg-brand-50 border border-brand-100 rounded-lg px-3 py-2">
                    <p className="text-xs font-semibold text-brand-600 mb-0.5">Reply from Super Admin:</p>
                    <p className="text-xs text-brand-800">{t.reply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
// -- Staff Tab --
