/**
 * QRGeneratorPage — Generates QR codes for each table
 * Theme: Dark red/white — consistent with kitchen dashboard
 */
import React, { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Link } from 'react-router-dom'
import { FaArrowLeft, FaQrcode, FaPrint } from 'react-icons/fa'

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
        <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:'Inter',sans-serif;gap:12px;background:#fff">
          <h2 style="font-size:22px;font-weight:800;margin:0;color:#111">Table #${tableNum}</h2>
          <p style="color:#888;font-size:13px;margin:0">Scan to order</p>
          <div id="qr"></div>
          <p style="font-size:11px;color:#bbb;margin:0">${url}</p>
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
      <header className="bg-gray-900 border-b border-white/8 sticky top-0 z-20 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            to="/kitchen"
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/8 hover:bg-white/15 transition-colors"
          >
            <FaArrowLeft className="w-4 h-4 text-gray-400" />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-700 rounded-lg flex items-center justify-center">
              <FaQrcode className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-base font-extrabold text-white">QR Code Generator</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Controls */}
        <div className="bg-gray-900 rounded-2xl border border-white/8 p-5 mb-8 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-48">
            <label className="label-dark text-sm">Number of Tables</label>
            <input
              type="number"
              min={1}
              max={50}
              value={tableCount}
              onChange={e => setTableCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="input-dark w-full"
            />
          </div>
          <div className="flex-1 min-w-48">
            <label className="label-dark text-sm">Base URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              className="input-dark w-full text-sm"
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
                className="bg-white rounded-2xl p-4 flex flex-col items-center gap-3 hover:shadow-xl hover:shadow-brand-600/20 hover:-translate-y-0.5 transition-all duration-200 border border-gray-100"
              >
                <p className="font-extrabold text-gray-900 text-sm">Table #{tableNum}</p>
                <div className="bg-white p-1.5 rounded-xl border border-gray-100">
                  <QRCodeSVG
                    value={url}
                    size={130}
                    bgColor="#ffffff"
                    fgColor="#111111"
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <p className="text-gray-400 text-[10px] text-center break-all leading-tight">{url}</p>
                <button
                  onClick={() => printQR(tableNum)}
                  className="w-full flex items-center justify-center gap-1.5 text-xs bg-brand-50 border border-brand-100 hover:bg-brand-100 text-brand-700 font-semibold py-2 px-3 rounded-xl transition-colors"
                >
                  <FaPrint className="w-3.5 h-3.5" />
                  Print
                </button>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
