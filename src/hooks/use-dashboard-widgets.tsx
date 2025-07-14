'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRolePermissions } from './use-role-permissions'
import type { Widget, WidgetType } from '@/components/dashboard/customizable-widgets'
import { widgetTypes } from '@/components/dashboard/customizable-widgets'

// Default widget configurations for different roles
const defaultWidgetsByRole = {
  admin: [
    {
      id: 'total-deals',
      type: 'total-deals',
      title: 'Total Deals',
      size: 'small' as const,
      position: { x: 0, y: 0 },
      visible: true,
    },
    {
      id: 'pending-deals',
      type: 'pending-deals',
      title: 'Pending Deals',
      size: 'small' as const,
      position: { x: 1, y: 0 },
      visible: true,
    },
    {
      id: 'conflicts',
      type: 'conflicts',
      title: 'Active Conflicts',
      size: 'small' as const,
      position: { x: 2, y: 0 },
      visible: true,
    },
    {
      id: 'revenue',
      type: 'revenue',
      title: 'Total Revenue',
      size: 'small' as const,
      position: { x: 3, y: 0 },
      visible: true,
    },
    {
      id: 'deals-chart',
      type: 'deals-chart',
      title: 'Deals Trend',
      size: 'large' as const,
      position: { x: 0, y: 1 },
      visible: true,
    },
    {
      id: 'recent-activity',
      type: 'recent-activity',
      title: 'Recent Activity',
      size: 'medium' as const,
      position: { x: 0, y: 2 },
      visible: true,
    },
    {
      id: 'top-resellers',
      type: 'top-resellers',
      title: 'Top Resellers',
      size: 'medium' as const,
      position: { x: 2, y: 2 },
      visible: true,
    },
  ],
  manager: [
    {
      id: 'total-deals',
      type: 'total-deals',
      title: 'Total Deals',
      size: 'small' as const,
      position: { x: 0, y: 0 },
      visible: true,
    },
    {
      id: 'pending-deals',
      type: 'pending-deals',
      title: 'Pending Deals',
      size: 'small' as const,
      position: { x: 1, y: 0 },
      visible: true,
    },
    {
      id: 'conflicts',
      type: 'conflicts',
      title: 'Active Conflicts',
      size: 'small' as const,
      position: { x: 2, y: 0 },
      visible: true,
    },
    {
      id: 'deals-chart',
      type: 'deals-chart',
      title: 'Deals Trend',
      size: 'large' as const,
      position: { x: 0, y: 1 },
      visible: true,
    },
    {
      id: 'recent-activity',
      type: 'recent-activity',
      title: 'Recent Activity',
      size: 'medium' as const,
      position: { x: 0, y: 2 },
      visible: true,
    },
  ],
  staff: [
    {
      id: 'total-deals',
      type: 'total-deals',
      title: 'Total Deals',
      size: 'small' as const,
      position: { x: 0, y: 0 },
      visible: true,
    },
    {
      id: 'pending-deals',
      type: 'pending-deals',
      title: 'Pending Deals',
      size: 'small' as const,
      position: { x: 1, y: 0 },
      visible: true,
    },
    {
      id: 'recent-activity',
      type: 'recent-activity',
      title: 'Recent Activity',
      size: 'large' as const,
      position: { x: 0, y: 1 },
      visible: true,
    },
  ],
}

interface DashboardData {
  'total-deals': {
    value: number
    label: string
    change: number
  }
  'pending-deals': {
    value: number
    label: string
    change: number
  }
  'conflicts': {
    value: number
    label: string
    change: number
  }
  'revenue': {
    value: string
    label: string
    change: number
  }
  'recent-activity': {
    items: Array<{
      title: string
      subtitle: string
      status: string
    }>
  }
  'top-resellers': {
    items: Array<{
      title: string
      subtitle: string
      status: string
    }>
  }
}

