'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Building, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Users, 
  Calendar,
  FileText,
  BarChart3,
  Settings,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react'
import type { ResellerWithRelations, CompanyDocument, CompanyMetrics } from '@/lib/types'

export default function ResellerProfilePage() {
  const params = useParams()
  const resellerId = params.id as string
  
  const [reseller, setReseller] = useState<ResellerWithRelations | null>(null)
  const [documents, setDocuments] = useState<CompanyDocument[]>([])
  const [metrics, setMetrics] = useState<CompanyMetrics[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (resellerId) {
      fetchResellerData()
    }
  }, [resellerId])

  const fetchResellerData = async () => {
    try {
      // Fetch reseller with relations
      const resellerResponse = await fetch(`/api/resellers/${resellerId}?include_relations=true`)
      if (resellerResponse.ok) {
        const resellerData = await resellerResponse.json()
        setReseller(resellerData.data)
      }

      // Fetch documents
      const documentsResponse = await fetch(`/api/resellers/${resellerId}/documents`)
      if (documentsResponse.ok) {
        const documentsData = await documentsResponse.json()
        setDocuments(documentsData.data || [])
      }

      // Fetch metrics
      const metricsResponse = await fetch(`/api/resellers/${resellerId}/metrics`)
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json()
        setMetrics(metricsData.data || [])
      }
    } catch (error) {
      console.error('Error fetching reseller data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'gold': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'silver': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'bronze': return 'bg-orange-100 text-orange-800 border-orange-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200'
      case 'under_review': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200'
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4" />
      case 'under_review': return <Clock className="w-4 h-4" />
      case 'rejected': return <AlertCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <MainLayout title="Reseller Profile" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading reseller profile...</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (!reseller) {
    return (
      <MainLayout title="Reseller Profile" subtitle="Not found">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Reseller not found</h3>
              <p className="text-gray-600">
                The reseller profile you're looking for doesn't exist or you don't have permission to view it.
              </p>
            </div>
          </CardContent>
        </Card>
      </MainLayout>
    )
  }

  const primaryContact = reseller.contacts?.find(c => c.is_primary)
  const primaryTerritory = reseller.territories?.find(t => t.is_primary)

  return (
    <MainLayout 
      title={reseller.name} 
      subtitle="Reseller Profile"
    >
      <div className="space-y-6">
        {/* Header Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900">{reseller.name}</h1>
                  <Badge className={getTierColor(reseller.tier)}>
                    {reseller.tier.toUpperCase()} PARTNER
                  </Badge>
                  <Badge className={getStatusColor(reseller.registration_status)}>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(reseller.registration_status)}
                      <span className="capitalize">{reseller.registration_status.replace('_', ' ')}</span>
                    </div>
                  </Badge>
                </div>
                
                {reseller.legal_name && reseller.legal_name !== reseller.name && (
                  <p className="text-gray-600 mb-2">Legal Name: {reseller.legal_name}</p>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  {primaryTerritory && (
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>Primary Territory: {primaryTerritory.territory_name}</span>
                    </div>
                  )}
                  
                  {reseller.city && reseller.country && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Building className="w-4 h-4 mr-2" />
                      <span>{reseller.city}, {reseller.country}</span>
                    </div>
                  )}
                  
                  {reseller.years_in_business && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>{reseller.years_in_business}+ years in business</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
                {primaryContact && (
                  <Button size="sm">
                    <Mail className="w-4 h-4 mr-2" />
                    Contact
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="territories">Territories</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="metrics">Performance</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Company Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Building className="w-5 h-5 mr-2" />
                    Company Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-500">Tax ID</p>
                      <p>{reseller.tax_id || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-500">Phone</p>
                      <p>{reseller.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-500">Employees</p>
                      <p>{reseller.employee_count || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-500">Revenue Range</p>
                      <p>
                        {reseller.revenue_range === 'under_1m' && 'Under $1M'}
                        {reseller.revenue_range === '1m_5m' && '$1M - $5M'}
                        {reseller.revenue_range === '5m_25m' && '$5M - $25M'}
                        {reseller.revenue_range === '25m_100m' && '$25M - $100M'}
                        {reseller.revenue_range === 'over_100m' && 'Over $100M'}
                        {!reseller.revenue_range && 'Not provided'}
                      </p>
                    </div>
                  </div>
                  
                  {reseller.website && (
                    <div className="pt-3 border-t">
                      <div className="flex items-center text-sm">
                        <Globe className="w-4 h-4 mr-2 text-gray-400" />
                        <a 
                          href={reseller.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {reseller.website}
                        </a>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Address */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="w-5 h-5 mr-2" />
                    Address
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-1">
                    {reseller.address_line1 && <p>{reseller.address_line1}</p>}
                    {reseller.address_line2 && <p>{reseller.address_line2}</p>}
                    {reseller.city && reseller.state_province && (
                      <p>{reseller.city}, {reseller.state_province} {reseller.postal_code}</p>
                    )}
                    {reseller.country && <p>{reseller.country}</p>}
                    
                    {!reseller.address_line1 && (
                      <p className="text-gray-500 italic">Address not provided</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Other tabs would be implemented similarly */}
          <TabsContent value="contacts">
            <Card>
              <CardHeader>
                <CardTitle>Contact Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Contact management interface would be implemented here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="territories">
            <Card>
              <CardHeader>
                <CardTitle>Territory Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Territory management interface would be implemented here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>Document Repository</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Document management interface would be implemented here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metrics">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Performance metrics dashboard would be implemented here.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}
