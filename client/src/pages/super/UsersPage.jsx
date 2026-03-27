/**
 * UsersPage — CRUD + search + role filter + bulk + last login display
 */
import React, { useEffect, useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { FaSearch } from 'react-icons/fa'

const ROLES = ['OWNER', 'KITCHEN', 'ADMIN']
const ROLE_COLORS = { SUPER_ADMIN: 'badge-cancelled', OWNER: 'badge-accepted', KITCHEN: 'badge-preparing', ADMIN: 'badge-pending' }
const EMPTY = { name: '', email: '', password: '', role: 'KITCHEN', restaurantId: '', active: true }

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
}

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [selected, setSelected] = useState(new Set())

  const fetchData = async () => {
    const [u, r] = await Promise.all([api.get('/super/users'), api.get('/super/restaurants')])
    setUsers(u.data)
    setRestaurants(r.data)
    setLoading(false)
  }
  useEffect(() => { fetchData() }, [])

  const filtered = useMemo(() => {
    return users.filter(u => {
      const q = search.toLowerCase()
      const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      const matchRole = !roleFilter || u.role === roleFilter
      return matchSearch && matchRole
    })
  }, [users, search, roleFilter])

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

  const toggleSelect = (id) => setSelected(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
  })

  const handleBulk = async (active) => {
    if (selected.size === 0) return
    try {
      await api.patch('/super/users/bulk', { ids: [...selected], active })
      setUsers(p => p.map(u => selected.has(u.id) ? { ...u, active } : u))
      toast.success(`${selected.size} user(s) ${active ? 'activated' : 'deactivated'}`)
      setSelected(new Set())
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
          <p className="text-gray-400 text-sm mt-1">{filtered.length} of {users.length} user(s)</p>
        </div>
        <button onClick={openCreate} className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm">
          + New User
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
          <input type="text" placeholder="Search name or email…"
            className="input bg-white border-gray-200 text-gray-900 text-sm pl-9"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input bg-white border-gray-200 text-gray-900 text-sm w-36"
          value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">{selected.size} selected</span>
            <button onClick={() => handleBulk(true)} className="text-xs bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg hover:bg-green-100">🟢 Activate</button>
            <button onClick={() => handleBulk(false)} className="text-xs bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg hover:bg-red-100">🔴 Deactivate</button>
            <button onClick={() => setSelected(new Set())} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 w-8"><input type="checkbox" className="accent-brand-600"
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={e => setSelected(e.target.checked ? new Set(filtered.map(u => u.id)) : new Set())} /></th>
                  {['Name', 'Role', 'Restaurant', 'Last Login', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400">No users found</td></tr>
                ) : filtered.map(u => (
                  <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${selected.has(u.id) ? 'bg-brand-50' : ''}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleSelect(u.id)} className="accent-brand-600" />
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900 font-medium">{u.name}</p>
                      <p className="text-gray-400 text-xs">{u.email}</p>
                    </td>
                    <td className="px-4 py-3"><span className={`badge text-xs ${ROLE_COLORS[u.role] || 'badge-pending'}`}>{u.role}</span></td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{u.restaurant?.name || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{fmtDate(u.lastLoginAt)}</td>
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
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-md shadow-2xl">
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
