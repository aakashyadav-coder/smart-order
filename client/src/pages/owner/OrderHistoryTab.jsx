// OrderHistoryTab.jsx
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

import { downloadCSV } from './ownerTabHelpers'

// ── Order History Tab ──────────────────────────────────────────────────────────
const STATUS_CFG = {
  PENDING: { border: 'border-l-amber-400', dot: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700 border-amber-200', next: 'ACCEPTED', nextBtn: 'bg-brand-600 text-white hover:bg-brand-700', nextLabel: 'Accept' },
  ACCEPTED: { border: 'border-l-blue-400', dot: 'bg-blue-400', badge: 'bg-blue-50 text-blue-700 border-blue-200', next: 'PREPARING', nextBtn: 'bg-orange-500 text-white hover:bg-orange-600', nextLabel: 'Prepare' },
  PREPARING: { border: 'border-l-orange-400', dot: 'bg-orange-400', badge: 'bg-orange-50 text-orange-700 border-orange-200', next: 'SERVED', nextBtn: 'bg-green-600 text-white hover:bg-green-700', nextLabel: 'Served' },
  SERVED: { border: 'border-l-green-400', dot: 'bg-green-400', badge: 'bg-green-50 text-green-700 border-green-200', next: null },
  CANCELLED: { border: 'border-l-red-400', dot: 'bg-red-400', badge: 'bg-red-50 text-red-700 border-red-200', next: null },
  PAID: { border: 'border-l-emerald-500', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', next: null },
}

function BillModal({ order, restaurant, onClose, onPaid }) {
  const [discount, setDiscount] = useState(0)
  const [paying, setPaying] = useState(false)
  const alreadyPaid = order.status === 'PAID'
  const subtotal = order.totalPrice
  const discAmt = +((subtotal * discount) / 100).toFixed(2)
  const finalAmt = +(subtotal - discAmt).toFixed(2)
  const fmt = d => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })

  const handlePay = async () => {
    setPaying(true)
    try {
      const res = await api.put(`/orders/${order.id}/status`, { status: 'PAID', discount, discountedTotal: finalAmt })
      onPaid(res.data); toast.success('Marked as PAID!'); onClose()
    } catch (err) { toast.error(err.message) } finally { setPaying(false) }
  }

  const handlePrint = () => {
    const rows = order.items?.map(i => `<tr><td style="padding:4px 0">${i.menuItem?.name} ×${i.quantity}</td><td style="text-align:right">Rs.${(i.price * i.quantity).toFixed(0)}</td></tr>`).join('')
    const html = `<!DOCTYPE html><html><head><title>Bill</title><style>body{font-family:Inter,sans-serif;max-width:360px;margin:0 auto;padding:20px}.total{font-size:18px;font-weight:900}.paid{background:#dcfce7;color:#166534;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700}</style></head><body><div style="text-align:center"><h2>${restaurant?.name}</h2><p>${fmt(order.createdAt)}</p></div><hr/><p><b>Customer:</b> ${order.customerName}</p><p><b>Table:</b> #${order.tableNumber}</p><table style="width:100%">${rows}</table><hr/>${discount > 0 ? `<p style="color:red">Discount ${discount}%: -Rs.${discAmt.toFixed(0)}</p>` : ''}<p class="total">TOTAL: Rs.${finalAmt.toFixed(0)}</p><div style="text-align:center"><span class="paid">✓ PAID</span></div><div style="text-align:center;margin-top:16px;color:#999;font-size:11px">Thank you! Powered by Code Yatra</div><script>window.onload=()=>{window.print();setTimeout(()=>window.close(),1000)}<\/script></body></html>`
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank', 'width=420,height=640')
    if (win) win.addEventListener('afterprint', () => URL.revokeObjectURL(url))
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden border border-gray-100 animate-bounce-in">
        <div className="bg-gradient-to-r from-brand-700 to-brand-500 p-5 text-white flex items-center justify-between flex-shrink-0">
          <div>
            <p className="font-extrabold text-lg leading-none">{order.customerName}</p>
            <p className="text-brand-200 text-sm mt-1">Table #{order.tableNumber} · {fmt(order.createdAt)}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center"><FaTimesCircle className="w-4 h-4" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div className="space-y-2">{order.items?.map(item => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-gray-700">{item.menuItem?.name} <span className="text-gray-400">×{item.quantity}</span></span>
              <span className="font-semibold">Rs. {(item.price * item.quantity).toFixed(0)}</span>
            </div>
          ))}</div>
          {!alreadyPaid && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Discount</p>
              <div className="flex flex-wrap gap-2">
                {[0, 5, 10, 15, 20].map(p => (
                  <button key={p} onClick={() => setDiscount(p)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${discount === p ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-800'}`}>{p === 0 ? 'None' : `${p}%`}</button>
                ))}
                <input type="number" min={0} max={100} placeholder="Custom %" className="w-24 px-2.5 py-1.5 rounded-xl text-xs border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-400" onChange={e => setDiscount(Math.min(100, Math.max(0, +e.target.value || 0)))} />
              </div>
            </div>
          )}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-1.5">
            <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span>Rs. {subtotal.toFixed(0)}</span></div>
            {discount > 0 && <div className="flex justify-between text-sm"><span className="text-green-600">Discount ({discount}%)</span><span className="text-green-600">- Rs. {discAmt.toFixed(0)}</span></div>}
            <div className="flex justify-between pt-2 border-t border-gray-200"><span className="font-bold text-gray-900">Total</span><span className="font-extrabold text-xl text-gray-900">Rs. {finalAmt.toFixed(0)}</span></div>
          </div>
        </div>
        <div className="p-5 border-t border-gray-100 flex gap-3">
          {!alreadyPaid ? (
            <>
              <button onClick={handlePay} disabled={paying} className="flex-1 py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50 text-sm">{paying ? 'Processing…' : '✓ Mark Paid'}</button>
              <button onClick={handlePrint} className="flex items-center gap-1.5 px-4 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-brand-600 to-brand-500 text-sm"><FaPrint className="w-4 h-4" /> Print</button>
            </>
          ) : (
            <button onClick={handlePrint} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-brand-600 to-brand-500 text-sm"><FaPrint className="w-4 h-4" /> Reprint Bill</button>
          )}
        </div>
      </div>
    </div>
  )
}

