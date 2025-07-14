'use client'

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { InteractiveChart } from '@/components/charts/interactive-charts'
import { SearchFilter } from '@/components/ui/search-filter'
import { useRolePermissions } from '@/hooks/use-role-permissions'
import { exportData, createExportColumns } from '@/lib/export-utils'
import { cn } from '@/lib/utils'
import {
  BarChart3,
  Download,
  Calendar,
  Filter,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  PoundSterling,
  AlertTriangle,
} from 'lucide-react'

interface ReportMetric {
  id: string
  title: string
  value: string | number
  change?: number
  changeType?: 'increase' | 'decrease'
  icon: React.ComponentType<{ className?: string }>
  color?: string
}

interface ReportFilter {
  dateRange: {
    from: string
    to: string
  }
  status: string[]
  territory: string[]
  reseller: string[]
}

interface ReportDashboardProps {
  className?: string
}

export function ReportDashboard({ className }: ReportDashboardProps) {
  const { hasPermission, userProfile } = useRolePermissions()
  const [loading, setLoading] = React.useState(false)
  const [filters, setFilters] = React.useState<ReportFilter>({
    dateRange: {
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      to: new Date().toISOString().split('T')[0],
    },
    status: [],
    territory: [],
    reseller: [],
  })

  // Sample data - would be fetched from API
  const metrics: ReportMetric[] = [
    {
      id: 'total-deals',
      title: 'Total Deals',
      value: 156,
      change: 12,
      changeType: 'increase',
      icon: FileText,
      color: 'blue',
    },
    {
      id: 'total-revenue',
      title: 'Total Revenue',
      value: '£2.45M',
      change: 8,
      changeType: 'increase',
      icon: PoundSterling,
      color: 'green',
    },
    {
      id: 'active-resellers',
      title: 'Active Resellers',
      value: 45,
      change: -3,
      changeType: 'decrease',
      icon: Users,
      color: 'purple',
    },
    {
      id: 'pending-conflicts',
      title: 'Pending Conflicts',
      value: 8,
      change: -25,
      changeType: 'decrease',
      icon: AlertTriangle,
      color: 'red',
    },
  ]

  const chartData = [
    { month: 'Jan', deals: 12, revenue: 145000, conflicts: 2 },
    { month: 'Feb', deals: 19, revenue: 230000, conflicts: 3 },
    { month: 'Mar', deals: 15, revenue: 180000, conflicts: 1 },
    { month: 'Apr', deals: 22, revenue: 290000, conflicts: 4 },
    { month: 'May', deals: 18, revenue: 220000, conflicts: 2 },
    { month: 'Jun', deals: 25, revenue: 340000, conflicts: 1 },
  ]

  const filterGroups = [
    {
      key: 'status',
      label: 'Status',
      type: 'multiple' as const,
      options: [
        { value: 'pending', label: 'Pending', count: 23 },
        { value: 'assigned', label: 'Assigned', count: 89 },
        { value: 'disputed', label: 'Disputed', count: 8 },
        { value: 'approved', label: 'Approved', count: 32 },
        { value: 'rejected', label: 'Rejected', count: 4 },
      ],
    },
    {
      key: 'territory',
      label: 'Territory',
      type: 'multiple' as const,
      searchable: true,
      options: [
        { value: 'uk-north', label: 'UK North', count: 45 },
        { value: 'uk-south', label: 'UK South', count: 67 },
        { value: 'europe', label: 'Europe', count: 34 },
        { value: 'americas', label: 'Americas', count: 10 },
      ],
    },
  ]

  const handleRefresh = async () => {
    setLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setLoading(false)
  }

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    const exportColumns = createExportColumns([
      { key: 'id', title: 'Deal ID', width: 15 },
      { key: 'company', title: 'Company', width: 25 },
      { key: 'reseller', title: 'Reseller', width: 25 },
      { key: 'value', title: 'Value', width: 15, type: 'currency' },
      { key: 'status', title: 'Status', width: 15, type: 'status' },
      { key: 'date', title: 'Date', width: 15, type: 'date' },
    ])

    const sampleData = [
      {
        id: 'DEAL-001',
        company: 'Acme Corp',
        reseller: 'TechPartner Solutions',
        value: 125000,
        status: 'pending',
        date: '2024-01-15',
      },
      // Add more sample data...
    ]

    exportData(format, {
      filename: 'deals-report',
      title: 'Deals Report',
      subtitle: `Generated for ${userProfile?.name} on ${new Date().toLocaleDateString()}`,
      columns: exportColumns,
      data: sampleData,
    })
  }

  if (!hasPermission('canViewReports')) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <p className="text-red-800">You don't have permission to view reports.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600">Comprehensive insights into your deal registration system</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
          
          <div className="relative group">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            
            <div className="absolute right-0 top-full mt-1 w-32 bg-white border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
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
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  value={filters.dateRange.from}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, from: e.target.value }
                  }))}
                  className="flex-1 px-3 py-2 border rounded-md"
                />
                <input
                  type="date"
                  value={filters.dateRange.to}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, to: e.target.value }
                  }))}
                  className="flex-1 px-3 py-2 border rounded-md"
                />
              </div>
            </div>
          </div>
          
          <SearchFilter
            searchValue=""
            onSearchChange={() => {}}
            filterGroups={filterGroups}
            activeFilters={[]}
            onFilterChange={() => {}}
            placeholder="Search deals, resellers, companies..."
          />
        </CardContent>
      </Card>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => {
          const Icon = metric.icon
          
          return (
            <Card key={metric.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                    {metric.change && (
                      <div className="flex items-center mt-1">
                        {metric.changeType === 'increase' ? (
                          <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                        )}
                        <span className={cn(
                          "text-sm font-medium",
                          metric.changeType === 'increase' ? "text-green-600" : "text-red-600"
                        )}>
                          {metric.change > 0 ? '+' : ''}{metric.change}%
                        </span>
                        <span className="text-sm text-gray-500 ml-1">vs last month</span>
                      </div>
                    )}
                  </div>
                  <Icon className={cn(
                    "h-8 w-8",
                    metric.color === 'blue' && "text-blue-600",
                    metric.color === 'green' && "text-green-600",
                    metric.color === 'purple' && "text-purple-600",
                    metric.color === 'red' && "text-red-600"
                  )} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InteractiveChart
          config={{
            type: 'line',
            title: 'Deals Trend',
            data: chartData,
            xAxisKey: 'month',
            dataKeys: ['deals'],
            showGrid: true,
            showLegend: false,
          }}
          onRefresh={handleRefresh}
          loading={loading}
          onExport={(format) => console.log(`Export chart as ${format}`)}
        />
        
        <InteractiveChart
          config={{
            type: 'bar',
            title: 'Revenue by Month',
            data: chartData,
            xAxisKey: 'month',
            dataKeys: ['revenue'],
            showGrid: true,
            showLegend: false,
          }}
          onRefresh={handleRefresh}
          loading={loading}
          onExport={(format) => console.log(`Export chart as ${format}`)}
        />
        
        <InteractiveChart
          config={{
            type: 'area',
            title: 'Conflicts Over Time',
            data: chartData,
            xAxisKey: 'month',
            dataKeys: ['conflicts'],
            showGrid: true,
            showLegend: false,
          }}
          onRefresh={handleRefresh}
          loading={loading}
          onExport={(format) => console.log(`Export chart as ${format}`)}
        />
        
        <InteractiveChart
          config={{
            type: 'pie',
            title: 'Deals by Status',
            data: [
              { status: 'Pending', count: 23 },
              { status: 'Assigned', count: 89 },
              { status: 'Disputed', count: 8 },
              { status: 'Approved', count: 32 },
              { status: 'Rejected', count: 4 },
            ],
            xAxisKey: 'status',
            dataKeys: ['count'],
            showLegend: true,
          }}
          onRefresh={handleRefresh}
          loading={loading}
          onExport={(format) => console.log(`Export chart as ${format}`)}
        />
      </div>
    </div>
  )
}
