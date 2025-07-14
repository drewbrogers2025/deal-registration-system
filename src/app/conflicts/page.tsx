'use client'

import { useState, useEffect, useCallback } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate, capitalizeFirst } from '@/lib/utils'
import { AlertTriangle, Users, MapPin, Clock, CheckCircle, X } from 'lucide-react'

interface Conflict {
  id: string
  conflict_type: string
  resolution_status: string
  created_at: string
  deal: {
    id: string
    total_value: number
    reseller: {
      id: string
      name: string
      territory: string
    }
    end_user: {
      company_name: string
      territory: string
    }
  }
  competing_deal: {
    id: string
    total_value: number
    reseller: {
      id: string
      name: string
      territory: string
    }
    end_user: {
      company_name: string
      territory: string
    }
  }
}

export default function ConflictsPage() {
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [typeFilter, setTypeFilter] = useState('')

  const loadConflicts = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        limit: '50'
      })

      if (statusFilter) {
        params.append('resolution_status', statusFilter)
      }

      if (typeFilter) {
        params.append('conflict_type', typeFilter)
      }

      const response = await fetch(`/api/conflicts?${params}`)
      if (response.ok) {
        const result = await response.json()
        setConflicts(result.data.items)
      }
    } catch (error) {
      console.error('Error loading conflicts:', error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, typeFilter])

  useEffect(() => {
    loadConflicts()
  }, [statusFilter, typeFilter, loadConflicts])

  const handleResolveConflict = async (conflictId: string, dealId: string, assignedResellerId: string) => {
    try {
      // Assign the deal
      const assignResponse = await fetch(`/api/deals/${dealId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assigned_reseller_id: assignedResellerId,
          reason: 'Conflict resolution'
        }),
      })

      if (assignResponse.ok) {
        // Update conflict status
        const conflictResponse = await fetch('/api/conflicts', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conflict_id: conflictId,
            resolution_status: 'resolved'
          }),
        })

        if (conflictResponse.ok) {
          loadConflicts() // Reload the list
        }
      }
    } catch (error) {
      console.error('Error resolving conflict:', error)
    }
  }

  const handleDismissConflict = async (conflictId: string) => {
    try {
      const response = await fetch('/api/conflicts', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conflict_id: conflictId,
          resolution_status: 'dismissed'
        }),
      })

      if (response.ok) {
        loadConflicts() // Reload the list
      }
    } catch (error) {
      console.error('Error dismissing conflict:', error)
    }
  }

  const getConflictIcon = (type: string) => {
    switch (type) {
      case 'duplicate_end_user':
        return <Users className="h-5 w-5" />
      case 'territory_overlap':
        return <MapPin className="h-5 w-5" />
      case 'timing_conflict':
        return <Clock className="h-5 w-5" />
      default:
        return <AlertTriangle className="h-5 w-5" />
    }
  }

  const getConflictColor = (type: string) => {
    switch (type) {
      case 'duplicate_end_user':
        return 'text-red-600 bg-red-100'
      case 'territory_overlap':
        return 'text-orange-600 bg-orange-100'
      case 'timing_conflict':
        return 'text-yellow-600 bg-yellow-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getPriorityLevel = (conflict: Conflict) => {
    const dealValue = Math.max(conflict.deal.total_value, conflict.competing_deal.total_value)
    const daysSinceCreated = Math.floor(
      (new Date().getTime() - new Date(conflict.created_at).getTime()) / (1000 * 60 * 60 * 24)
    )

    if (dealValue > 100000 || daysSinceCreated > 7) return 'high'
    if (dealValue > 50000 || daysSinceCreated > 3) return 'medium'
    return 'low'
  }

  return (
    <MainLayout 
      title="Deal Conflicts" 
      subtitle="Resolve conflicts and assign deals to appropriate resellers"
    >
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex space-x-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="">All Types</option>
            <option value="duplicate_end_user">Duplicate End User</option>
            <option value="territory_overlap">Territory Overlap</option>
            <option value="timing_conflict">Timing Conflict</option>
          </select>
        </div>

        {/* Conflicts List */}
        <div className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="text-center py-8">
                Loading conflicts...
              </CardContent>
            </Card>
          ) : conflicts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8 text-gray-500">
                No conflicts found matching your criteria
              </CardContent>
            </Card>
          ) : (
            conflicts.map((conflict) => {
              const priority = getPriorityLevel(conflict)
              return (
                <Card key={conflict.id} className="border-l-4 border-l-orange-400">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${getConflictColor(conflict.conflict_type)}`}>
                          {getConflictIcon(conflict.conflict_type)}
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {capitalizeFirst(conflict.conflict_type.replace('_', ' '))}
                          </CardTitle>
                          <p className="text-sm text-gray-600">
                            {conflict.deal.end_user.company_name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={priority === 'high' ? 'error' : priority === 'medium' ? 'warning' : 'secondary'}
                        >
                          {priority} priority
                        </Badge>
                        <Badge variant={conflict.resolution_status === 'pending' ? 'warning' : 'success'}>
                          {conflict.resolution_status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Deal 1 */}
                      <div className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-3 text-blue-600">Deal #1</h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium">End User:</span> {conflict.deal.end_user.company_name}
                          </div>
                          <div>
                            <span className="font-medium">Reseller:</span> {conflict.deal.reseller.name}
                          </div>
                          <div>
                            <span className="font-medium">Territory:</span> {conflict.deal.reseller.territory}
                          </div>
                          <div>
                            <span className="font-medium">Value:</span> {formatCurrency(conflict.deal.total_value)}
                          </div>
                        </div>
                        {conflict.resolution_status === 'pending' && (
                          <Button
                            className="w-full mt-3"
                            size="sm"
                            onClick={() => handleResolveConflict(
                              conflict.id,
                              conflict.deal.id,
                              conflict.deal.reseller.id
                            )}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Assign to This Reseller
                          </Button>
                        )}
                      </div>

                      {/* Deal 2 */}
                      <div className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-3 text-green-600">Deal #2</h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium">End User:</span> {conflict.competing_deal.end_user.company_name}
                          </div>
                          <div>
                            <span className="font-medium">Reseller:</span> {conflict.competing_deal.reseller.name}
                          </div>
                          <div>
                            <span className="font-medium">Territory:</span> {conflict.competing_deal.reseller.territory}
                          </div>
                          <div>
                            <span className="font-medium">Value:</span> {formatCurrency(conflict.competing_deal.total_value)}
                          </div>
                        </div>
                        {conflict.resolution_status === 'pending' && (
                          <Button
                            className="w-full mt-3"
                            size="sm"
                            onClick={() => handleResolveConflict(
                              conflict.id,
                              conflict.competing_deal.id,
                              conflict.competing_deal.reseller.id
                            )}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Assign to This Reseller
                          </Button>
                        )}
                      </div>
                    </div>

                    {conflict.resolution_status === 'pending' && (
                      <div className="flex justify-center mt-4">
                        <Button
                          variant="outline"
                          onClick={() => handleDismissConflict(conflict.id)}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Dismiss Conflict
                        </Button>
                      </div>
                    )}

                    <div className="mt-4 text-xs text-gray-500">
                      Conflict detected on {formatDate(conflict.created_at)}
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>
    </MainLayout>
  )
}
