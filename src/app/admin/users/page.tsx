'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  Search, 
  UserCheck, 
  UserX, 
  Edit, 
  Shield, 
  Building2, 
  Users,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { useRequireAdmin } from '@/hooks/use-auth'
import type { User, UserType, ApprovalStatus } from '@/lib/types'

interface UserWithProfile extends User {
  staff_user?: {
    role: string
    department?: string
  } | null
  reseller_user?: {
    reseller_id: string
    can_create_deals: boolean
    reseller: {
      name: string
      territory: string
    }
  } | null
}

export default function UserManagementPage() {
  // Require admin access
  useRequireAdmin()

  const [users, setUsers] = useState<UserWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ApprovalStatus['_type']>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | UserType['_type']>('all')
  const [selectedUser, setSelectedUser] = useState<UserWithProfile | null>(null)
  const [actionDialog, setActionDialog] = useState<{
    open: boolean
    action: 'approve' | 'reject' | 'edit' | null
    user: UserWithProfile | null
  }>({ open: false, action: null, user: null })

  const supabase = createClientComponentClient()

  const fetchUsers = async () => {
    try {
      setLoading(true)
      
      // Fetch users with their profiles
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select(`
          *,
          staff_users (
            role,
            department
          ),
          reseller_users (
            reseller_id,
            can_create_deals,
            resellers (
              name,
              territory
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (usersError) {
        throw usersError
      }

      setUsers(usersData || [])
    } catch (err: any) {
      console.error('Error fetching users:', err)
      setError(err.message || 'Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleUserAction = async (action: 'approve' | 'reject', userId: string, reason?: string) => {
    try {
      const updates: any = {
        approval_status: action === 'approve' ? 'approved' : 'rejected',
        approved_at: action === 'approve' ? new Date().toISOString() : null,
      }

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)

      if (error) {
        throw error
      }

      // Refresh users list
      await fetchUsers()
      
      // Close dialog
      setActionDialog({ open: false, action: null, user: null })
      
      // TODO: Send email notification to user
      
    } catch (err: any) {
      console.error('Error updating user:', err)
      setError(err.message || 'Failed to update user')
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || user.approval_status === statusFilter
    const matchesType = typeFilter === 'all' || user.user_type === typeFilter
    
    return matchesSearch && matchesStatus && matchesType
  })

  const getUserTypeIcon = (type: UserType['_type']) => {
    switch (type) {
      case 'site_admin':
        return <Shield className="h-4 w-4" />
      case 'vendor_user':
        return <Users className="h-4 w-4" />
      case 'reseller':
        return <Building2 className="h-4 w-4" />
    }
  }

  const getUserTypeLabel = (type: UserType['_type']) => {
    switch (type) {
      case 'site_admin':
        return 'Site Admin'
      case 'vendor_user':
        return 'Vendor User'
      case 'reseller':
        return 'Reseller'
    }
  }

  const getStatusBadge = (status: ApprovalStatus['_type']) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
    }
  }

  if (loading) {
    return (
      <MainLayout title="User Management" subtitle="Manage user accounts and permissions">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading users...</div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout title="User Management" subtitle="Manage user accounts and permissions">
      <div className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="site_admin">Site Admin</SelectItem>
                  <SelectItem value="vendor_user">Vendor User</SelectItem>
                  <SelectItem value="reseller">Reseller</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={fetchUsers} variant="outline">
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Users ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        {user.phone && (
                          <div className="text-xs text-gray-400">{user.phone}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getUserTypeIcon(user.user_type)}
                        <span>{getUserTypeLabel(user.user_type)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(user.approval_status)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {user.staff_user && (
                          <div>Role: {user.staff_user.role}</div>
                        )}
                        {user.reseller_user && (
                          <div>
                            <div>Company: {user.reseller_user.reseller?.name}</div>
                            <div>Territory: {user.reseller_user.reseller?.territory}</div>
                          </div>
                        )}
                        {user.company_position && (
                          <div>Position: {user.company_position}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-500">
                        {new Date(user.created_at!).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {user.approval_status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => setActionDialog({
                                open: true,
                                action: 'approve',
                                user
                              })}
                            >
                              <UserCheck className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setActionDialog({
                                open: true,
                                action: 'reject',
                                user
                              })}
                            >
                              <UserX className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setActionDialog({
                            open: true,
                            action: 'edit',
                            user
                          })}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Action Dialog */}
        <Dialog open={actionDialog.open} onOpenChange={(open) => 
          setActionDialog({ open, action: null, user: null })
        }>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionDialog.action === 'approve' && 'Approve User'}
                {actionDialog.action === 'reject' && 'Reject User'}
                {actionDialog.action === 'edit' && 'Edit User'}
              </DialogTitle>
              <DialogDescription>
                {actionDialog.action === 'approve' && 
                  `Are you sure you want to approve ${actionDialog.user?.name}? They will gain access to the system.`
                }
                {actionDialog.action === 'reject' && 
                  `Are you sure you want to reject ${actionDialog.user?.name}? They will not be able to access the system.`
                }
                {actionDialog.action === 'edit' && 
                  `Edit user details for ${actionDialog.user?.name}.`
                }
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setActionDialog({ open: false, action: null, user: null })}
              >
                Cancel
              </Button>
              {actionDialog.action === 'approve' && (
                <Button
                  onClick={() => handleUserAction('approve', actionDialog.user!.id)}
                >
                  Approve User
                </Button>
              )}
              {actionDialog.action === 'reject' && (
                <Button
                  variant="destructive"
                  onClick={() => handleUserAction('reject', actionDialog.user!.id)}
                >
                  Reject User
                </Button>
              )}
              {actionDialog.action === 'edit' && (
                <Button>
                  Save Changes
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}