export function OrderHistoryTab({ orders, loading, restaurant, onPaid, onStatusChange }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selected, setSelected] = useState(null)

  const STATUS_TABS = ['ALL', 'PENDING', 'ACCEPTED', 'PREPARING', 'SERVED', 'PAID', 'CANCELLED']

  const filtered = orders.filter(o => {
    const matchStatus = statusFilter === 'ALL' || o.status === statusFilter
    const q = search.toLowerCase()
    return matchStatus && (!q || o.customerName.toLowerCase().includes(q) || o.phone?.includes(q) || String(o.tableNumber).includes(q))
  })
  const fmt = d => new Date(d).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
  const totalRev = filtered.filter(o => o.status === 'PAID').reduce((s, o) => s + (o.discountedTotal ?? o.totalPrice), 0)

  const exportCSV = () => downloadCSV(`orders_${new Date().toISOString().slice(0, 10)}.csv`, [
    ['ID', 'Date', 'Customer', 'Phone', 'Table', 'Total', 'Status'],
    ...filtered.map(o => [o.id, new Date(o.createdAt).toLocaleString(), o.customerName, o.phone, o.tableNumber, o.totalPrice, o.status])
  ])

  return (
    <div className="space-y-4">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <input
            type="text"
            placeholder="Search name, phone, table…"
            className="input text-sm w-full pl-9 focus:ring-brand-400 focus:border-brand-400"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx={11} cy={11} r={8}/><path d="m21 21-4.35-4.35"/>
          </svg>
        </div>
        <select
          className="input w-44 text-sm bg-white focus:ring-brand-400 focus:border-brand-400"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          {STATUS_TABS.map(s => <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s}</option>)}
        </select>
        <button
          onClick={exportCSV}
          disabled={!filtered.length}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 disabled:opacity-40 transition-colors"
        >
          ↓ Export
        </button>
      </div>

      {/* ── Summary pills ── */}
      <div className="flex gap-2.5 text-xs flex-wrap">
        <span className="bg-brand-50 border border-brand-200 text-brand-700 px-3 py-1.5 rounded-full font-bold">
          {filtered.length} orders
        </span>
        <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-full font-bold">
          Rs. {totalRev.toFixed(0)} paid
        </span>
      </div>

      {/* ── Table ── */}
      {loading ? <OrderRowSkeleton count={6} /> : filtered.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <FaClipboardList className="w-14 h-14 mx-auto mb-4 opacity-15" />
          <p className="font-display font-bold text-gray-500 text-base">No orders found</p>
          <p className="text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Header row — brand gradient */}
          <div className="grid grid-cols-[36px_2fr_1.5fr_1fr_1fr_140px] items-center px-6 py-3.5 bg-gradient-to-r from-brand-700 to-brand-600">
            <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">#</span>
            <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">Customer</span>
            <span className="text-[10px] font-black text-white/80 uppercase tracking-widest text-center">Items</span>
            <span className="text-[10px] font-black text-white/80 uppercase tracking-widest text-center">Status</span>
            <span className="text-[10px] font-black text-white/80 uppercase tracking-widest text-center">Amount</span>
            <span className="text-[10px] font-black text-white/80 uppercase tracking-widest text-center pl-4 border-l border-white/20">Action</span>
          </div>

          {/* Rows */}
          {filtered.map((o, idx) => {
            const cfg = STATUS_CFG[o.status] || STATUS_CFG.PENDING
            const preview = o.items?.slice(0, 2).map(it => it.menuItem?.name).filter(Boolean).join(', ') + (o.items?.length > 2 ? ` +${o.items.length - 2}` : '')
            const isCancelled = o.status === 'CANCELLED'
            const isPaid = o.status === 'PAID'
            const isServed = o.status === 'SERVED'
            const amount = isPaid && o.discountedTotal ? o.discountedTotal : o.totalPrice

            return (
              <div key={o.id}
                className={`grid grid-cols-[36px_2fr_1.5fr_1fr_1fr_140px] items-center px-6 py-4 border-b border-gray-50 last:border-0 transition-colors ${
                  isCancelled ? 'opacity-50' : 'hover:bg-brand-50/30'
                } ${isServed ? 'bg-green-50/20' : ''}`}
              >
                {/* Serial number */}
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 text-gray-500 font-bold text-xs">
                    {idx + 1}
                  </span>
                </div>
                {/* Customer */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm leading-none truncate">{o.customerName}</p>
                    <p className="text-gray-400 text-xs mt-0.5">Table #{o.tableNumber} · {fmt(o.createdAt)}</p>
                  </div>
                </div>

                {/* Items */}
                <p className="text-gray-500 text-xs text-center truncate px-2">{preview || '—'}</p>

                {/* Status */}
                <div className="flex justify-center">
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full border ${cfg.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${o.status === 'PENDING' ? cfg.dot + ' animate-pulse' : cfg.dot}`} />
                    {o.status}
                  </span>
                </div>

                {/* Amount */}
                <div className="text-center">
                  <p className={`font-bold text-sm ${isPaid ? 'text-emerald-600' : isCancelled ? 'text-gray-300 line-through' : 'text-gray-900'}`}>
                    Rs. {amount}
                  </p>
                  {isPaid && o.discount > 0 && (
                    <p className="text-emerald-500 text-[10px] font-semibold">{o.discount}% off</p>
                  )}
                </div>

                {/* Action */}
                <div className="flex justify-center pl-4 border-l border-gray-100">
                  {isServed && (
                    <button
                      onClick={() => setSelected(o)}
                      className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white hover:from-brand-700 hover:to-brand-600 transition-all shadow-sm whitespace-nowrap"
                    >
                      <FaPrint className="w-3.5 h-3.5 flex-shrink-0" /> Bill
                    </button>
                  )}
                  {isPaid && (
                    <button
                      onClick={() => setSelected(o)}
                      className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors whitespace-nowrap"
                    >
                      <FaPrint className="w-3.5 h-3.5 flex-shrink-0" /> Reprint
                    </button>
                  )}
                  {!isServed && !isPaid && !isCancelled && (
                    <span className="text-[10px] text-gray-300 font-medium">—</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selected && <BillModal order={selected} restaurant={restaurant} onClose={() => setSelected(null)} onPaid={updated => { onPaid(updated); setSelected(null) }} />}
    </div>
  )
}


