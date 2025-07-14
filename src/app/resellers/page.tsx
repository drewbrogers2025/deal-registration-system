'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, Edit, Trash2 } from 'lucide-react'

interface Reseller {
  id: string
  name: string
  email: string
  territory: string
  tier: 'gold' | 'silver' | 'bronze'
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export default function ResellersPage() {
  const [resellers, setResellers] = useState<Reseller[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchResellers()
  }, [])

  const fetchResellers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/resellers')
      const data = await response.json()
      
      if (data.success) {
        setResellers(data.data.items)
      } else {
        setError('Failed to fetch resellers')
      }
    } catch (_err) {
      setError('Error loading resellers')
      console.error('Error fetching resellers:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredResellers = resellers.filter(reseller =>
    reseller.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reseller.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reseller.territory.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'gold': return 'bg-yellow-100 text-yellow-800'
      case 'silver': return 'bg-gray-100 text-gray-800'
      case 'bronze': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    return status === 'active' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800'
  }

  if (loading) {
    return (
      <MainLayout title="Resellers" subtitle="Manage your partner network">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading resellers...</div>
        </div>
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout title="Resellers" subtitle="Manage your partner network">
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">{error}</div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout title="Resellers" subtitle="Manage your partner network">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search resellers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Reseller
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Resellers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{resellers.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gold Partners</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {resellers.filter(r => r.tier === 'gold').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Silver Partners</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {resellers.filter(r => r.tier === 'silver').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Partners</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {resellers.filter(r => r.status === 'active').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resellers Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Resellers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Name</th>
                    <th className="text-left py-3 px-4 font-medium">Email</th>
                    <th className="text-left py-3 px-4 font-medium">Territory</th>
                    <th className="text-left py-3 px-4 font-medium">Tier</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResellers.map((reseller) => (
                    <tr key={reseller.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{reseller.name}</td>
                      <td className="py-3 px-4 text-gray-600">{reseller.email}</td>
                      <td className="py-3 px-4">{reseller.territory}</td>
                      <td className="py-3 px-4">
                        <Badge className={getTierColor(reseller.tier)}>
                          {reseller.tier}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={getStatusColor(reseller.status)}>
                          {reseller.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredResellers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? 'No resellers found matching your search.' : 'No resellers found.'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