export function useDashboardWidgets() {
  const { userProfile, loading: roleLoading } = useRolePermissions()
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [data, setData] = useState<DashboardData>({
    'total-deals': { value: 0, label: 'Total Deals', change: 0 },
    'pending-deals': { value: 0, label: 'Pending Deals', change: 0 },
    'conflicts': { value: 0, label: 'Active Conflicts', change: 0 },
    'revenue': { value: '£0', label: 'Total Revenue', change: 0 },
    'recent-activity': { items: [] },
    'top-resellers': { items: [] },
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load widgets from localStorage or use defaults
  useEffect(() => {
    if (roleLoading || !userProfile) return

    const storageKey = `dashboard-widgets-${userProfile.id}`
    const savedWidgets = localStorage.getItem(storageKey)

    if (savedWidgets) {
      try {
        setWidgets(JSON.parse(savedWidgets))
      } catch (err) {
        console.error('Failed to parse saved widgets:', err)
        // Fall back to defaults
        setWidgets(defaultWidgetsByRole[userProfile.role] || [])
      }
    } else {
      // Use role-based defaults
      setWidgets(defaultWidgetsByRole[userProfile.role] || [])
    }

    setLoading(false)
  }, [userProfile, roleLoading])

  // Save widgets to localStorage whenever they change
  const saveWidgets = useCallback((newWidgets: Widget[]) => {
    if (!userProfile) return

    const storageKey = `dashboard-widgets-${userProfile.id}`
    localStorage.setItem(storageKey, JSON.stringify(newWidgets))
    setWidgets(newWidgets)
  }, [userProfile])

  // Fetch dashboard data
  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/dashboard/metrics')
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }

      const result = await response.json()
      
      if (result.success && result.data) {
        const metrics = result.data
        
        setData({
          'total-deals': {
            value: metrics.deals?.total || 0,
            label: 'Total Deals',
            change: metrics.deals?.growth || 0,
          },
          'pending-deals': {
            value: metrics.deals?.pending || 0,
            label: 'Pending Deals',
            change: 0,
          },
          'conflicts': {
            value: metrics.conflicts?.pending || 0,
            label: 'Active Conflicts',
            change: 0,
          },
          'revenue': {
            value: `£${(metrics.financial?.totalValue || 0).toLocaleString()}`,
            label: 'Total Revenue',
            change: metrics.financial?.growth || 0,
          },
          'recent-activity': {
            items: [
              { title: 'New deal registered', subtitle: '2 minutes ago', status: 'new' },
              { title: 'Conflict resolved', subtitle: '1 hour ago', status: 'resolved' },
              { title: 'Deal assigned', subtitle: '3 hours ago', status: 'assigned' },
            ],
          },
          'top-resellers': {
            items: [
              { title: 'TechPartner Solutions', subtitle: '15 deals', status: 'gold' },
              { title: 'Channel Pro', subtitle: '12 deals', status: 'silver' },
              { title: 'Regional Partners', subtitle: '8 deals', status: 'bronze' },
            ],
          },
        })
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError('Failed to load dashboard data')
    }
  }, [])

  // Initial data fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Add a new widget
  const addWidget = useCallback((widgetType: WidgetType) => {
    const newWidget: Widget = {
      id: `${widgetType.id}-${Date.now()}`,
      type: widgetType.id,
      title: widgetType.name,
      size: widgetType.defaultSize,
      position: { x: 0, y: widgets.length },
      visible: true,
    }

    saveWidgets([...widgets, newWidget])
  }, [widgets, saveWidgets])

  // Remove a widget
  const removeWidget = useCallback((widgetId: string) => {
    saveWidgets(widgets.filter(w => w.id !== widgetId))
  }, [widgets, saveWidgets])

  // Update widget configuration
  const updateWidget = useCallback((widgetId: string, updates: Partial<Widget>) => {
    saveWidgets(
      widgets.map(w => 
        w.id === widgetId ? { ...w, ...updates } : w
      )
    )
  }, [widgets, saveWidgets])

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    if (!userProfile) return
    
    const defaults = defaultWidgetsByRole[userProfile.role] || []
    saveWidgets(defaults)
  }, [userProfile, saveWidgets])

  // Get available widget types based on permissions
  const getAvailableWidgetTypes = useCallback(() => {
    if (!userProfile) return []

    return widgetTypes.filter(type => {
      // Add permission checks here if needed
      switch (type.id) {
        case 'conflicts':
          return userProfile.permissions.canResolveConflicts
        case 'top-resellers':
          return userProfile.permissions.canManageResellers
        default:
          return true
      }
    })
  }, [userProfile])

  return {
    widgets,
    data,
    loading: loading || roleLoading,
    error,
    saveWidgets,
    addWidget,
    removeWidget,
    updateWidget,
    resetToDefaults,
    refreshData: fetchData,
    availableWidgetTypes: getAvailableWidgetTypes(),
  }
}
