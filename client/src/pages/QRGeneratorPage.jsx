/**
 * QRGeneratorPage — generates QR codes for each table
 * Protected route — only accessible to authenticated kitchen/admin staff
 */
import React, { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Link } from 'react-router-dom'

const DEFAULT_TABLE_COUNT = 10

export default function QRGeneratorPage() {
  const [tableCount, setTableCount] = useState(DEFAULT_TABLE_COUNT)
  const [baseUrl, setBaseUrl] = useState(
    typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}/menu` : ''
  )

  const printQR = (tableNum) => {
    const url = `${baseUrl}?table=${tableNum}`
    const win = window.open('', '_blank')
    win.document.write(`
      <html>
        <head><title>Table ${tableNum} QR Code</title></head>
        <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;gap:12px">
          <h2 style="font-size:22px;font-weight:bold;margin:0">Table #${tableNum}</h2>
          <p style="color:#666;font-size:13px;margin:0">Scan to order</p>
          <div id="qr"></div>
          <p style="font-size:11px;color:#999;margin:0">${url}</p>
          <script src="https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js"><\/script>
          <script>QRCode.toCanvas(document.createElement('canvas'), '${url}', function(err, canvas){if(!err){document.getElementById('qr').appendChild(canvas)}})<\/script>
        </body>
      </html>
    `)
    win.document.close()
    setTimeout(() => win.print(), 500)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/kitchen" className="text-gray-400 hover:text-white text-sm transition-colors">← Dashboard</Link>
            <h1 className="text-lg font-extrabold">QR Code Generator</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Controls */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 mb-8 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-48">
            <label className="label text-gray-300 text-sm">Number of Tables</label>
            <input
              type="number"
              min={1}
              max={50}
              value={tableCount}
              onChange={e => setTableCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="input bg-gray-800 border-gray-700 text-white focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <div className="flex-1 min-w-48">
            <label className="label text-gray-300 text-sm">Base URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              className="input bg-gray-800 border-gray-700 text-white focus:ring-brand-500 focus:border-brand-500 text-sm"
            />
          </div>
        </div>

        {/* QR Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: tableCount }, (_, i) => i + 1).map(tableNum => {
            const url = `${baseUrl}?table=${tableNum}`
            return (
              <div
                key={tableNum}
                className="bg-white rounded-2xl p-4 flex flex-col items-center gap-3 hover:shadow-lg hover:shadow-brand-500/20 transition-all"
              >
                <p className="font-extrabold text-gray-900 text-sm">Table #{tableNum}</p>
                <div className="bg-white p-1 rounded-xl">
                  <QRCodeSVG
                    value={url}
                    size={140}
                    bgColor="#ffffff"
                    fgColor="#1a1a1a"
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <p className="text-gray-400 text-xs text-center break-all leading-tight">{url}</p>
                <button
                  onClick={() => printQR(tableNum)}
                  className="w-full text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-3 rounded-xl transition-colors"
                >
                  🖨 Print
                </button>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
