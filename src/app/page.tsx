'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { CustomizableWidgets } from '@/components/dashboard/customizable-widgets'
import { InteractiveChart } from '@/components/charts/interactive-charts'
import { useDashboardWidgets } from '@/hooks/use-dashboard-widgets'
import { useRolePermissions } from '@/hooks/use-role-permissions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SkeletonDashboard } from '@/components/ui/skeleton'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  Plus,
  Settings,
  RefreshCw,
  BarChart3,
  TrendingUp,
  Activity,
} from 'lucide-react'

export default function Dashboard() {
  const { userProfile, hasPermission, loading: roleLoading } = useRolePermissions()
  const {
    widgets,
    data,
    loading: widgetsLoading,
    error,
    saveWidgets,
    addWidget,
    refreshData,
    availableWidgetTypes,
    resetToDefaults,
  } = useDashboardWidgets()

  const [showWidgetSelector, setShowWidgetSelector] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefreshData = async () => {
    setIsRefreshing(true)
    await refreshData()
    setIsRefreshing(false)
  }

  const handleAddWidget = (widgetType: any) => {
    addWidget(widgetType)
    setShowWidgetSelector(false)
  }

  // Sample chart data
  const chartData = [
    { month: 'Jan', deals: 12, revenue: 145000 },
    { month: 'Feb', deals: 19, revenue: 230000 },
    { month: 'Mar', deals: 15, revenue: 180000 },
    { month: 'Apr', deals: 22, revenue: 290000 },
    { month: 'May', deals: 18, revenue: 220000 },
    { month: 'Jun', deals: 25, revenue: 340000 },
  ]

  if (roleLoading || widgetsLoading) {
    return (
      <MainLayout title="Dashboard" subtitle="Overview of deal registrations and performance">
        <SkeletonDashboard />
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout title="Dashboard" subtitle="Overview of deal registrations and performance">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">Error loading dashboard: {error}</p>
            <Button onClick={handleRefreshData} className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </MainLayout>
    )
  }

  return (
    <MainLayout
      title="Dashboard"
      subtitle={`Welcome back, ${userProfile?.name || 'User'}! Here's your personalized dashboard.`}
    >
      {/* Dashboard Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Tooltip content="Refresh all dashboard data">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshData}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
          </Tooltip>

          {hasPermission('canManageSettings') && (
            <Tooltip content="Reset dashboard to default layout">
              <Button
                variant="outline"
                size="sm"
                onClick={resetToDefaults}
              >
                <Settings className="h-4 w-4 mr-2" />
                Reset Layout
              </Button>
            </Tooltip>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="text-xs">
            {userProfile?.role?.toUpperCase()} VIEW
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowWidgetSelector(!showWidgetSelector)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Widget
          </Button>
        </div>
      </div>

      {/* Widget Selector */}
      {showWidgetSelector && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg">Add Widget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableWidgetTypes.map((widgetType) => (
                <div
                  key={widgetType.id}
                  className="border rounded-lg p-4 hover:bg-white cursor-pointer transition-colors"
                  onClick={() => handleAddWidget(widgetType)}
                >
                  <div className="flex items-center space-x-3">
                    <widgetType.icon className="h-8 w-8 text-blue-600" />
                    <div>
                      <h3 className="font-medium">{widgetType.name}</h3>
                      <p className="text-sm text-gray-600">{widgetType.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customizable Widgets */}
      <CustomizableWidgets
        widgets={widgets}
        onWidgetsChange={saveWidgets}
        data={data}
        className="mb-8"
      />

      {/* Additional Charts Section */}
      {hasPermission('canViewAnalytics') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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
            onRefresh={handleRefreshData}
            loading={isRefreshing}
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
            onRefresh={handleRefreshData}
            loading={isRefreshing}
          />
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button className="h-20 flex-col space-y-2" variant="outline">
              <Plus className="h-6 w-6" />
              <span>New Deal</span>
            </Button>

            {hasPermission('canResolveConflicts') && (
              <Button className="h-20 flex-col space-y-2" variant="outline">
                <AlertTriangle className="h-6 w-6" />
                <span>Resolve Conflicts</span>
              </Button>
            )}

            {hasPermission('canViewReports') && (
              <Button className="h-20 flex-col space-y-2" variant="outline">
                <BarChart3 className="h-6 w-6" />
                <span>View Reports</span>
              </Button>
            )}

            <Button className="h-20 flex-col space-y-2" variant="outline">
              <TrendingUp className="h-6 w-6" />
              <span>Analytics</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </MainLayout>
  )
}
