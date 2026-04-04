/**
 * MenuUploadPage — Super Admin bulk menu upload (CSV / Excel)
 * CSV  → parsed client-side with PapaParse (browser-safe)
 * Excel → sent to /super/menu/parse-preview, rows returned as JSON
 * 3-step flow: Setup → Preview → Result
 */
import React, { useEffect, useRef, useState, useCallback } from 'react'
import Papa from 'papaparse'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import {
  FaUpload, FaDownload, FaExclamationTriangle, FaCheckCircle,
  FaTimesCircle, FaFileExcel, FaFileCsv, FaRedo, FaUtensils,
  FaChevronDown, FaInfoCircle, FaEye, FaPlus, FaSyncAlt, FaStepForward, FaClipboardList,
} from 'react-icons/fa'

// ── CSV template (pure JS, no xlsx needed on client) ─────────────────────────
function downloadTemplate() {
  const lines = [
    'name,description,price,category,imageUrl,available',
    'Butter Chicken,Creamy tomato curry,350,Main Course,https://example.com/img.jpg,true',
    'Garlic Naan,Tandoor baked flatbread,80,Bread,,true',
    'Mango Lassi,Sweet chilled yoghurt,120,Beverages,,true',
    'Veg Fried Rice,Wok-tossed with veggies,200,Rice & Noodles,,true',
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = 'smart-order-menu-template.csv'; a.click()
  URL.revokeObjectURL(url)
}

// ── Row validation (mirrors server logic) ─────────────────────────────────────
function validateRow(raw, rowIndex) {
  const name      = String(raw['name']        || raw['Name']        || '').trim()
  const category  = String(raw['category']    || raw['Category']    || '').trim()
  const rawPrice  = raw['price']              ?? raw['Price']       ?? ''
  const desc      = String(raw['description'] || raw['Description'] || '').trim() || null
  const rawImg    = String(raw['imageUrl']    || raw['image_url']   || raw['ImageUrl'] || '').trim()
  const rawAvail  = String(raw['available']   ?? raw['Available']   ?? 'true').toLowerCase().trim()

  const errs = []
  if (!name)     errs.push('Missing name')
  if (!category) errs.push('Missing category')
  const price = parseFloat(rawPrice)
  if (isNaN(price) || price < 0) errs.push(`Invalid price "${rawPrice}"`)

  let imageUrl = null
  if (rawImg) {
    if (!rawImg.startsWith('http')) errs.push('imageUrl must start with http')
    else imageUrl = rawImg
  }
  const available = !(rawAvail === 'false' || rawAvail === '0' || rawAvail === 'no')

  return errs.length
    ? { valid: false, row: rowIndex, errors: errs }
    : { valid: true,  row: rowIndex, data: { name, description: desc, price, category, imageUrl, available } }
}

// ── Parse CSV client-side ─────────────────────────────────────────────────────
function parseCsvFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: ({ data, errors }) => {
        if (errors.length && !data.length) { reject(new Error(errors[0].message)); return }
        resolve(data.map((r, i) => validateRow(r, i + 2)))
      },
      error: reject,
    })
  })
}

