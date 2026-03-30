// QRTab.jsx
import React, { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { FaPrint, FaQrcode, FaExclamationTriangle } from 'react-icons/fa'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

export function QRTab({ restaurantId }) {
  const [baseUrl, setBaseUrl] = useState(window.location.origin)
  const [tables, setTables]   = useState(10)

  // Guard: no restaurant linked
  if (!restaurantId) {
    return (
      <Card className="border-amber-200 bg-amber-50 max-w-lg">
        <CardContent className="p-6 text-center">
          <FaExclamationTriangle className="w-8 h-8 mx-auto mb-3 text-amber-500" />
          <p className="text-amber-700 font-bold text-base">No restaurant linked to your account.</p>
          <p className="text-amber-600 text-sm mt-1">
            Contact your Super Admin to link a restaurant before generating QR codes.
          </p>
        </CardContent>
      </Card>
    )
  }

  const qrUrl = t => `${baseUrl}/menu?table=${t}&rid=${restaurantId}`

  return (
    <div className="space-y-5">

      {/* ── Config card ─────────────────────────────────────────────── */}
      <Card className="border-gray-100 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold">QR Code Generator</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Print QR codes for each table — customers scan to place orders
              </CardDescription>
            </div>
            <div className="w-8 h-8 bg-brand-50 rounded-xl flex items-center justify-center">
              <FaQrcode className="w-4 h-4 text-brand-600" />
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4 flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-52">
            <Label htmlFor="base-url" className="text-xs font-semibold mb-1.5 block">
              Base URL
            </Label>
            <Input
              id="base-url"
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="w-28">
            <Label htmlFor="table-count" className="text-xs font-semibold mb-1.5 block">
              Number of Tables
            </Label>
            <Input
              id="table-count"
              type="number"
              min={1}
              max={100}
              value={tables}
              onChange={e => setTables(parseInt(e.target.value) || 1)}
              className="h-9 text-sm"
            />
          </div>
          <Button
            onClick={() => window.print()}
            className="gap-2 print:hidden h-9"
          >
            <FaPrint className="w-3.5 h-3.5" />
            Print All
          </Button>
        </CardContent>
      </Card>

      {/* ── QR Grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
        {Array.from({ length: tables }, (_, i) => i + 1).map(t => (
          <Card
            key={t}
            className="border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col items-center gap-2.5 p-4"
          >
            <div className="flex items-center justify-between w-full">
              <p className="font-extrabold text-gray-900 text-sm">Table {t}</p>
              <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0.5 text-brand-600 border-brand-200 bg-brand-50">
                #{t}
              </Badge>
            </div>
            <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
              <QRCodeSVG value={qrUrl(t)} size={96} bgColor="#f9fafb" fgColor="#111111" level="M" />
            </div>
            <p className="text-gray-400 text-[9px] text-center break-all leading-tight">
              /menu?table={t}
            </p>
          </Card>
        ))}
      </div>

    </div>
  )
}
