'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency } from '@/lib/utils'
import { Building, Calendar, DollarSign, Package, User, AlertTriangle, Clock, MessageSquare, FileText, CheckCircle, XCircle, ArrowRight } from 'lucide-react'

interface Deal {
  id: string
  status: string
  substatus?: string
  priority?: number
  total_value: number
  expected_close_date?: string
  deal_description?: string
  submission_date: string
  assignment_date?: string
  reseller: {
    id: string
    name: string
    territory: string
    tier: string
  }
  end_user: {
    id: string
    company_name: string
    contact_name: string
    contact_email: string
    territory: string
  }
  assigned_reseller?: {
    id: string
    name: string
    territory: string
  }
  products: Array<{
    id: string
    quantity: number
    price: number
    product: {
      id: string
      name: string
      category: string
      list_price: number
    }
  }>
  conflicts?: Array<{
    id: string
    conflict_type: string
    resolution_status: string
    competing_deal: {
      id: string
      reseller: {
        name: string
      }
      end_user: {
        company_name: string
      }
    }
  }>
  approvals?: Array<{
    id: string
    step_number: number
    action?: string
    comments?: string
    approved_at?: string
    approver?: {
      name: string
      role: string
    }
    workflow: {
      name: string
      description: string
    }
  }>
  status_history?: Array<{
    id: string
    old_status?: string
    new_status: string
    old_substatus?: string
    new_substatus?: string
    reason?: string
    created_at: string
    changed_by_user?: {
      name: string
      role: string
    }
  }>
}

