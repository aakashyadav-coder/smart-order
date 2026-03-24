/**
 * UsersPage — CRUD for all users across all restaurants
 */
import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'

const ROLES = ['OWNER', 'KITCHEN', 'ADMIN']
const ROLE_COLORS = { SUPER_ADMIN: 'badge-cancelled', OWNER: 'badge-accepted', KITCHEN: 'badge-preparing', ADMIN: 'badge-pending' }
const EMPTY = { name: '', email: '', password: '', role: 'KITCHEN', restaurantId: '', active: true }

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const fetchData = async () => {
    const [u, r] = await Promise.all([api.get('/super/users'), api.get('/super/restaurants')])
    setUsers(u.data)
    setRestaurants(r.data)
    setLoading(false)
  }
  useEffect(() => { fetchData() }, [])

  const openCreate = () => { setForm(EMPTY); setModal('create') }
  const openEdit = (u) => { setForm({ name: u.name, email: u.email, password: '', role: u.role, restaurantId: u.restaurantId || '', active: u.active }); setModal(u) }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = { ...form, restaurantId: form.restaurantId || null }
      if (modal === 'create') {
        const res = await api.post('/super/users', payload)
        setUsers(p => [res.data, ...p])
        toast.success('User created!')
      } else {
        if (!payload.password) delete payload.password
        const res = await api.put(`/super/users/${modal.id}`, payload)
        setUsers(p => p.map(u => u.id === modal.id ? { ...u, ...res.data } : u))
        toast.success('User updated!')
      }
      setModal(null)
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const handleToggleActive = async (u) => {
    try {
      await api.put(`/super/users/${u.id}`, { active: !u.active })
      setUsers(p => p.map(x => x.id === u.id ? { ...x, active: !x.active } : x))
      toast.success(u.active ? 'User deactivated' : 'User activated')
    } catch (e) { toast.error(e.message) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user permanently?')) return
    try {
      await api.delete(`/super/users/${id}`)
      setUsers(p => p.filter(u => u.id !== id))
      toast.success('Deleted')
    } catch (e) { toast.error(e.message) }
  }

  const InputField = ({ label, field, type = 'text', placeholder }) => (
    <div>
      <label className="label text-gray-600 text-xs">{label}</label>
      <input type={type} placeholder={placeholder} className="input bg-white border-gray-200 text-gray-900 placeholder-gray-400 text-sm focus:ring-brand-500 focus:border-brand-500"
        value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} />
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Users</h1>
          <p className="text-gray-400 text-sm mt-1">{users.length} user(s) across all restaurants</p>
        </div>
        <button onClick={openCreate} className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm">
          + New User
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Name', 'Email', 'Role', 'Restaurant', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-900 font-medium">{u.name}</td>
                    <td className="px-4 py-3 text-gray-400">{u.email}</td>
                    <td className="px-4 py-3"><span className={`badge text-xs ${ROLE_COLORS[u.role] || 'badge-pending'}`}>{u.role}</span></td>
                    <td className="px-4 py-3 text-gray-400">{u.restaurant?.name || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3">
                      <span className={`badge text-xs ${u.active ? 'badge-completed' : 'badge-cancelled'}`}>{u.active ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(u)} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">✏️</button>
                        <button onClick={() => handleToggleActive(u)} className="text-xs text-gray-400 hover:text-amber-500 transition-colors">{u.active ? '🔴' : '🟢'}</button>
                        <button onClick={() => handleDelete(u.id)} className="text-xs text-gray-400 hover:text-red-500 transition-colors">🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-md shadow-2xl animate-bounce-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/70 rounded-t-2xl">
              <h3 className="font-bold text-gray-900">{modal === 'create' ? '👤 New User' : `✏️ Edit ${modal.name}`}</h3>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-700 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <InputField label="Full Name *" field="name" placeholder="John Doe" />
              <InputField label="Email *" field="email" type="email" placeholder="user@restaurant.com" />
              <InputField label={modal === 'create' ? 'Password *' : 'New Password (leave blank to keep)'} field="password" type="password" placeholder="••••••••" />
              <div>
                <label className="label text-gray-600 text-xs">Role *</label>
                <select className="input bg-white border-gray-200 text-gray-900 text-sm focus:ring-brand-500 focus:border-brand-500"
                  value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="label text-gray-600 text-xs">Restaurant</label>
                <select className="input bg-white border-gray-200 text-gray-900 text-sm focus:ring-brand-500 focus:border-brand-500"
                  value={form.restaurantId} onChange={e => setForm(p => ({ ...p, restaurantId: e.target.value }))}>
                  <option value="">— No restaurant —</option>
                  {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="active" checked={form.active} onChange={e => setForm(p => ({ ...p, active: e.target.checked }))} className="w-4 h-4 accent-brand-600" />
                <label htmlFor="active" className="text-gray-700 text-sm">Active account</label>
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button onClick={() => setModal(null)} className="btn-secondary flex-1 py-2.5 text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-sm transition-colors shadow-sm">
                {saving ? 'Saving…' : 'Save User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
