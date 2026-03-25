/**
 * Heatmap.jsx — 7-day × 24-hour peak hours heatmap
 * Shows intensity of orders for each hour of each day.
 */
import React, { useMemo } from 'react'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

function fmtHour(h) {
  if (h === 0) return '12a'
  if (h === 12) return '12p'
  return h < 12 ? `${h}a` : `${h - 12}p`
}

function intensityClass(val, max) {
  if (max === 0 || val === 0) return 'bg-gray-100 text-transparent'
  const pct = val / max
  if (pct > 0.85) return 'bg-brand-600 text-white'
  if (pct > 0.65) return 'bg-brand-500 text-white'
  if (pct > 0.45) return 'bg-brand-400 text-white'
  if (pct > 0.25) return 'bg-brand-200 text-brand-800'
  if (pct > 0.08) return 'bg-brand-100 text-brand-700'
  return 'bg-gray-50 text-transparent'
}

export default function Heatmap({ orders }) {
  const { grid, max } = useMemo(() => {
    // grid[day][hour] = count
    const g = Array.from({ length: 7 }, () => Array(24).fill(0))
    let mx = 0
    orders.forEach(o => {
      const d = new Date(o.createdAt)
      const day = d.getDay()
      const hour = d.getHours()
      g[day][hour]++
      if (g[day][hour] > mx) mx = g[day][hour]
    })
    return { grid: g, max: mx }
  }, [orders])

  const showHours = [0, 3, 6, 9, 12, 15, 18, 21, 23]

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-bold text-gray-900">Peak Hours</h3>
          <p className="text-xs text-gray-400 mt-0.5">Order volume by day & hour</p>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
          <span>Low</span>
          {['bg-brand-100','bg-brand-200','bg-brand-400','bg-brand-500','bg-brand-600'].map(c => (
            <span key={c} className={`w-4 h-4 rounded-sm ${c} inline-block`} />
          ))}
          <span>High</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[560px]">
          {/* Hour labels */}
          <div className="flex mb-1.5 pl-10">
            {HOURS.map(h => (
              <div key={h} className="flex-1 text-center text-[9px] text-gray-400 font-medium">
                {showHours.includes(h) ? fmtHour(h) : ''}
              </div>
            ))}
          </div>
          {/* Rows */}
          {DAYS.map((day, di) => (
            <div key={day} className="flex items-center gap-0.5 mb-0.5">
              <div className="w-9 text-[10px] text-gray-400 font-semibold text-right pr-2 flex-shrink-0">{day}</div>
              {HOURS.map(h => {
                const val = grid[di][h]
                const cls = intensityClass(val, max)
                return (
                  <div key={h} title={val > 0 ? `${day} ${fmtHour(h)}: ${val} order${val !== 1 ? 's' : ''}` : ''}
                    className={`flex-1 h-5 rounded-sm ${cls} text-[8px] flex items-center justify-center font-bold cursor-default transition-all duration-200 hover:ring-2 hover:ring-brand-400 hover:ring-offset-1`}>
                    {val > 0 && max > 0 && val / max > 0.35 ? val : ''}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {max === 0 && (
        <p className="text-center text-gray-400 text-sm mt-4 py-4">No order data yet — heatmap will populate as orders come in.</p>
      )}
    </div>
  )
}
