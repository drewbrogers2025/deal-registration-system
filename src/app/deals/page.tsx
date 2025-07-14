'use client'

import { useState, useEffect, useCallback } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SearchFilter, type ActiveFilter } from '@/components/ui/search-filter'
import { BulkOperations, commonBulkActions } from '@/components/ui/bulk-operations'
import { SkeletonTable } from '@/components/ui/skeleton'
import { MobileList, MobileListItem } from '@/components/mobile/mobile-layout'
import { useMobileDetection } from '@/hooks/use-mobile-detection'
import { useRolePermissions } from '@/hooks/use-role-permissions'
import { exportData, createExportColumns } from '@/lib/export-utils'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Search, Plus, Eye, AlertTriangle, Download, Filter } from 'lucide-react'
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
  conflicts: unknown[]
}

export default function DealsPage() {
  const { isMobile } = useMobileDetection()
  const { hasPermission } = useRolePermissions()
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([])
  const [selectedDeals, setSelectedDeals] = useState<Deal[]>([])
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')

  // Filter groups for advanced filtering
  const filterGroups = [
    {
      key: 'status',
      label: 'Status',
      type: 'multiple' as const,
      options: [
        { value: 'pending', label: 'Pending', count: deals.filter(d => d.status === 'pending').length },
        { value: 'assigned', label: 'Assigned', count: deals.filter(d => d.status === 'assigned').length },
        { value: 'disputed', label: 'Disputed', count: deals.filter(d => d.status === 'disputed').length },
        { value: 'approved', label: 'Approved', count: deals.filter(d => d.status === 'approved').length },
        { value: 'rejected', label: 'Rejected', count: deals.filter(d => d.status === 'rejected').length },
      ],
    },
    {
      key: 'territory',
      label: 'Territory',
      type: 'multiple' as const,
      searchable: true,
      options: Array.from(new Set(deals.map(d => d.end_user.territory)))
        .map(territory => ({
          value: territory,
          label: territory,
          count: deals.filter(d => d.end_user.territory === territory).length,
        })),
    },
  ]

  // Bulk actions
  const bulkActions = [
    ...commonBulkActions.filter(action => {
      switch (action.id) {
        case 'edit':
          return hasPermission('canAssignDeals')
        case 'delete':
          return hasPermission('canManageSettings')
        default:
          return true
      }
    }),
    {
      id: 'assign',
      label: 'Assign Deals',
      icon: Eye,
      variant: 'outline' as const,
      disabled: !hasPermission('canAssignDeals'),
    },
  ]

  const loadDeals = useCallback(async () => {
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
  }, [page, statusFilter])

  useEffect(() => {
    loadDeals()
  }, [page, statusFilter, loadDeals])

  // Selection handlers
  const handleSelectAll = () => {
    setSelectedDeals(filteredDeals)
  }

  const handleSelectNone = () => {
    setSelectedDeals([])
  }

  const handleSelectInvert = () => {
    const currentIds = new Set(selectedDeals.map(d => d.id))
    const inverted = filteredDeals.filter(deal => !currentIds.has(deal.id))
    setSelectedDeals(inverted)
  }

  const handleDealSelect = (deal: Deal, selected: boolean) => {
    if (selected) {
      setSelectedDeals(prev => [...prev, deal])
    } else {
      setSelectedDeals(prev => prev.filter(d => d.id !== deal.id))
    }
  }

  // Bulk action handler
  const handleBulkAction = async (actionId: string, items: Deal[]) => {
    switch (actionId) {
      case 'export':
        handleExport('csv', items)
        break
      case 'assign':
        console.log('Assign deals:', items)
        break
      case 'delete':
        console.log('Delete deals:', items)
        break
      default:
        console.log(`Unknown action: ${actionId}`)
    }
  }

  // Export handler
  const handleExport = (format: 'csv' | 'excel' | 'pdf', dealsToExport = filteredDeals) => {
    const exportColumns = createExportColumns([
      { key: 'id', title: 'Deal ID', width: 15 },
      { key: 'end_user.company_name', title: 'Company', width: 25 },
      { key: 'reseller.name', title: 'Reseller', width: 25 },
      { key: 'total_value', title: 'Value', width: 15, type: 'currency' },
      { key: 'status', title: 'Status', width: 15, type: 'status' },
      { key: 'submission_date', title: 'Date', width: 15, type: 'date' },
    ])

    exportData(format, {
      filename: 'deals-export',
      title: 'Deals Export',
      columns: exportColumns,
      data: dealsToExport,
    })
  }

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
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold">
              {filteredDeals.length} Deal{filteredDeals.length !== 1 ? 's' : ''}
            </h2>

            {hasPermission('canExportData') && (
              <div className="relative group">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>

                <div className="absolute left-0 top-full mt-1 w-32 bg-white border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  <div className="py-1">
                    <button
                      onClick={() => handleExport('csv')}
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                    >
                      Export CSV
                    </button>
                    <button
                      onClick={() => handleExport('excel')}
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                    >
                      Export Excel
                    </button>
                    <button
                      onClick={() => handleExport('pdf')}
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                    >
                      Export PDF
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Link href="/deals/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Deal Registration
            </Button>
          </Link>
        </div>

        {/* Enhanced Search and Filters */}
        <SearchFilter
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          filterGroups={filterGroups}
          activeFilters={activeFilters}
          onFilterChange={setActiveFilters}
          placeholder="Search deals, companies, resellers..."
        />

        {/* Bulk Operations */}
        {selectedDeals.length > 0 && (
          <BulkOperations
            selectedItems={selectedDeals}
            totalItems={filteredDeals.length}
            onSelectAll={handleSelectAll}
            onSelectNone={handleSelectNone}
            onSelectInvert={handleSelectInvert}
            actions={bulkActions}
            onAction={handleBulkAction}
          />
        )}

        {/* Deals List */}
        <Card>
          <CardHeader>
            <CardTitle>Deal Registrations</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <SkeletonTable rows={5} />
            ) : filteredDeals.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No deals found matching your criteria
              </div>
            ) : isMobile ? (
              <MobileList>
                {filteredDeals.map((deal) => {
                  const isSelected = selectedDeals.some(d => d.id === deal.id)

                  return (
                    <MobileListItem
                      key={deal.id}
                      title={deal.end_user.company_name}
                      subtitle={`${deal.reseller.name} • ${formatCurrency(deal.total_value)}`}
                      icon={
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleDealSelect(deal, e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      }
                      action={
                        <div className="flex items-center space-x-2">
                          <Badge variant={getStatusBadgeVariant(deal.status)}>
                            {deal.status}
                          </Badge>
                          {deal.conflicts.length > 0 && (
                            <Badge variant="error">
                              <AlertTriangle className="h-3 w-3" />
                            </Badge>
                          )}
                        </div>
                      }
                      onClick={() => {
                        // Navigate to deal details
                        console.log('Navigate to deal:', deal.id)
                      }}
                    />
                  )
                })}
              </MobileList>
            ) : (
              <div className="space-y-4">
                {filteredDeals.map((deal) => {
                  const isSelected = selectedDeals.some(d => d.id === deal.id)

                  return (
                    <div
                      key={deal.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleDealSelect(deal, e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />

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
                  )
                })}
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
