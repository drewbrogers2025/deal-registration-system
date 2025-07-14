import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import {
  FileText,
  AlertTriangle,
  PoundSterling,
  Clock
} from 'lucide-react'

export default function Dashboard() {
  // Mock data - will be replaced with real data from Supabase
  const metrics = {
    totalDeals: 156,
    pendingDeals: 23,
    disputedDeals: 8,
    totalValue: 2450000,
    avgResolutionTime: 2.3,
    conflictsResolved: 45
  }

  const recentDeals = [
    {
      id: '1',
      company: 'Acme Corp',
      reseller: 'TechPartner Solutions',
      value: 125000,
      status: 'pending',
      submittedAt: '2024-01-15'
    },
    {
      id: '2',
      company: 'Global Systems Inc',
      reseller: 'Channel Pro',
      value: 89000,
      status: 'disputed',
      submittedAt: '2024-01-14'
    },
    {
      id: '3',
      company: 'StartupTech',
      reseller: 'Regional Partners',
      value: 45000,
      status: 'assigned',
      submittedAt: '2024-01-13'
    }
  ]

  const pendingConflicts = [
    {
      id: '1',
      company: 'Acme Corp',
      conflictType: 'duplicate_end_user',
      resellers: ['TechPartner Solutions', 'Channel Pro'],
      priority: 'high'
    },
    {
      id: '2',
      company: 'Global Systems Inc',
      conflictType: 'territory_overlap',
      resellers: ['Regional Partners', 'Enterprise Solutions'],
      priority: 'medium'
    }
  ]

  return (
    <MainLayout
      title="Dashboard"
      subtitle="Overview of deal registrations and conflicts"
    >
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deals</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalDeals}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Deals</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pendingDeals}</div>
            <p className="text-xs text-muted-foreground">
              Require assignment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Conflicts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.disputedDeals}</div>
            <p className="text-xs text-muted-foreground">
              Need resolution
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <PoundSterling className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              £{(metrics.totalValue / 1000000).toFixed(1)}M
            </div>
            <p className="text-xs text-muted-foreground">
              +8% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Deals */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Deal Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentDeals.map((deal) => (
                <div key={deal.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{deal.company}</p>
                    <p className="text-sm text-muted-foreground">
                      by {deal.reseller}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatCurrency(deal.value)}
                    </p>
                    <Badge
                      variant={
                        deal.status === 'pending' ? 'warning' :
                        deal.status === 'disputed' ? 'error' : 'success'
                      }
                    >
                      {deal.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <Button className="w-full mt-4" variant="outline">
              View All Deals
            </Button>
          </CardContent>
        </Card>

        {/* Pending Conflicts */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Conflicts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingConflicts.map((conflict) => (
                <div key={conflict.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">{conflict.company}</p>
                    <Badge
                      variant={conflict.priority === 'high' ? 'error' : 'warning'}
                    >
                      {conflict.priority} priority
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {conflict.conflictType.replace('_', ' ')}
                  </p>
                  <p className="text-sm">
                    Competing resellers: {conflict.resellers.join(', ')}
                  </p>
                </div>
              ))}
            </div>
            <Button className="w-full mt-4" variant="outline">
              Resolve Conflicts
            </Button>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
