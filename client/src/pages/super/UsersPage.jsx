/**
 * UsersPage — CRUD + search + role filter + bulk + last login display
 */
import React, { useEffect, useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import socket from '../../lib/socket'
import { FaSearch, FaFolder, FaFolderOpen, FaChevronDown, FaChevronRight } from 'react-icons/fa'

const ROLES = ['OWNER', 'KITCHEN', 'ADMIN']
const ROLE_COLORS = { SUPER_ADMIN: 'badge-cancelled', OWNER: 'badge-accepted', KITCHEN: 'badge-preparing', ADMIN: 'badge-pending' }
const buildForm = (u) => ({
  name: u?.name || '',
  email: u?.email || '',
  password: '',
  role: u?.role || 'KITCHEN',
  restaurantId: u?.restaurantId || '',
  active: typeof u?.active === 'boolean' ? u.active : true,
})

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
}

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [openGroups, setOpenGroups] = useState(new Set())

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

  const restaurantById = useMemo(() => {
    return new Map(restaurants.map(r => [r.id, r]))
  }, [restaurants])

  const groups = useMemo(() => {
    const map = new Map()
    filtered.forEach(u => {
      const key = u.restaurantId || 'unassigned'
      let group = map.get(key)
      if (!group) {
        const r = u.restaurantId ? restaurantById.get(u.restaurantId) : null
        const name = u.restaurant?.name || r?.name || 'No restaurant'
        group = { key, name, users: [] }
        map.set(key, group)
      }
      group.users.push(u)
    })
    const list = [...map.values()]
    list.sort((a, b) => {
      if (a.key === 'unassigned') return 1
      if (b.key === 'unassigned') return -1
      return a.name.localeCompare(b.name)
    })
    return list
  }, [filtered, restaurantById])

  useEffect(() => {
    const keys = new Set(groups.map(g => g.key))
    setOpenGroups(prev => {
      const next = new Set()
      prev.forEach(k => { if (keys.has(k)) next.add(k) })
      return next
    })
  }, [groups])

  useEffect(() => {
    const onLastLogin = ({ userId, lastLoginAt }) => {
      setUsers(p => p.map(u => u.id === userId ? { ...u, lastLoginAt } : u))
    }
    socket.on('user_last_login', onLastLogin)
    return () => socket.off('user_last_login', onLastLogin)
  }, [])

  const openCreate = () => { setModal({ mode: 'create', user: null }) }
  const openEdit = (u) => { setModal({ mode: 'edit', user: u }) }

  const handleSave = async (mode, user, form) => {
    setSaving(true)
    try {
      const payload = { ...form, restaurantId: form.restaurantId || null }
      if (mode === 'create') {
        const res = await api.post('/super/users', payload)
        setUsers(p => [res.data, ...p])
        toast.success('User created!')
      } else {
        if (!payload.password) delete payload.password
        const res = await api.put(`/super/users/${user.id}`, payload)
        setUsers(p => p.map(u => u.id === user.id ? { ...u, ...res.data } : u))
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

  const toggleGroup = (key) => {
    setOpenGroups(prev => {
      const n = new Set(prev)
      n.has(key) ? n.delete(key) : n.add(key)
      return n
    })
  }

  const toggleGroupSelect = (groupUsers, checked) => {
    setSelected(prev => {
      const n = new Set(prev)
      groupUsers.forEach(u => checked ? n.add(u.id) : n.delete(u.id))
      return n
    })
  }

  const handleBulk = async (active) => {
    if (selected.size === 0) return
    try {
      await api.patch('/super/users/bulk', { ids: [...selected], active })
      setUsers(p => p.map(u => selected.has(u.id) ? { ...u, active } : u))
      toast.success(`${selected.size} user(s) ${active ? 'activated' : 'deactivated'}`)
      setSelected(new Set())
    } catch (e) { toast.error(e.message) }
  }

  const InputField = ({ label, field, type = 'text', placeholder, form, setForm }) => (
    <div>
      <label className="label text-gray-600 text-xs">{label}</label>
      <input type={type} placeholder={placeholder} className="input bg-white border-gray-200 text-gray-900 placeholder-gray-400 text-sm focus:ring-brand-500 focus:border-brand-500"
        value={form[field] ?? ''} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} />
    </div>
  )

  const UserModal = ({ mode, user, restaurants, onClose, onSave, saving }) => {
    const [form, setForm] = useState(() => buildForm(user))

    useEffect(() => {
      setForm(buildForm(user))
    }, [user, mode])

    return (
      <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-md shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/70 rounded-t-2xl">
            <h3 className="font-bold text-gray-900">{mode === 'create' ? '👤 New User' : `✏️ Edit ${user?.name || ''}`}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100">✕</button>
          </div>
          <div className="p-5 space-y-3">
            <InputField label="Full Name *" field="name" placeholder="John Doe" form={form} setForm={setForm} />
            <InputField label="Email *" field="email" type="email" placeholder="user@restaurant.com" form={form} setForm={setForm} />
            <InputField label={mode === 'create' ? 'Password *' : 'New Password (leave blank to keep)'} field="password" type="password" placeholder="••••••••" form={form} setForm={setForm} />
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
            <button onClick={onClose} className="btn-secondary flex-1 py-2.5 text-sm">Cancel</button>
            <button onClick={() => onSave(form)} disabled={saving} className="flex-1 py-2.5 rounded-xl font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-sm transition-colors shadow-sm">
              {saving ? 'Saving…' : 'Save User'}
            </button>
          </div>
        </div>
      </div>
    )
  }

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
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center text-gray-400">No users found</div>
      ) : (
        <div className="space-y-3">
          {groups.map(group => {
            const isOpen = openGroups.has(group.key)
            const allSelected = group.users.length > 0 && group.users.every(u => selected.has(u.id))
            const someSelected = group.users.some(u => selected.has(u.id))
            const roleCounts = group.users.reduce((acc, u) => {
              acc[u.role] = (acc[u.role] || 0) + 1
              return acc
            }, {})

            return (
              <div key={group.key} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.key)}
                  className="w-full flex items-center justify-between px-5 py-4 bg-gray-50/70 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {isOpen ? <FaFolderOpen className="text-brand-600 w-4 h-4" /> : <FaFolder className="text-gray-500 w-4 h-4" />}
                    <div className="min-w-0 text-left">
                      <p className="font-semibold text-gray-900 truncate">{group.name}</p>
                      <p className="text-xs text-gray-400">{group.users.length} user(s)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {Object.keys(roleCounts).map(role => (
                      <span key={role} className={`badge text-[10px] ${ROLE_COLORS[role] || 'badge-pending'}`}>{role} {roleCounts[role]}</span>
                    ))}
                    {isOpen ? <FaChevronDown className="text-gray-400 w-3 h-3" /> : <FaChevronRight className="text-gray-400 w-3 h-3" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-white">
                          <th className="px-4 py-3 w-8">
                            <input
                              type="checkbox"
                              className="accent-brand-600"
                              checked={allSelected}
                              ref={el => { if (el) el.indeterminate = !allSelected && someSelected }}
                              onChange={e => toggleGroupSelect(group.users, e.target.checked)}
                            />
                          </th>
                          {['Name', 'Role', 'Restaurant', 'Last Login', 'Status', 'Actions'].map(h => (
                            <th key={h} className="text-left px-4 py-3 text-gray-500 font-semibold text-xs uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {group.users.map(u => (
                          <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${selected.has(u.id) ? 'bg-brand-50' : ''}`}>
                            <td className="px-4 py-3">
                              <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleSelect(u.id)} className="accent-brand-600" />
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-gray-900 font-medium">{u.name}</p>
                              <p className="text-gray-400 text-xs">{u.email}</p>
                            </td>
                            <td className="px-4 py-3"><span className={`badge text-xs ${ROLE_COLORS[u.role] || 'badge-pending'}`}>{u.role}</span></td>
                            <td className="px-4 py-3 text-gray-400 text-xs">{u.restaurant?.name || group.name || <span className="text-gray-300">-</span>}</td>
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
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <UserModal
          mode={modal.mode}
          user={modal.user}
          restaurants={restaurants}
          onClose={() => setModal(null)}
          onSave={(form) => handleSave(modal.mode, modal.user, form)}
          saving={saving}
        />
      )}
    </div>
  )
}