export default function DealDetailPage() {
  const params = useParams()
  const dealId = params.id as string
  const [deal, setDeal] = useState<Deal | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (dealId) {
      fetchDeal()
    }
  }, [dealId])

  const fetchDeal = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/deals/${dealId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch deal')
      }

      const data = await response.json()
      setDeal(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'disputed': return 'bg-orange-100 text-orange-800'
      case 'assigned': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getSubstatusColor = (substatus: string) => {
    switch (substatus) {
      case 'submitted': return 'bg-blue-100 text-blue-800'
      case 'under_review': return 'bg-purple-100 text-purple-800'
      case 'approval_pending': return 'bg-yellow-100 text-yellow-800'
      case 'manager_review': return 'bg-orange-100 text-orange-800'
      case 'admin_review': return 'bg-red-100 text-red-800'
      case 'conflict_review': return 'bg-red-100 text-red-800'
      case 'approved_conditional': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 5: return 'bg-red-100 text-red-800'
      case 4: return 'bg-orange-100 text-orange-800'
      case 3: return 'bg-yellow-100 text-yellow-800'
      case 2: return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <MainLayout title="Deal Details" subtitle="Loading deal information...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    )
  }

  if (error || !deal) {
    return (
      <MainLayout title="Deal Details" subtitle="Error loading deal">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
            <p className="text-red-600">{error || 'Deal not found'}</p>
            <Button onClick={fetchDeal} className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </MainLayout>
    )
  }

  return (
    <MainLayout 
      title={`Deal ${deal.id.slice(0, 8)}`} 
      subtitle={`${deal.end_user.company_name} • ${formatCurrency(deal.total_value)}`}
    >
      <div className="space-y-6">
        {/* Deal Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <Badge className={getStatusColor(deal.status)}>
                  {deal.status.toUpperCase()}
                </Badge>
                {deal.substatus && (
                  <Badge variant="outline" className={getSubstatusColor(deal.substatus)}>
                    {deal.substatus.replace('_', ' ').toUpperCase()}
                  </Badge>
                )}
                {deal.priority && deal.priority > 1 && (
                  <Badge className={getPriorityColor(deal.priority)}>
                    Priority {deal.priority}
                  </Badge>
                )}
              </div>
              
              <div className="flex space-x-2">
                <Button variant="outline">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Add Comment
                </Button>
                <Button variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  Documents
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(deal.total_value)}
                </div>
                <div className="text-sm text-gray-600">Deal Value</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {deal.products.length}
                </div>
                <div className="text-sm text-gray-600">Products</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {new Date(deal.submission_date).toLocaleDateString()}
                </div>
                <div className="text-sm text-gray-600">Submitted</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {deal.expected_close_date ? new Date(deal.expected_close_date).toLocaleDateString() : 'TBD'}
                </div>
                <div className="text-sm text-gray-600">Expected Close</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conflicts Alert */}
        {deal.conflicts && deal.conflicts.length > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center text-red-800">
                <AlertTriangle className="mr-2 h-5 w-5" />
                Conflicts Detected ({deal.conflicts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {deal.conflicts.map((conflict) => (
                  <div key={conflict.id} className="flex items-center justify-between p-3 bg-white rounded border">
                    <div>
                      <div className="font-medium text-red-800">
                        {conflict.conflict_type.replace('_', ' ').toUpperCase()}
                      </div>
                      <div className="text-sm text-red-600">
                        Conflicts with deal for {conflict.competing_deal.end_user.company_name} 
                        by {conflict.competing_deal.reseller.name}
                      </div>
                    </div>
                    <Badge variant={conflict.resolution_status === 'resolved' ? 'default' : 'destructive'}>
                      {conflict.resolution_status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="approval">
              Approval
              {deal.approvals && deal.approvals.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {deal.approvals.filter(a => !a.approved_at).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Reseller Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="w-5 h-5 mr-2" />
                  Reseller Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Submitting Reseller</label>
                    <div className="mt-1 flex items-center space-x-2">
                      <span className="font-medium">{deal.reseller.name}</span>
                      <Badge variant={
                        deal.reseller.tier === 'gold' ? 'default' :
                        deal.reseller.tier === 'silver' ? 'secondary' : 'outline'
                      }>
                        {deal.reseller.tier.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Territory</label>
                    <div className="mt-1 font-medium">{deal.reseller.territory}</div>
                  </div>
                  {deal.assigned_reseller && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Assigned To</label>
                      <div className="mt-1 font-medium">{deal.assigned_reseller.name}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* End User Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  End User Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Company</label>
                    <div className="mt-1 font-medium">{deal.end_user.company_name}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Contact</label>
                    <div className="mt-1 font-medium">{deal.end_user.contact_name}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    <div className="mt-1 font-medium">{deal.end_user.contact_email}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Territory</label>
                    <div className="mt-1 font-medium">{deal.end_user.territory}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Products */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  Products ({deal.products.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {deal.products.map((item) => {
                    const lineTotal = item.quantity * item.price
                    const listTotal = item.quantity * item.product.list_price
                    const discount = ((listTotal - lineTotal) / listTotal) * 100
                    
                    return (
                      <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{item.product.name}</div>
                          <div className="text-sm text-gray-600">
                            {item.product.category} • Qty: {item.quantity} • Unit: {formatCurrency(item.price)}
                          </div>
                          {discount > 0 && (
                            <Badge variant={discount > 30 ? "destructive" : discount > 20 ? "warning" : "secondary"} className="mt-1">
                              {discount.toFixed(1)}% discount
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{formatCurrency(lineTotal)}</div>
                          <div className="text-xs text-gray-500">
                            List: {formatCurrency(listTotal)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  
                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center font-bold text-lg">
                      <span>Total Deal Value:</span>
                      <span className="text-blue-600">{formatCurrency(deal.total_value)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Deal Description */}
            {deal.deal_description && (
              <Card>
                <CardHeader>
                  <CardTitle>Deal Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{deal.deal_description}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="approval">
            <Card>
              <CardHeader>
                <CardTitle>Approval Workflow</CardTitle>
              </CardHeader>
              <CardContent>
                {deal.approvals && deal.approvals.length > 0 ? (
                  <div className="space-y-4">
                    {deal.approvals.map((approval, index) => (
                      <div key={approval.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                        <div className="flex-shrink-0">
                          {approval.approved_at ? (
                            <CheckCircle className="w-6 h-6 text-green-600" />
                          ) : (
                            <Clock className="w-6 h-6 text-yellow-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">
                            Step {approval.step_number}: {approval.workflow.name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {approval.workflow.description}
                          </div>
                          {approval.approver && (
                            <div className="text-sm text-gray-500 mt-1">
                              {approval.action === 'approve' ? 'Approved' : 
                               approval.action === 'reject' ? 'Rejected' : 
                               approval.action ? approval.action : 'Pending'} by {approval.approver.name} ({approval.approver.role})
                            </div>
                          )}
                          {approval.comments && (
                            <div className="text-sm text-gray-700 mt-2 p-2 bg-gray-50 rounded">
                              {approval.comments}
                            </div>
                          )}
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          {approval.approved_at ? new Date(approval.approved_at).toLocaleDateString() : 'Pending'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No approval workflow initiated</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <CardTitle>Status Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                {deal.status_history && deal.status_history.length > 0 ? (
                  <div className="space-y-4">
                    {deal.status_history.map((history, index) => (
                      <div key={history.id} className="flex items-start space-x-4">
                        <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">
                              {history.old_status && `${history.old_status} → `}{history.new_status}
                            </span>
                            {history.new_substatus && (
                              <Badge variant="outline" className="text-xs">
                                {history.new_substatus.replace('_', ' ')}
                              </Badge>
                            )}
                          </div>
                          {history.reason && (
                            <div className="text-sm text-gray-600 mt-1">{history.reason}</div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(history.created_at).toLocaleString()}
                            {history.changed_by_user && ` by ${history.changed_by_user.name}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No status history available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comments">
            <Card>
              <CardHeader>
                <CardTitle>Comments & Communication</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-center py-8">Comments feature coming soon</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}
