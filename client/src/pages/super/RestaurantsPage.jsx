/**
 * RestaurantsPage - CRUD + search + bulk + onboarding tracker + restaurant detail link
 */
import React, { useEffect, useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../../lib/api'
import ConfirmModal from '../../components/ConfirmModal'
import {
  FaSearch,
  FaBuilding,
  FaCheckCircle,
  FaTimesCircle,
  FaMoneyBillWave,
  FaPlus,
  FaTimes,
  FaEdit,
  FaTrash,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaTable,
  FaUsers,
  FaClipboardList,
  FaUtensils,
  FaChartLine,
} from 'react-icons/fa'

const DAYS = ['mon','tue','wed','thu','fri','sat','sun']
const DAY_LABELS = { mon:'Mon', tue:'Tue', wed:'Wed', thu:'Thu', fri:'Fri', sat:'Sat', sun:'Sun' }

const DEFAULT_HOURS = DAYS.reduce((acc, d) => ({ ...acc, [d]: { open: '09:00', close: '22:00', closed: false } }), {})
const EMPTY = { name: '', branchName: '', address: '', phone: '', logoUrl: '', cuisineType: '', tableCount: '', ownerEmail: '', openingHours: DEFAULT_HOURS }

function OnboardingBadge({ r }) {
  const checks = [
    { label: 'Menu', done: (r._count?.menuItems || 0) > 0 },
    { label: 'Staff', done: (r._count?.users || 0) > 0 },
    { label: 'Orders', done: (r._count?.orders || 0) > 0 },
  ]
  const done = checks.filter(c => c.done).length
  const pct = Math.round((done / checks.length) * 100)
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-400 font-medium">Onboarding {pct}%</span>
        <div className="flex gap-1">
          {checks.map(c => (
            <span key={c.label} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${c.done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
              {c.label}
            </span>
          ))}
        </div>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all ${pct === 100 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

const Modal = ({ title, form, setForm, onSave, onClose, saving, isCreate }) => (
  <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
    <div className="super-card w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/70 rounded-t-2xl sticky top-0">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">{title}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100">
          <FaTimes className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="p-5 space-y-3">
        {[
          { key: 'name',        label: 'Restaurant Name *', placeholder: 'The Grand Kitchen' },
          { key: 'branchName',  label: 'Branch Name', placeholder: 'Main Branch, Thamel Outlet…' },
          { key: 'address',     label: 'Address',            placeholder: 'Kathmandu, Nepal' },
          { key: 'phone',       label: 'Phone',              placeholder: '9800000000' },
          { key: 'logoUrl',     label: 'Logo URL',           placeholder: 'https://...' },
          { key: 'cuisineType', label: 'Cuisine Type',       placeholder: 'Nepali, Chinese, Continental' },
          { key: 'tableCount',  label: 'Number of Tables',   placeholder: '10', type: 'number' },
        ].map(f => (
          <div key={f.key}>
            <label className="block text-sm font-medium mb-1 text-gray-600 text-xs">{f.label}</label>
            <input
              type={f.type || 'text'}
              placeholder={f.placeholder}
              className="w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-white border-gray-200 text-gray-900 placeholder-gray-400 text-sm focus:ring-brand-500 focus:border-brand-500"
              value={form[f.key]}
              onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
            />
          </div>
        ))}
        {/* Owner Email — creates/links the owner account */}
        {isCreate && (
          <div>
            <label className="block text-xs font-bold mb-1 text-violet-700">Owner Email (optional)</label>
            <input
              type="email"
              placeholder="owner@restaurant.com"
              className="w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-violet-400/30 focus:border-violet-500 bg-violet-50 border-violet-200 text-gray-900 placeholder-gray-400"
              value={form.ownerEmail}
              onChange={e => setForm(p => ({ ...p, ownerEmail: e.target.value }))}
            />
            <p className="text-[11px] text-violet-500 mt-1">
              If this email already owns other branches, they'll be auto-upgraded to Central Admin.
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-600 text-xs font-medium mb-2 block">Opening Hours</label>
          <div className="space-y-1.5">
            {DAYS.map(d => (
              <div key={d} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-8">{DAY_LABELS[d]}</span>
                <input
                  type="checkbox"
                  checked={!form.openingHours?.[d]?.closed}
                  onChange={e => setForm(p => ({ ...p, openingHours: { ...p.openingHours, [d]: { ...p.openingHours[d], closed: !e.target.checked } } }))}
                  className="accent-brand-600"
                />
                {!form.openingHours?.[d]?.closed ? (
                  <>
                    <input type="time" value={form.openingHours?.[d]?.open || '09:00'}
                      className="w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-white border-gray-200 text-gray-900 text-xs py-1 px-2 h-7 flex-1"
                      onChange={e => setForm(p => ({ ...p, openingHours: { ...p.openingHours, [d]: { ...p.openingHours[d], open: e.target.value } } }))} />
                    <span className="text-xs text-gray-400">-</span>
                    <input type="time" value={form.openingHours?.[d]?.close || '22:00'}
                      className="w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-white border-gray-200 text-gray-900 text-xs py-1 px-2 h-7 flex-1"
                      onChange={e => setForm(p => ({ ...p, openingHours: { ...p.openingHours, [d]: { ...p.openingHours[d], close: e.target.value } } }))} />
                  </>
                ) : <span className="text-xs text-red-400 italic">Closed</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-2 px-5 pb-5">
        <button onClick={onClose} className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 font-semibold transition-colors flex-1 py-2.5 text-sm">Cancel</button>
        <button onClick={onSave} disabled={saving || !form.name} className="flex-1 py-2.5 rounded-xl font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-sm transition-colors shadow-sm">
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  </div>
)

export default function RestaurantsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [confirmDel, setConfirmDel] = useState(null) // { id, name }

  // Support navigating here with { state: { openCreate: true } } from dashboard quick-actions
  useEffect(() => {
    if (location.state?.openCreate) openCreate()
  }, []) // eslint-disable-line

  const fetchRestaurants = () => {
    api.get('/super/restaurants').then(r => setRestaurants(r.data)).finally(() => setLoading(false))
  }
  useEffect(fetchRestaurants, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return restaurants
    const q = search.toLowerCase()
    return restaurants.filter(r => r.name.toLowerCase().includes(q) || r.address?.toLowerCase().includes(q))
  }, [restaurants, search])

  const openCreate = () => { setForm(EMPTY); setModal('create') }
  const openEdit = (r) => {
    setForm({
      name: r.name, branchName: r.branchName || '', address: r.address || '', phone: r.phone || '', logoUrl: r.logoUrl || '',
      tableCount: r.tableCount || '', cuisineType: r.cuisineType || '',
      openingHours: r.openingHours || DEFAULT_HOURS,
    })
    setModal(r)
  }

  const handleSave = async () => {
    if (!form.name) return
    setSaving(true)
    try {
      const payload = { ...form, tableCount: form.tableCount ? parseInt(form.tableCount) : null }
      if (modal === 'create') {
        const res = await api.post('/super/restaurants', payload)
        setRestaurants(p => [res.data, ...p])
        toast.success('Restaurant created!')
      } else {
        const res = await api.put(`/super/restaurants/${modal.id}`, payload)
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
      toast.success(res.data.active ? 'Activated' : 'Deactivated')
    } catch (e) { toast.error(e.message) }
  }

  const handleDelete = (id, name) => {
    setConfirmDel({ id, name })
  }

  const doDelete = async () => {
    if (!confirmDel) return
    try {
      await api.delete(`/super/restaurants/${confirmDel.id}`)
      setRestaurants(p => p.filter(r => r.id !== confirmDel.id))
      toast.success('Restaurant deleted')
    } catch (e) { toast.error(e.message) }
    finally { setConfirmDel(null) }
  }

  const toggleSelect = (id) => setSelected(prev => {
    const n = new Set(prev)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })

  const handleBulk = async (active) => {
    if (selected.size === 0) return
    try {
      await api.patch('/super/restaurants/bulk', { ids: [...selected], active })
      setRestaurants(p => p.map(r => selected.has(r.id) ? { ...r, active } : r))
      toast.success(`${selected.size} restaurant(s) ${active ? 'activated' : 'deactivated'}`)
      setSelected(new Set())
    } catch (e) { toast.error(e.message) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Restaurants</h1>
          <p className="text-gray-400 text-sm mt-1">{filtered.length} of {restaurants.length} restaurant(s)</p>
        </div>
        <button onClick={openCreate} className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm inline-flex items-center gap-2">
          <FaPlus className="w-3.5 h-3.5" /> New Restaurant
        </button>
      </div>

      {/* Search + Bulk */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
          <input
            type="text" placeholder="Search restaurants..."
            className="w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-white border-gray-200 text-gray-900 text-sm pl-9"
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">{selected.size} selected</span>
            <button onClick={() => handleBulk(true)} className="text-xs bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg hover:bg-green-100 transition-colors inline-flex items-center gap-1.5">
              <FaCheckCircle className="w-3 h-3" /> Activate All
            </button>
            <button onClick={() => handleBulk(false)} className="text-xs bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg hover:bg-red-100 transition-colors inline-flex items-center gap-1.5">
              <FaTimesCircle className="w-3 h-3" /> Deactivate All
            </button>
            <button onClick={() => setSelected(new Set())} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-2 inline-flex items-center gap-1.5">
              <FaTimes className="w-3 h-3" /> Clear
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500">No restaurants found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(r => (
            <div
              key={r.id}
              className={`super-card-hover transition-all ${selected.has(r.id) ? 'border-brand-400 ring-2 ring-brand-200' : r.active ? 'border-gray-200' : 'border-red-200'} p-6 flex flex-col gap-4`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
              <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} className="mt-1 accent-brand-600" />
                  {r.logoUrl ? (
                    <img src={r.logoUrl} alt={r.name} className="w-11 h-11 rounded-2xl object-cover flex-shrink-0 shadow-sm shadow-gray-200/50 border border-gray-100" />
                  ) : (
                    <div className="w-11 h-11 rounded-2xl bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-sm flex-shrink-0 border border-gray-200">
                      {(r.branchName && r.name ? `${r.name} - ${r.branchName}` : (r.branchName || r.name || '—')).slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                       {r.branchName && r.name ? `${r.name} - ${r.branchName}` : (r.branchName || r.name || '—')}
                    </h3>
                    {r.cuisineType && <p className="text-brand-600 text-xs font-medium mt-0.5">{r.cuisineType}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">{r.ownerEmail || 'No owner assigned'}</p>
                    {r.address && (
                      <p className="text-gray-400 text-xs mt-1 flex items-center gap-1.5">
                        <FaMapMarkerAlt className="w-3 h-3 flex-shrink-0" /> {r.address}
                      </p>
                    )}
                    {r.phone && (
                      <p className="text-gray-400 text-xs mt-1 flex items-center gap-1.5">
                        <FaPhoneAlt className="w-3 h-3 flex-shrink-0" /> {r.phone}
                      </p>
                    )}
                    {r.tableCount && (
                      <p className="text-gray-400 text-xs mt-1 flex items-center gap-1.5">
                        <FaTable className="w-3 h-3 flex-shrink-0" /> {r.tableCount} tables
                      </p>
                    )}
                  </div>
                </div>
                <span className={`badge text-xs ${r.active ? 'badge-completed' : 'badge-cancelled'}`}>{r.active ? 'Active' : 'Inactive'}</span>
              </div>

              <OnboardingBadge r={r} />

              {/* Revenue Badge */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold ${
                r.totalRevenue > 0
                  ? 'bg-green-50 border-green-100 text-green-700'
                  : 'bg-gray-50 border-gray-100 text-gray-400'
              }`}>
                <FaMoneyBillWave className={`w-3 h-3 flex-shrink-0 ${r.totalRevenue > 0 ? 'text-green-500' : 'text-gray-300'}`} />
                {r.totalRevenue > 0
                  ? <>Total Revenue: <strong className="ml-0.5">Rs. {Number(r.totalRevenue).toLocaleString()}</strong></>
                  : 'No revenue yet'
                }
              </div>

              <div className="flex gap-3 text-xs text-gray-400 border-t border-gray-100 pt-3">
                <span className="inline-flex items-center gap-1.5"><FaUsers className="w-3 h-3" /> {r._count?.users} users</span>
                <span className="inline-flex items-center gap-1.5"><FaClipboardList className="w-3 h-3" /> {r._count?.orders} orders</span>
                <span className="inline-flex items-center gap-1.5"><FaUtensils className="w-3 h-3" /> {r._count?.menuItems} items</span>
              </div>
              <div className="flex gap-2 bg-gray-50/80 border border-gray-100 rounded-xl p-2">
                <button onClick={() => navigate(`/super/restaurants/${r.id}`)} className="flex-1 text-xs bg-white hover:bg-gray-50 text-gray-600 py-2 rounded-lg transition-colors border border-gray-200 inline-flex items-center justify-center gap-1.5">
                  <FaChartLine className="w-3 h-3" /> Detail
                </button>
                <button onClick={() => openEdit(r)} className="flex-1 text-xs bg-white hover:bg-gray-50 text-gray-600 py-2 rounded-lg transition-colors border border-gray-200 inline-flex items-center justify-center gap-1.5">
                  <FaEdit className="w-3 h-3" /> Edit
                </button>
                <button onClick={() => handleToggleActive(r)} className={`flex-1 text-xs py-2 rounded-lg transition-colors border inline-flex items-center justify-center gap-1.5 ${r.active ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200' : 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200'}`}>
                  {r.active ? <FaTimesCircle className="w-3 h-3" /> : <FaCheckCircle className="w-3 h-3" />}
                </button>
                <button onClick={() => handleDelete(r.id, r.branchName && r.name ? `${r.name} - ${r.branchName}` : (r.branchName || r.name || '—'))} className="text-xs bg-red-50 hover:bg-red-100 text-red-500 border border-red-100 py-2 px-3 rounded-lg transition-colors">
                  <FaTrash className="w-3 h-3" />
                </button>
              </div>
              <p className="text-gray-300 text-xs">ID: {r.id.slice(-8).toUpperCase()}</p>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal
          title={modal === 'create'
            ? (<><FaBuilding className="w-4 h-4 text-brand-600" /> New Restaurant</>)
            : (<><FaEdit className="w-4 h-4 text-brand-600" /> Edit {modal.name}</>)
          }
          form={form} setForm={setForm}
          onSave={handleSave} onClose={() => setModal(null)}
          saving={saving}
          isCreate={modal === 'create'}
        />
      )}

      {confirmDel && (
        <ConfirmModal
          open
          type="danger"
          title="Delete Restaurant?"
          message={`Permanently delete "${confirmDel.name}" and ALL its menus, orders, and staff? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={doDelete}
          onCancel={() => setConfirmDel(null)}
        />
      )}
    </div>
  )
}

