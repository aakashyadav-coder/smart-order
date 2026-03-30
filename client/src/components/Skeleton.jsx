/**
 * Skeleton.jsx — Shimmer skeleton loaders built on shadcn Skeleton primitive
 */
import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

export function StatCardSkeleton() {
  return (
    <Card className="p-5 flex items-center gap-4">
      <Skeleton className="w-12 h-12 rounded-2xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-2.5 w-20" />
      </div>
    </Card>
  )
}

export function ChartSkeleton() {
  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-36" />
        </div>
        <Skeleton className="w-8 h-8 rounded-xl" />
      </div>
      <div className="flex items-end gap-1 h-40">
        {[60, 40, 80, 55, 90, 45, 70, 35, 85, 50, 65, 75].map((h, i) => (
          <Skeleton key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%` }} />
        ))}
      </div>
    </Card>
  )
}

export function OrderRowSkeleton({ count = 5 }) {
  return (
    <Card className="overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`flex items-center gap-3 px-5 py-4 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
          <Skeleton className="w-2 h-2 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-2.5 w-48" />
          </div>
          <div className="text-right space-y-1.5">
            <Skeleton className="h-4 w-16 ml-auto" />
            <Skeleton className="h-4 w-12 ml-auto" />
          </div>
        </div>
      ))}
    </Card>
  )
}

export function MenuSkeleton() {
  return (
    <div className="space-y-4">
      {[3, 4, 2].map((count, ci) => (
        <Card key={ci} className="overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-6" />
          </div>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
              <Skeleton className="w-11 h-11 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-2.5 w-24" />
                <Skeleton className="h-3 w-14 mt-1" />
              </div>
              <div className="flex gap-1.5">
                <Skeleton className="w-9 h-7 rounded-lg" />
                <Skeleton className="w-8 h-8 rounded-lg" />
                <Skeleton className="w-8 h-8 rounded-lg" />
              </div>
            </div>
          ))}
        </Card>
      ))}
    </div>
  )
}

export function KanbanSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {[3, 5, 4, 2, 3].map((count, ci) => (
        <div key={ci} className="flex-shrink-0 w-72 bg-gray-50 rounded-2xl border border-gray-100 p-3 space-y-3">
          <div className="flex items-center justify-between px-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-5 rounded-md" />
          </div>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3.5 w-8" />
              </div>
              <Skeleton className="h-2.5 w-32" />
              <div className="flex gap-1.5 pt-1">
                <Skeleton className="h-7 flex-1 rounded-lg" />
                <Skeleton className="h-7 w-8 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
