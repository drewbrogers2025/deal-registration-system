'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils'
import { Search, Filter, Plus, Eye, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

interface Deal {
  id: string
  status: string
  total_value: number
  submission_date: string
  reseller: {
    name: string
    territory: string
  }
  end_user: {
    company_name: string
    territory: string
  }
  assigned_reseller?: {
    name: string
  }
  conflicts: any[]
}

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const loadDeals = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      })

      if (statusFilter) {
        params.append('status', statusFilter)
      }

      const response = await fetch(`/api/deals?${params}`)
      if (response.ok) {
        const result = await response.json()
        setDeals(result.data.items)
        setTotalPages(result.data.totalPages)
      }
    } catch (error) {
      console.error('Error loading deals:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDeals()
  }, [page, statusFilter])

  const filteredDeals = deals.filter(deal =>
    deal.end_user.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    deal.reseller.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'warning'
      case 'assigned': return 'success'
      case 'disputed': return 'error'
      case 'approved': return 'success'
      case 'rejected': return 'secondary'
      default: return 'secondary'
    }
  }

  return (
    <MainLayout 
      title="Deal Registrations" 
      subtitle="Manage and track all deal registrations"
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <div className="flex space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search deals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="disputed">Disputed</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <Link href="/deals/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Deal Registration
            </Button>
          </Link>
        </div>

        {/* Deals List */}
        <Card>
          <CardHeader>
            <CardTitle>Deal Registrations</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading deals...</div>
            ) : filteredDeals.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No deals found matching your criteria
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDeals.map((deal) => (
                  <div
                    key={deal.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-lg">
                            {deal.end_user.company_name}
                          </h3>
                          <Badge variant={getStatusBadgeVariant(deal.status)}>
                            {deal.status}
                          </Badge>
                          {deal.conflicts.length > 0 && (
                            <Badge variant="error" className="flex items-center">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {deal.conflicts.length} conflict{deal.conflicts.length > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Submitted by:</span>
                            <br />
                            {deal.reseller.name}
                          </div>
                          <div>
                            <span className="font-medium">Territory:</span>
                            <br />
                            {deal.end_user.territory}
                          </div>
                          <div>
                            <span className="font-medium">Value:</span>
                            <br />
                            <span className="font-semibold text-green-600">
                              {formatCurrency(deal.total_value)}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">Submitted:</span>
                            <br />
                            {formatDate(deal.submission_date)}
                          </div>
                        </div>

                        {deal.assigned_reseller && (
                          <div className="mt-2 text-sm">
                            <span className="font-medium text-green-600">
                              Assigned to: {deal.assigned_reseller.name}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex space-x-2">
                        <Link href={`/deals/${deal.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center space-x-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                
                <span className="flex items-center px-4">
                  Page {page} of {totalPages}
                </span>
                
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
