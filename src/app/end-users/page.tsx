'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Plus, Edit, Trash2, Building2 } from 'lucide-react'

interface EndUser {
  id: string
  company_name: string
  contact_name: string
  contact_email: string
  territory: string
  created_at: string
  updated_at: string
}

export default function EndUsersPage() {
  const [endUsers, setEndUsers] = useState<EndUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchEndUsers()
  }, [])

  const fetchEndUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/end-users')
      const data = await response.json()
      
      if (data.success) {
        setEndUsers(data.data.items)
      } else {
        setError('Failed to fetch end users')
      }
    } catch (err) {
      setError('Error loading end users')
      console.error('Error fetching end users:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredEndUsers = endUsers.filter(endUser =>
    endUser.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    endUser.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    endUser.contact_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    endUser.territory.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <MainLayout title="End Users" subtitle="Manage customer organizations">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading end users...</div>
        </div>
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout title="End Users" subtitle="Manage customer organizations">
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">{error}</div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout title="End Users" subtitle="Manage customer organizations">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search end users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add End User
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
              <Building2 className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{endUsers.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Northeast US</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {endUsers.filter(u => u.territory === 'Northeast US').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">West Coast</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {endUsers.filter(u => u.territory === 'West Coast').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Other Territories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {endUsers.filter(u => !['Northeast US', 'West Coast'].includes(u.territory)).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* End Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>All End Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Company</th>
                    <th className="text-left py-3 px-4 font-medium">Contact Name</th>
                    <th className="text-left py-3 px-4 font-medium">Email</th>
                    <th className="text-left py-3 px-4 font-medium">Territory</th>
                    <th className="text-left py-3 px-4 font-medium">Created</th>
                    <th className="text-left py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEndUsers.map((endUser) => (
                    <tr key={endUser.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{endUser.company_name}</td>
                      <td className="py-3 px-4">{endUser.contact_name}</td>
                      <td className="py-3 px-4 text-gray-600">{endUser.contact_email}</td>
                      <td className="py-3 px-4">{endUser.territory}</td>
                      <td className="py-3 px-4 text-gray-600">
                        {new Date(endUser.created_at).toLocaleDateString()}
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
            
            {filteredEndUsers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? 'No end users found matching your search.' : 'No end users found.'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
