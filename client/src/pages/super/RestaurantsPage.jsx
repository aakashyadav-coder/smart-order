/**
 * RestaurantsPage — CRUD for all restaurants
 */
import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'

const EMPTY = { name: '', address: '', phone: '', logoUrl: '' }

const Modal = ({ title, form, setForm, onSave, onClose, saving }) => (
  <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in">
    <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-md shadow-2xl animate-bounce-in">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/70 rounded-t-2xl">
        <h3 className="font-bold text-gray-900">{title}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100">✕</button>
      </div>
      <div className="p-5 space-y-3">
        {[
          { key: 'name',     label: 'Restaurant Name *', placeholder: 'The Grand Kitchen' },
          { key: 'address',  label: 'Address',            placeholder: 'Kathmandu, Nepal' },
          { key: 'phone',    label: 'Phone',              placeholder: '9800000000' },
          { key: 'logoUrl',  label: 'Logo URL',           placeholder: 'https://...' },
        ].map(f => (
          <div key={f.key}>
            <label className="label text-gray-600 text-xs">{f.label}</label>
            <input
              type="text"
              placeholder={f.placeholder}
              className="input bg-white border-gray-200 text-gray-900 placeholder-gray-400 text-sm focus:ring-brand-500 focus:border-brand-500"
              value={form[f.key]}
              onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2 px-5 pb-5">
        <button onClick={onClose} className="btn-secondary flex-1 py-2.5 text-sm">Cancel</button>
        <button onClick={onSave} disabled={saving || !form.name} className="flex-1 py-2.5 rounded-xl font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-sm transition-colors shadow-sm">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  </div>
)

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'create' | {id, ...}
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const fetchRestaurants = () => {
    api.get('/super/restaurants').then(r => setRestaurants(r.data)).finally(() => setLoading(false))
  }
  useEffect(fetchRestaurants, [])

  const openCreate = () => { setForm(EMPTY); setModal('create') }
  const openEdit = (r) => { setForm({ name: r.name, address: r.address || '', phone: r.phone || '', logoUrl: r.logoUrl || '' }); setModal(r) }

  const handleSave = async () => {
    if (!form.name) return
    setSaving(true)
    try {
      if (modal === 'create') {
        const res = await api.post('/super/restaurants', form)
        setRestaurants(p => [res.data, ...p])
        toast.success('Restaurant created!')
      } else {
        const res = await api.put(`/super/restaurants/${modal.id}`, form)
        setRestaurants(p => p.map(r => r.id === modal.id ? res.data : r))
        toast.success('Restaurant updated!')
      }
      setModal(null)
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const handleToggleActive = async (r) => {
    try {
      const res = await api.put(`/super/restaurants/${r.id}`, { active: !r.active })
      setRestaurants(p => p.map(x => x.id === r.id ? res.data : x))
      toast.success(res.data.active ? 'Restaurant activated' : 'Restaurant deactivated')
    } catch (e) { toast.error(e.message) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this restaurant and all its data?')) return
    try {
      await api.delete(`/super/restaurants/${id}`)
      setRestaurants(p => p.filter(r => r.id !== id))
      toast.success('Deleted')
    } catch (e) { toast.error(e.message) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Restaurants</h1>
          <p className="text-gray-400 text-sm mt-1">{restaurants.length} restaurant(s) on the platform</p>
        </div>
        <button onClick={openCreate} className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm">
          + New Restaurant
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : restaurants.length === 0 ? (
        <div className="text-center py-20 text-gray-500">No restaurants yet. Create one!</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {restaurants.map(r => (
            <div key={r.id} className={`bg-white rounded-2xl border shadow-sm ${r.active ? 'border-gray-200' : 'border-red-200'} p-5 flex flex-col gap-3`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">{r.name}</h3>
                  {r.address && <p className="text-gray-400 text-xs mt-0.5">📍 {r.address}</p>}
                  {r.phone && <p className="text-gray-400 text-xs">📞 {r.phone}</p>}
                </div>
                <span className={`badge text-xs ${r.active ? 'badge-completed' : 'badge-cancelled'}`}>{r.active ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="flex gap-3 text-xs text-gray-400 border-t border-gray-100 pt-3">
                <span>👥 {r._count?.users} users</span>
                <span>📋 {r._count?.orders} orders</span>
                <span>🍽️ {r._count?.menuItems} items</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(r)} className="flex-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 py-2 rounded-lg transition-colors border border-gray-200">✏️ Edit</button>
                <button onClick={() => handleToggleActive(r)} className={`flex-1 text-xs py-2 rounded-lg transition-colors border ${r.active ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200' : 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200'}`}>{r.active ? '🔴 Deactivate' : '🟢 Activate'}</button>
                <button onClick={() => handleDelete(r.id)} className="text-xs bg-red-50 hover:bg-red-100 text-red-500 border border-red-100 py-2 px-3 rounded-lg transition-colors">🗑</button>
              </div>
              <p className="text-gray-300 text-xs">ID: {r.id.slice(-8).toUpperCase()}</p>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal
          title={modal === 'create' ? '🏢 New Restaurant' : `✏️ Edit ${modal.name}`}
          form={form} setForm={setForm}
          onSave={handleSave} onClose={() => setModal(null)}
          saving={saving}
        />
      )}
    </div>
  )
}
