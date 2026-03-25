/**
 * Skeleton.jsx — Reusable shimmer skeleton loaders
 */
import React from 'react'

function Bone({ className = '' }) {
  return (
    <div className={`relative overflow-hidden bg-gray-100 rounded-lg ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 shadow-sm">
      <Bone className="w-12 h-12 rounded-2xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Bone className="h-3 w-24 rounded" />
        <Bone className="h-7 w-16 rounded" />
        <Bone className="h-2.5 w-20 rounded" />
      </div>
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5"><Bone className="h-4 w-24 rounded" /><Bone className="h-3 w-36 rounded" /></div>
        <Bone className="w-8 h-8 rounded-xl" />
      </div>
      <div className="flex items-end gap-1 h-40">
        {[60,40,80,55,90,45,70,35,85,50,65,75].map((h, i) => (
          <div key={i} className="flex-1 relative overflow-hidden bg-gray-100 rounded-t-sm">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" style={{ height: `${h}%`, top: `${100-h}%` }} />
            <div style={{ height: `${h}%`, marginTop: `${100-h}%` }} className="bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function OrderRowSkeleton({ count = 5 }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`flex items-center gap-3 px-5 py-4 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
          <Bone className="w-2 h-2 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Bone className="h-3.5 w-32 rounded" />
            <Bone className="h-2.5 w-48 rounded" />
          </div>
          <div className="text-right space-y-1.5">
            <Bone className="h-4 w-16 rounded ml-auto" />
            <Bone className="h-4 w-12 rounded ml-auto" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function MenuSkeleton() {
  return (
    <div className="space-y-4">
      {[3, 4, 2].map((count, ci) => (
        <div key={ci} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between">
            <Bone className="h-4 w-24 rounded" /><Bone className="h-4 w-6 rounded" />
          </div>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
              <Bone className="w-11 h-11 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Bone className="h-3.5 w-36 rounded" /><Bone className="h-2.5 w-24 rounded" /><Bone className="h-3 w-14 rounded mt-1" />
              </div>
              <div className="flex gap-1.5"><Bone className="w-9 h-7 rounded-lg" /><Bone className="w-8 h-8 rounded-lg" /><Bone className="w-8 h-8 rounded-lg" /></div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export function KanbanSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {[3,5,4,2,3].map((count, ci) => (
        <div key={ci} className="flex-shrink-0 w-72 bg-gray-50 rounded-2xl border border-gray-100 p-3 space-y-3">
          <div className="flex items-center justify-between px-1">
            <Bone className="h-4 w-20 rounded" /><Bone className="h-5 w-5 rounded-md" />
          </div>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm space-y-2">
              <div className="flex justify-between"><Bone className="h-3.5 w-24 rounded" /><Bone className="h-3.5 w-8 rounded" /></div>
              <Bone className="h-2.5 w-32 rounded" />
              <div className="flex gap-1.5 pt-1"><Bone className="h-7 flex-1 rounded-lg" /><Bone className="h-7 w-8 rounded-lg" /></div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
