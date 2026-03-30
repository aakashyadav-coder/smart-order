// StaffTab.jsx
import React, { useEffect, useState } from 'react'
import { FaUsers } from 'react-icons/fa'
import api from '../../lib/api'

import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

const ROLE_STYLE = {
  OWNER:   'bg-brand-50 text-brand-700 border-brand-200',
  KITCHEN: 'bg-blue-50 text-blue-700 border-blue-200',
  ADMIN:   'bg-purple-50 text-purple-700 border-purple-200',
}

export function StaffTab() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/restaurant/staff')
      .then(r => setUsers(r.data))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="max-w-2xl space-y-3">
        {[1, 2, 3].map(i => (
          <Card key={i} className="border-gray-100 shadow-sm p-4 flex items-center gap-4">
            <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-32 rounded" />
              <Skeleton className="h-2.5 w-48 rounded" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </Card>
        ))}
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-16">
        <FaUsers className="w-12 h-12 mx-auto mb-3 text-gray-200" />
        <p className="font-semibold text-gray-500">No staff yet</p>
        <p className="text-gray-400 text-sm mt-1">Add staff from Super Admin portal</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <Card className="border-gray-100 shadow-sm overflow-hidden">
        {users.map((u, i) => (
          <div
            key={u.id}
            className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors ${
              i > 0 ? 'border-t border-gray-100' : ''
            }`}
          >
            <Avatar className="w-10 h-10 flex-shrink-0">
              <AvatarFallback className="bg-gradient-to-br from-brand-500 to-brand-700 text-white font-bold text-sm">
                {u.name?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">{u.name}</p>
              <p className="text-gray-400 text-xs truncate">{u.email}</p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge
                variant="outline"
                className={`text-xs font-bold ${ROLE_STYLE[u.role] || 'bg-gray-100 text-gray-500 border-gray-200'}`}
              >
                {u.role}
              </Badge>
              <Badge
                variant="outline"
                className={`text-xs ${
                  u.active
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-red-50 text-red-600 border-red-200'
                }`}
              >
                {u.active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
        ))}
      </Card>
    </div>
  )
}
