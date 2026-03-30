// SupportTab.jsx
import React, { useEffect, useState } from 'react'
import { FaPaperPlane, FaInbox } from 'react-icons/fa'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

const STATUS_STYLE = {
  OPEN:      'bg-red-50 text-red-600 border-red-200',
  IN_REVIEW: 'bg-amber-50 text-amber-600 border-amber-200',
  RESOLVED:  'bg-green-50 text-green-700 border-green-200',
}

export function SupportTab() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm]       = useState({ subject: '', message: '' })
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    api.get('/restaurant/tickets')
      .then(r => setTickets(r.data))
      .catch(() => setTickets([]))
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.subject.trim() || !form.message.trim())
      return toast.error('Subject and message required')
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

      {/* ── Submit form ──────────────────────────────── */}
      <div className="lg:col-span-1">
        <Card className="border-gray-100 shadow-sm sticky top-24">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-brand-50 rounded-lg flex items-center justify-center">
                <FaPaperPlane className="w-3.5 h-3.5 text-brand-600" />
              </div>
              <CardTitle className="text-sm font-bold">Submit Ticket</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Describe your issue and our team will respond shortly
            </CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label htmlFor="ticket-subject" className="text-xs font-semibold mb-1.5 block">
                  Subject
                </Label>
                <Input
                  id="ticket-subject"
                  placeholder="e.g. Payment issue"
                  value={form.subject}
                  onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="ticket-message" className="text-xs font-semibold mb-1.5 block">
                  Message
                </Label>
                <textarea
                  id="ticket-message"
                  rows={5}
                  className="w-full px-3 py-2 rounded-xl border border-input text-sm outline-none transition-all focus:ring-2 focus:ring-ring/30 focus:border-ring bg-background resize-none"
                  placeholder="Describe your issue in detail..."
                  value={form.message}
                  onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                />
              </div>
              <Button type="submit" disabled={saving} className="w-full gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FaPaperPlane className="w-3.5 h-3.5" />}
                {saving ? 'Sending…' : 'Send Ticket'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* ── Ticket list ──────────────────────────────── */}
      <div className="lg:col-span-2 space-y-4">
        <h3 className="font-bold text-gray-900">Your Tickets</h3>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <Card key={i} className="border-gray-100 shadow-sm p-4 space-y-2">
                <Skeleton className="h-4 w-48 rounded" />
                <Skeleton className="h-3 w-32 rounded" />
                <Skeleton className="h-12 w-full rounded" />
              </Card>
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <Card className="border-gray-100 shadow-sm">
            <CardContent className="p-8 text-center text-gray-400">
              <FaInbox className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p className="text-sm">No tickets yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {tickets.map(t => (
              <Card key={t.id} className="border-gray-100 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">{t.subject}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{fmt(t.createdAt)}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs font-semibold flex-shrink-0 ${STATUS_STYLE[t.status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}
                    >
                      {t.status?.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-gray-600 text-sm mt-2 leading-relaxed">{t.message}</p>
                  {t.reply && (
                    <div className="mt-3 bg-brand-50 border border-brand-100 rounded-xl px-3 py-2.5">
                      <p className="text-xs font-semibold text-brand-600 mb-0.5">Reply from Super Admin:</p>
                      <p className="text-xs text-brand-800">{t.reply}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
