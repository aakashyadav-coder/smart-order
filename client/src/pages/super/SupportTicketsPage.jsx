/**
 * SupportTicketsPage - view and manage support tickets from restaurant owners
 */
import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import socket from '../../lib/socket'
import { FaInbox, FaTicketAlt, FaTimes, FaTrash, FaBuilding, FaSyncAlt, FaCheckCircle } from 'react-icons/fa'

const STATUS_STYLES = {
  OPEN: 'bg-red-50 text-red-600 border-red-200',
  IN_REVIEW: 'bg-amber-50 text-amber-600 border-amber-200',
  RESOLVED: 'bg-green-50 text-green-700 border-green-200',
}
const STATUS_LABEL = { OPEN: 'Open', IN_REVIEW: 'In Review', RESOLVED: 'Resolved' }
const STATUS_ICON = { OPEN: FaTimes, IN_REVIEW: FaSyncAlt, RESOLVED: FaCheckCircle }
const STATUSES = ['OPEN', 'IN_REVIEW', 'RESOLVED']

function TicketModal({ ticket, onClose, onSave }) {
  const [status, setStatus] = useState(ticket.status)
  const [reply, setReply] = useState(ticket.reply || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(ticket.id, { status, reply })
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="super-card w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/70 rounded-t-2xl">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <FaTicketAlt className="text-brand-600 w-4 h-4" /> Ticket - {ticket.subject}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100">
            <FaTimes className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 mb-1">FROM: {ticket.restaurant?.branchName && ticket.restaurant?.name ? `${ticket.restaurant.name} - ${ticket.restaurant.branchName}` : (ticket.restaurant?.branchName || ticket.restaurant?.name || '—')}</p>
            <p className="text-sm text-gray-800 leading-relaxed">{ticket.message}</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-600 text-xs">Status</label>
            <select className="w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-white border-gray-200 text-gray-900 text-sm"
              value={status} onChange={e => setStatus(e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-600 text-xs">Reply to Restaurant</label>
            <textarea rows={4} placeholder="Type your reply here..."
              className="w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-white border-gray-200 text-gray-900 text-sm resize-none"
              value={reply} onChange={e => setReply(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 font-semibold transition-colors flex-1 py-2.5 text-sm">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-sm transition-colors shadow-sm">
            {saving ? 'Saving...' : 'Save & Reply'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [activeTicket, setActiveTicket] = useState(null)

  const fetchTickets = () => {
    setLoading(true)
    const params = statusFilter ? `?status=${statusFilter}` : ''
    api.get(`/super/tickets${params}`).then(r => setTickets(r.data)).finally(() => setLoading(false))
  }

  useEffect(fetchTickets, [statusFilter])

  useEffect(() => {
    const onNew = (ticket) => {
      setTickets(p => {
        if (p.some(t => t.id === ticket.id)) return p
        if (statusFilter && ticket.status !== statusFilter) return p
        return [ticket, ...p]
      })
      toast.success('New support ticket received')
    }
    socket.on('support_ticket_new', onNew)
    return () => socket.off('support_ticket_new', onNew)
  }, [statusFilter])

  const handleSave = async (id, data) => {
    try {
      const res = await api.put(`/super/tickets/${id}`, data)
      setTickets(p => p.map(t => t.id === id ? res.data : t))
      toast.success('Ticket updated!')
    } catch (e) { toast.error(e.message); throw e }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this ticket?')) return
    try {
      await api.delete(`/super/tickets/${id}`)
      setTickets(p => p.filter(t => t.id !== id))
      toast.success('Deleted')
    } catch (e) { toast.error(e.message) }
  }

  const fmt = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })

  const counts = { OPEN: 0, IN_REVIEW: 0, RESOLVED: 0 }
  tickets.forEach(t => { if (counts[t.status] !== undefined) counts[t.status]++ })

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-sm">
          <FaTicketAlt className="w-4 h-4" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Support Tickets</h1>
          <p className="text-gray-400 text-sm mt-1">Manage help requests from restaurant owners</p>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {STATUSES.map(s => {
          const Icon = STATUS_ICON[s]
          return (
            <button key={s} onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
              className={`rounded-2xl border p-4 text-left transition-all ${statusFilter === s ? 'ring-2 ring-brand-400' : ''} ${STATUS_STYLES[s]}`}>
              <p className="text-xl font-extrabold">{counts[s]}</p>
              <p className="text-xs font-semibold mt-0.5 inline-flex items-center gap-1.5">
                <Icon className="w-3 h-3" /> {STATUS_LABEL[s]}
              </p>
            </button>
          )
        })}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4">
        <select className="w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-white border-gray-200 text-gray-900 text-sm w-44"
          value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        {statusFilter && (
          <button onClick={() => setStatusFilter('')} className="text-sm text-brand-600 hover:text-brand-700 font-medium">
            Clear filter
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : tickets.length === 0 ? (
        <div className="super-card p-10 text-center shadow-sm">
          <FaInbox className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">No tickets found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map(t => (
            <div key={t.id} className="super-card p-4 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
              <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                <FaInbox className="text-gray-500 w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{t.subject}</p>
                    <p className="text-gray-400 text-xs mt-0.5 inline-flex items-center gap-1.5">
                      <FaBuilding className="w-3 h-3" /> {(t.restaurant?.branchName && t.restaurant?.name ? `${t.restaurant.name} - ${t.restaurant.branchName}` : (t.restaurant?.branchName || t.restaurant?.name || '—'))} - {fmt(t.createdAt)}
                    </p>
                    <p className="text-gray-600 text-sm mt-1.5 line-clamp-2">{t.message}</p>
                    {t.reply && (
                      <div className="mt-2 bg-brand-50 border border-brand-100 rounded-lg px-3 py-2">
                        <p className="text-xs font-semibold text-brand-600 mb-0.5">Your Reply:</p>
                        <p className="text-xs text-brand-800">{t.reply}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {(() => {
                      const StatusIcon = STATUS_ICON[t.status]
                      return (
                        <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold inline-flex items-center gap-1.5 ${STATUS_STYLES[t.status]}`}>
                          <StatusIcon className="w-3 h-3" />
                          {STATUS_LABEL[t.status]}
                        </span>
                      )
                    })()}
                    <div className="flex gap-1.5">
                      <button onClick={() => setActiveTicket(t)}
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2.5 py-1.5 rounded-lg border border-gray-200 transition-colors">
                        Respond
                      </button>
                      <button onClick={() => handleDelete(t.id)}
                        className="text-xs bg-red-50 hover:bg-red-100 text-red-500 px-2 py-1.5 rounded-lg border border-red-100 transition-colors">
                        <FaTrash className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTicket && (
        <TicketModal
          ticket={activeTicket}
          onClose={() => setActiveTicket(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