// ── Parse Excel via server (no xlsx on client) ────────────────────────────────
async function parseExcelViaServer(file) {
  const fd = new FormData()
  fd.append('file', file)
  const res = await api.post('/super/menu/parse-preview', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data.rows
}

// ── Steps indicator ───────────────────────────────────────────────────────────
function Steps({ step }) {
  const labels = ['Setup', 'Preview', 'Result']
  return (
    <div className="flex items-center gap-0 mb-8">
      {labels.map((s, i) => (
        <React.Fragment key={s}>
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
              step > i ? 'bg-green-500 border-green-500 text-white'
              : step === i ? 'bg-brand-600 border-brand-600 text-white'
              : 'bg-white border-gray-200 text-gray-400'}`}>
              {step > i ? '✓' : i + 1}
            </div>
            <span className={`text-sm font-semibold ${step === i ? 'text-gray-900' : step > i ? 'text-green-600' : 'text-gray-400'}`}>{s}</span>
          </div>
          {i < labels.length - 1 && (
            <div className={`h-0.5 flex-1 mx-3 transition-all ${step > i ? 'bg-green-400' : 'bg-gray-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

// ── Drag-and-drop zone ────────────────────────────────────────────────────────
function DropZone({ onFile, fileName, disabled }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef()
  const isExcel  = fileName?.endsWith('.xlsx') || fileName?.endsWith('.xls')

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false)
    if (!disabled) { const f = e.dataTransfer.files[0]; if (f) onFile(f) }
  }, [onFile, disabled])

  return (
    <div
      className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
        disabled  ? 'opacity-50 cursor-not-allowed'
        : dragging ? 'border-brand-500 bg-brand-50 scale-[1.01] cursor-copy'
        : fileName  ? 'border-green-400 bg-green-50 cursor-pointer'
        : 'border-gray-200 bg-gray-50 hover:border-brand-400 hover:bg-brand-50/40 cursor-pointer'}`}
      onDragOver={e => { e.preventDefault(); if (!disabled) setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current.click()}
    >
      <input ref={inputRef} type="file" id="menu-file-input" className="hidden"
        accept=".csv,.xlsx,.xls"
        onChange={e => { const f = e.target.files[0]; if (f) { onFile(f); e.target.value = '' } }}
        disabled={disabled} />
      {fileName ? (
        <div className="flex flex-col items-center gap-2">
          {isExcel ? <FaFileExcel className="w-10 h-10 text-green-500" /> : <FaFileCsv className="w-10 h-10 text-green-500" />}
          <p className="font-semibold text-gray-800 text-sm">{fileName}</p>
          <p className="text-xs text-green-600 font-medium">Click to change file</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 bg-brand-100 rounded-2xl flex items-center justify-center">
            <FaUpload className="w-6 h-6 text-brand-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-700 text-sm">Drop your CSV or Excel file here</p>
            <p className="text-xs text-gray-400 mt-1">.csv / .xlsx / .xls &nbsp;·&nbsp; max 5 MB &nbsp;·&nbsp; 500 rows</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Preview table ─────────────────────────────────────────────────────────────
function PreviewTable({ rows }) {
  const valid   = rows.filter(r => r.valid)
  const invalid = rows.filter(r => !r.valid)
  const [showInvalid, setShowInvalid] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <span className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold px-3 py-2 rounded-xl">
          <FaCheckCircle className="w-3.5 h-3.5" /> {valid.length} valid
        </span>
        {invalid.length > 0 && (
          <span className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold px-3 py-2 rounded-xl">
            <FaTimesCircle className="w-3.5 h-3.5" /> {invalid.length} invalid
          </span>
        )}
        <span className="flex items-center gap-2 bg-gray-50 border border-gray-200 text-gray-500 text-xs font-medium px-3 py-2 rounded-xl">
          Total: {rows.length}
        </span>
      </div>

      <div className="overflow-auto rounded-xl border border-gray-200 max-h-72">
        <table className="w-full text-xs">
          <thead className="sticky top-0">
            <tr className="bg-gray-50 border-b border-gray-200">
              {['#', 'Name', 'Category', 'Price', 'Image URL', 'Available'].map(h => (
                <th key={h} className="px-3 py-2.5 text-left text-gray-500 font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {valid.length === 0
              ? <tr><td colSpan={6} className="text-center py-6 text-gray-400">No valid rows found</td></tr>
              : valid.map((r, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-400 font-mono">{r.row}</td>
                  <td className="px-3 py-2 font-medium text-gray-800 max-w-[130px] truncate">{r.data.name}</td>
                  <td className="px-3 py-2">
                    <span className="bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full text-[10px] font-semibold">{r.data.category}</span>
                  </td>
                  <td className="px-3 py-2 font-semibold text-gray-700 whitespace-nowrap">Rs. {r.data.price}</td>
                  <td className="px-3 py-2 max-w-[110px] truncate">
                    {r.data.imageUrl
                      ? <a href={r.data.imageUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline" onClick={e => e.stopPropagation()}>
                          {r.data.imageUrl.replace(/^https?:\/\//, '').slice(0, 28)}…
                        </a>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${r.data.available ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                      {r.data.available ? 'Yes' : 'No'}
                    </span>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {invalid.length > 0 && (
        <div className="rounded-xl border border-red-200 overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3 bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 transition-colors"
            onClick={() => setShowInvalid(p => !p)}
          >
            <span className="flex items-center gap-2">
              <FaExclamationTriangle className="w-3.5 h-3.5" />
              {invalid.length} row{invalid.length > 1 ? 's' : ''} will be skipped
            </span>
            <FaChevronDown className={`w-3 h-3 transition-transform ${showInvalid ? 'rotate-180' : ''}`} />
          </button>
          {showInvalid && (
            <div className="divide-y divide-red-100 max-h-40 overflow-y-auto">
              {invalid.map((r, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-2.5 bg-red-50/40">
                  <span className="text-red-400 font-mono text-xs w-12 flex-shrink-0">Row {r.row}</span>
                  <span className="text-red-600 text-xs">{r.errors?.join(' · ')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Result card ───────────────────────────────────────────────────────────────
function ResultCard({ result, onReset }) {
  const { summary, mode, restaurant } = result
  return (
    <div className="space-y-5">
      <div className="text-center py-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FaCheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <h3 className="text-xl font-extrabold text-gray-900">Upload Complete!</h3>
        <p className="text-gray-500 text-sm mt-1">
          Menu <strong>{mode === 'replace' ? 'replaced' : 'updated'}</strong> for <strong className="text-gray-700">{restaurant}</strong>
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Created', value: summary.created,  emoji: <FaPlus className="text-green-500 w-6 h-6 mx-auto" /> },
          { label: 'Updated', value: summary.updated,  emoji: <FaSyncAlt className="text-blue-500 w-6 h-6 mx-auto" /> },
          { label: 'Skipped', value: summary.skipped,  emoji: <FaStepForward className="text-gray-400 w-6 h-6 mx-auto" /> },
          { label: 'Total',   value: summary.totalRows, emoji: <FaClipboardList className="text-indigo-500 w-6 h-6 mx-auto" /> },
        ].map(s => (
          <div key={s.label} className="super-card p-4 text-center">
            <div className="text-2xl mb-1">{s.emoji}</div>
            <div className="text-2xl font-extrabold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-400 font-medium mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
      {summary.errors?.length > 0 && (
        <div className="rounded-xl border border-red-200 overflow-hidden">
          <div className="bg-red-50 px-4 py-3 flex items-center gap-2 text-red-700 text-xs font-semibold">
            <FaExclamationTriangle className="w-3.5 h-3.5" /> {summary.errors.length} rows had errors and were skipped
          </div>
          <div className="divide-y divide-red-100 max-h-48 overflow-y-auto">
            {summary.errors.map((e, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-2.5 bg-red-50/40">
                <span className="text-red-400 font-mono text-xs w-12 flex-shrink-0">Row {e.row}</span>
                <span className="text-red-600 text-xs">{e.error}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <button id="upload-another-btn" onClick={onReset}
        className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl text-sm transition-colors shadow-sm">
        <FaRedo className="w-3.5 h-3.5" /> Upload Another File
      </button>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MenuUploadPage() {
  const [step,          setStep]         = useState(0)
  const [restaurants,   setRestaurants]  = useState([])
  const [restaurantId,  setRestaurantId] = useState('')
  const [mode,          setMode]         = useState('add')
  const [file,          setFile]         = useState(null)
  const [parsedRows,    setParsedRows]   = useState([])
  const [parsing,       setParsing]      = useState(false)
  const [uploading,     setUploading]    = useState(false)
  const [result,        setResult]       = useState(null)
  const [currentCount,  setCurrentCount] = useState(null)

  useEffect(() => {
    api.get('/super/restaurants').then(r => setRestaurants(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!restaurantId) { setCurrentCount(null); return }
    api.get(`/super/restaurants/${restaurantId}/menu`)
      .then(r => setCurrentCount(r.data.total))
      .catch(() => setCurrentCount(null))
  }, [restaurantId])

  const handleFile = async (f) => {
    const ext = f.name.split('.').pop().toLowerCase()
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      toast.error('Only .csv, .xlsx or .xls files are allowed'); return
    }
    setFile(f); setParsedRows([]); setParsing(true)
    try {
      const rows = ext === 'csv' ? await parseCsvFile(f) : await parseExcelViaServer(f)
      if (rows.length > 500) {
        toast.error('File exceeds 500 rows. Please split it.')
        setFile(null); setParsedRows([]); return
      }
      setParsedRows(rows)
    } catch (err) {
      toast.error(err?.message || 'Could not read file. Use a valid CSV or Excel file.')
      setFile(null); setParsedRows([])
    } finally { setParsing(false) }
  }

  const validRows  = parsedRows.filter(r => r.valid)
  const canPreview = restaurantId && file && validRows.length > 0 && !parsing

  const handleUpload = async () => {
    if (!canPreview) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('mode', mode)
    try {
      const res = await api.post(
        `/super/restaurants/${restaurantId}/menu/bulk-upload`,
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      setResult(res.data); setStep(2)
      toast.success('Menu updated successfully!')
    } catch (err) {
      toast.error(err.message || 'Upload failed. Please try again.')
    } finally { setUploading(false) }
  }

  const reset = () => { setStep(0); setFile(null); setParsedRows([]); setMode('add'); setResult(null) }
  const selectedRest = restaurants.find(r => r.id === restaurantId)

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
          <FaUtensils className="text-brand-600 w-5 h-5" /> Bulk Menu Upload
        </h1>
        <p className="text-gray-400 text-sm mt-1">Upload a CSV or Excel file to add or replace menu items for any restaurant</p>
      </div>

      <Steps step={step} />

      <div className="super-card p-6">

        {/* Step 0 — Setup */}
        {step === 0 && (
          <div className="space-y-6">
            {/* Template hint */}
            <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 flex items-start gap-3">
              <FaInfoCircle className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-brand-800">Download the CSV template first</p>
                <p className="text-xs text-brand-600 mt-0.5">
                  Required: <strong>name</strong>, <strong>price</strong>, <strong>category</strong>
                  &nbsp;·&nbsp; Optional: description, imageUrl, available
                </p>
              </div>
              <button id="download-template-btn" onClick={downloadTemplate}
                className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors flex-shrink-0">
                <FaDownload className="w-3 h-3" /> Template
              </button>
            </div>

            {/* Restaurant dropdown */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Restaurant <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select id="restaurant-select" value={restaurantId} onChange={e => setRestaurantId(e.target.value)}
                  className="w-full appearance-none px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 pr-10">
                  <option value="">— Choose a restaurant —</option>
                  {restaurants.map(r => <option key={r.id} value={r.id}>{r.branchName && r.name ? `${r.name} - ${r.branchName}` : (r.branchName || r.name || '—')}</option>)}
                </select>
                <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
              </div>
              {selectedRest && currentCount !== null && (
                <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1.5">
                  <FaUtensils className="w-3 h-3" />
                  Currently has <strong className="text-gray-600 mx-0.5">{currentCount}</strong> menu items
                </p>
              )}
            </div>

            {/* Mode */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Upload Mode</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                    { value: 'add',     emoji: <FaPlus className="w-5 h-5 text-brand-500" />, label: 'Add Only',    desc: 'Creates new items. Updates existing ones matched by name + category. Safe — no data loss.' },
                    { value: 'replace', emoji: <FaSyncAlt className="w-5 h-5 text-red-500" />, label: 'Replace All', desc: 'Deletes ALL existing items first, then inserts from the file. Use carefully.', danger: true },
                ].map(m => (
                  <label key={m.value} id={`mode-${m.value}`}
                    className={`cursor-pointer rounded-xl border-2 p-4 flex gap-3 transition-all ${
                      mode === m.value
                        ? m.danger ? 'border-red-400 bg-red-50' : 'border-brand-500 bg-brand-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    <input type="radio" name="mode" value={m.value} checked={mode === m.value}
                      onChange={() => setMode(m.value)} className="mt-0.5 accent-brand-600" />
                    <div>
                      <p className="text-sm font-bold text-gray-800">{m.emoji} {m.label}</p>
                      <p className={`text-xs mt-1 leading-relaxed ${m.danger && mode === m.value ? 'text-red-600' : 'text-gray-500'}`}>{m.desc}</p>
                      {m.danger && mode === m.value && (
                        <p className="text-xs font-bold text-red-500 mt-1.5 flex items-center gap-1">
                          <FaExclamationTriangle className="w-3 h-3" /> Deletes all existing menu items!
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Drop zone */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Upload File</label>
              <DropZone onFile={handleFile} fileName={file?.name} disabled={parsing} />
              {parsing && (
                <p className="text-xs text-brand-600 font-medium mt-2 flex items-center gap-1.5">
                  <span className="w-3 h-3 border-2 border-brand-500 border-t-transparent rounded-full animate-spin inline-block" />
                  {file?.name?.endsWith('.csv') ? 'Parsing CSV…' : 'Sending to server for Excel parsing…'}
                </p>
              )}
              {!parsing && file && parsedRows.length > 0 && (
                <p className="text-xs text-green-600 font-medium mt-2 flex items-center gap-1.5">
                  <FaCheckCircle className="w-3 h-3" />
                  Parsed {parsedRows.length} rows — {validRows.length} valid, {parsedRows.length - validRows.length} with errors
                </p>
              )}
            </div>

            <button id="preview-btn" disabled={!canPreview} onClick={() => setStep(1)}
              className="w-full py-3 rounded-xl font-bold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm shadow-sm flex items-center justify-center gap-2">
              <FaEye className="w-3.5 h-3.5" /> Preview & Confirm →
            </button>
          </div>
        )}

        {/* Step 1 — Preview */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Review Before Upload</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Restaurant: <strong className="text-gray-700">{selectedRest?.name}</strong>
                  &nbsp;·&nbsp; Mode:{' '}
                  <strong className={mode === 'replace' ? 'text-red-600' : 'text-brand-600'}>
                    {mode === 'replace' ? '🔄 Replace All' : '➕ Add Only'}
                  </strong>
                </p>
              </div>
              <button onClick={() => setStep(0)} className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                ← Back
              </button>
            </div>

            {mode === 'replace' && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-red-700 text-xs font-medium">
                <FaExclamationTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Replace All:</strong> All <strong>{currentCount ?? '?'}</strong> existing menu items for{' '}
                  <strong>{selectedRest?.name}</strong> will be permanently deleted and replaced with the{' '}
                  <strong>{validRows.length}</strong> valid rows below.
                </span>
              </div>
            )}

            <PreviewTable rows={parsedRows} />

            <div className="flex gap-3 pt-1">
              <button onClick={() => setStep(0)}
                className="flex-1 py-3 rounded-xl font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 text-sm transition-colors">
                ← Back
              </button>
              <button id="confirm-upload-btn" onClick={handleUpload}
                disabled={uploading || validRows.length === 0}
                className={`flex-[2] py-3 rounded-xl font-bold text-white text-sm transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                  mode === 'replace' ? 'bg-red-500 hover:bg-red-600' : 'bg-brand-600 hover:bg-brand-700'}`}>
                {uploading
                  ? <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Uploading…
                    </span>
                  : <span className="flex items-center gap-1.5 justify-center"><FaCheckCircle className="w-4 h-4" /> Confirm & Upload {validRows.length} item{validRows.length !== 1 ? 's' : ''}</span>
                }
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Result */}
        {step === 2 && result && <ResultCard result={result} onReset={reset} />}
      </div>

      {/* Column reference (step 0 only) */}
      {step === 0 && (
        <div className="mt-4 super-card p-5">
          <p className="text-xs font-bold text-gray-600 mb-3 uppercase tracking-wide">📋 CSV / Excel Column Reference</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Column', 'Required', 'Example', 'Notes'].map(h => (
                    <th key={h} className="text-left text-gray-400 font-semibold pb-2 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  ['name',        <span className="flex items-center gap-1"><FaCheckCircle className="text-green-500 w-3.5 h-3.5"/> Yes</span>, 'Butter Chicken', 'Unique key with category'],
                  ['price',       <span className="flex items-center gap-1"><FaCheckCircle className="text-green-500 w-3.5 h-3.5"/> Yes</span>, '350',            'Positive number, no currency symbol'],
                  ['category',    <span className="flex items-center gap-1"><FaCheckCircle className="text-green-500 w-3.5 h-3.5"/> Yes</span>, 'Main Course',    'Groups items on the menu'],
                  ['description', <span className="flex items-center gap-1 text-gray-400"><FaTimesCircle className="w-3.5 h-3.5"/> No</span>,  'Creamy curry',   'Short description for customers'],
                  ['imageUrl',    <span className="flex items-center gap-1 text-gray-400"><FaTimesCircle className="w-3.5 h-3.5"/> No</span>,  'https://…',     'Must start with http or https'],
                  ['available',   <span className="flex items-center gap-1 text-gray-400"><FaTimesCircle className="w-3.5 h-3.5"/> No</span>,  'true',           'true / false (default: true)'],
                ].map(([col, req, ex, note]) => (
                  <tr key={col}>
                    <td className="py-2 pr-4 font-mono font-bold text-gray-700">{col}</td>
                    <td className="py-2 pr-4">{req}</td>
                    <td className="py-2 pr-4 text-gray-500 font-mono">{ex}</td>
                    <td className="py-2 text-gray-400">{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
