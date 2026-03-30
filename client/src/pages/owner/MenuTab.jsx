// MenuTab.jsx
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


// ── Menu Tab ───────────────────────────────────────────────────────────────────
const EMPTY = { name: '', description: '', price: '', category: 'Main Course', imageUrl: '', available: true }
const CATS = ['Drinks', 'Starters', 'Main Course', 'Desserts']

export function MenuTab({ restaurantId, onDeleteItem }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!restaurantId) return
    api.get(`/menu?restaurantId=${restaurantId}`).then(r => setItems(r.data.items || [])).finally(() => setLoading(false))
  }, [restaurantId])

  const handleSubmit = async e => {
    e.preventDefault(); setSaving(true)
    try {
      const payload = { ...form, price: parseFloat(form.price), restaurantId }
      if (editId) { const res = await api.put(`/menu/${editId}`, payload); setItems(p => p.map(i => i.id === editId ? res.data : i)); toast.success('Updated!') }
      else { const res = await api.post('/menu', payload); setItems(p => [...p, res.data]); toast.success('Added!') }
      setForm(EMPTY); setEditId(null)
    } catch (err) { toast.error(err.message) } finally { setSaving(false) }
  }

  const toggleAvailable = async item => {
    try { const res = await api.put(`/menu/${item.id}`, { available: !item.available }); setItems(p => p.map(i => i.id === item.id ? res.data : i)) }
    catch (err) { toast.error(err.message) }
  }

  const filtered = search ? items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase())) : items
  if (loading) return <MenuSkeleton />

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 sticky top-24 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-50 rounded-lg flex items-center justify-center"><FaPlus className="w-3.5 h-3.5 text-brand-600" /></div>
            {editId ? 'Edit Item' : 'Add New Item'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input required placeholder="Item name *" className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none transition-all focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-white text-sm" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            <input type="number" required min="0" step="0.01" placeholder="Price (Rs.) *" className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none transition-all focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-white text-sm" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} />
            <textarea placeholder="Description" rows={2} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none transition-all focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-white text-sm resize-none" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            <select className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none transition-all focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-white text-sm" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
              {CATS.map(c => <option key={c}>{c}</option>)}
            </select>
            <input placeholder="Image URL (optional)" className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none transition-all focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-white text-sm" value={form.imageUrl} onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))} />
            <div className="flex gap-2 pt-1">
              {editId && <button type="button" onClick={() => { setForm(EMPTY); setEditId(null) }} className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 font-semibold transition-colors flex-1 py-2.5 text-sm">Cancel</button>}
              <button type="submit" disabled={saving} className="inline-flex items-center justify-center rounded-xl bg-brand-600 text-white hover:bg-brand-700 font-semibold transition-colors flex-1 py-2.5 text-sm">{saving ? 'Saving…' : editId ? 'Update' : 'Add Item'}</button>
            </div>
          </form>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-4">
        <div className="relative">
          <input type="text" placeholder="Search items or categories…" className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none transition-all focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-white text-sm pr-10" value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><FaTimesCircle className="w-4 h-4" /></button>}
        </div>
        <p className="text-gray-400 text-xs">{filtered.length} of {items.length} items</p>
        {CATS.map(cat => {
          const catItems = filtered.filter(i => i.category === cat)
          if (!catItems.length) return null
          return (
            <div key={cat} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between">
                <span className="font-bold text-gray-800 text-sm">{cat}</span>
                <span className="text-gray-400 text-xs font-medium">{catItems.length} items</span>
              </div>
              {catItems.map(item => (
                <div key={item.id} className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 transition-opacity ${!item.available ? 'opacity-40' : ''}`}>
                  {item.imageUrl
                    ? <img src={item.imageUrl} alt={item.name} className="w-11 h-11 rounded-xl object-cover flex-shrink-0 ring-1 ring-gray-100" />
                    : <div className="w-11 h-11 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0"><FaUtensils className="w-5 h-5 text-brand-300" /></div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 text-sm font-semibold truncate">{item.name}</p>
                    {item.description && <p className="text-gray-400 text-xs truncate mt-0.5">{item.description}</p>}
                    <p className="text-brand-600 text-xs font-bold mt-0.5">Rs. {item.price}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => toggleAvailable(item)} className={`text-[10px] px-2.5 py-1 rounded-lg font-bold border transition-colors ${item.available ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>{item.available ? 'ON' : 'OFF'}</button>
                    <button onClick={() => { setForm({ ...item, price: item.price.toString() }); setEditId(item.id) }} className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors text-xs font-bold">✏</button>
                    <button onClick={() => onDeleteItem(item, id => setItems(p => p.filter(i => i.id !== id)))} className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-100 transition-colors"><FaTrash className="w-3.5 h-3.5 text-red-500" /></button>
                  </div>
                </div>
              ))}
            </div>
          )
        })}
        {filtered.length === 0 && <div className="text-center py-12 text-gray-400"><FaUtensils className="w-10 h-10 mx-auto mb-2 opacity-20" /><p>{search ? 'No results.' : 'No items yet.'}</p></div>}
      </div>
    </div>
  )
}

