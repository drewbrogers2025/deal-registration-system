'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Shield, 
  AlertTriangle, 
  Users, 
  Activity, 
  Lock, 
  Ban,
  Eye,
  Download,
  RefreshCw
} from 'lucide-react'
import { AdminOnly } from '@/components/rbac/permission-guard'
import type { SecurityMetrics } from '@/lib/rbac/types'

interface SecurityEvent {
  id: string
  event_type: string
  severity: number
  created_at: string
  user_id?: string
  ip_address?: string
  details: Record<string, unknown>
  resolved: boolean
}

export function SecurityDashboard() {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null)
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSecurityData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch security metrics
      const metricsResponse = await fetch('/api/security/metrics')
      if (!metricsResponse.ok) {
        throw new Error('Failed to fetch security metrics')
      }
      const metricsData = await metricsResponse.json()
      setMetrics(metricsData.data)

      // Fetch recent security events
      const eventsResponse = await fetch('/api/security/events?limit=10')
      if (!eventsResponse.ok) {
        throw new Error('Failed to fetch security events')
      }
      const eventsData = await eventsResponse.json()
      setEvents(eventsData.data.items || [])

    } catch (err) {
      console.error('Error fetching security data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSecurityData()
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchSecurityData, 30000)
    return () => clearInterval(interval)
  }, [])

  const getSeverityColor = (severity: number) => {
    switch (severity) {
      case 1: return 'bg-green-100 text-green-800'
      case 2: return 'bg-yellow-100 text-yellow-800'
      case 3: return 'bg-orange-100 text-orange-800'
      case 4: return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getSeverityLabel = (severity: number) => {
    switch (severity) {
      case 1: return 'Low'
      case 2: return 'Medium'
      case 3: return 'High'
      case 4: return 'Critical'
      default: return 'Unknown'
    }
  }

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Loading security dashboard...
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Error loading security dashboard: {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchSecurityData}
            className="ml-2"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <AdminOnly fallback={
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          You don&apos;t have permission to view the security dashboard.
        </AlertDescription>
      </Alert>
    }>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Security Dashboard</h1>
            <p className="text-gray-600">Monitor system security and user activity</p>
          </div>
          <Button onClick={fetchSecurityData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Critical Alerts */}
        {metrics && metrics.criticalEvents > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>{metrics.criticalEvents}</strong> critical security events require immediate attention.
            </AlertDescription>
          </Alert>
        )}

        {/* Security Metrics Grid */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.activeUsers}</div>
                <p className="text-xs text-muted-foreground">
                  Currently logged in
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed Logins (24h)</CardTitle>
                <Lock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{metrics.failedLogins24h}</div>
                <p className="text-xs text-muted-foreground">
                  Authentication failures
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Security Events (24h)</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.securityEvents24h}</div>
                <p className="text-xs text-muted-foreground">
                  Total security events
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Blocked IPs</CardTitle>
                <Ban className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.blockedIPs}</div>
                <p className="text-xs text-muted-foreground">
                  Currently blocked
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Locked Accounts</CardTitle>
                <Lock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{metrics.lockedAccounts}</div>
                <p className="text-xs text-muted-foreground">
                  Temporarily locked
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Critical Events</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{metrics.criticalEvents}</div>
                <p className="text-xs text-muted-foreground">
                  Unresolved critical
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">API Usage</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.apiKeyUsage}</div>
                <p className="text-xs text-muted-foreground">
                  API requests today
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Audit Events (24h)</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.auditEvents24h}</div>
                <p className="text-xs text-muted-foreground">
                  Logged activities
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Security Events */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Security Events</CardTitle>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                View All
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No recent security events</p>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Badge className={getSeverityColor(event.severity)}>
                        {getSeverityLabel(event.severity)}
                      </Badge>
                      <div>
                        <p className="font-medium">{event.event_type.replace(/_/g, ' ').toUpperCase()}</p>
                        <p className="text-sm text-gray-500">
                          {event.ip_address && `IP: ${event.ip_address} • `}
                          {new Date(event.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {event.resolved ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          Resolved
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                          Pending
                        </Badge>
                      )}
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="h-20 flex flex-col">
                <Eye className="h-6 w-6 mb-2" />
                View Audit Logs
              </Button>
              <Button variant="outline" className="h-20 flex flex-col">
                <Users className="h-6 w-6 mb-2" />
                Manage Users
              </Button>
              <Button variant="outline" className="h-20 flex flex-col">
                <Download className="h-6 w-6 mb-2" />
                Export Reports
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminOnly>
  )
}
