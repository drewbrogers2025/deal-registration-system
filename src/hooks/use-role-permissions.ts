"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'

export interface Permission {
  id: string
  name: string
  resource_type: string
  action: string
}

export interface Role {
  id: string
  name: string
  permissions: Permission[]
}

export function useRolePermissions() {
  const { user } = useAuth()
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserPermissions = async () => {
      if (!user) {
        setPermissions([])
        setRoles([])
        setLoading(false)
        return
      }

      try {
        // For now, return basic permissions based on user type
        // In a real implementation, this would fetch from the database
        const userPermissions: Permission[] = []
        const userRoles: Role[] = []

        if (user.user_type === 'site_admin') {
          userPermissions.push(
            { id: '1', name: 'deals.create', resource_type: 'deals', action: 'create' },
            { id: '2', name: 'deals.read', resource_type: 'deals', action: 'read' },
            { id: '3', name: 'deals.update', resource_type: 'deals', action: 'update' },
            { id: '4', name: 'deals.approve', resource_type: 'deals', action: 'approve' },
            { id: '5', name: 'resellers.read', resource_type: 'resellers', action: 'read' },
            { id: '6', name: 'resellers.update', resource_type: 'resellers', action: 'update' },
            { id: '7', name: 'resellers.approve', resource_type: 'resellers', action: 'approve' },
            { id: '8', name: 'products.read', resource_type: 'products', action: 'read' },
            { id: '9', name: 'products.update', resource_type: 'products', action: 'update' },
            { id: '10', name: 'reports.read', resource_type: 'reports', action: 'read' }
          )
          userRoles.push({
            id: 'admin',
            name: 'Site Administrator',
            permissions: userPermissions
          })
        } else if (user.user_type === 'vendor_user') {
          userPermissions.push(
            { id: '2', name: 'deals.read', resource_type: 'deals', action: 'read' },
            { id: '3', name: 'deals.update', resource_type: 'deals', action: 'update' },
            { id: '5', name: 'resellers.read', resource_type: 'resellers', action: 'read' },
            { id: '8', name: 'products.read', resource_type: 'products', action: 'read' },
            { id: '10', name: 'reports.read', resource_type: 'reports', action: 'read' }
          )
          userRoles.push({
            id: 'vendor',
            name: 'Vendor User',
            permissions: userPermissions
          })
        } else if (user.user_type === 'reseller') {
          userPermissions.push(
            { id: '1', name: 'deals.create', resource_type: 'deals', action: 'create' },
            { id: '2', name: 'deals.read', resource_type: 'deals', action: 'read' },
            { id: '8', name: 'products.read', resource_type: 'products', action: 'read' }
          )
          userRoles.push({
            id: 'reseller',
            name: 'Reseller',
            permissions: userPermissions
          })
        }

        setPermissions(userPermissions)
        setRoles(userRoles)
      } catch (error) {
        console.error('Error fetching user permissions:', error)
        setPermissions([])
        setRoles([])
      } finally {
        setLoading(false)
      }
    }

    fetchUserPermissions()
  }, [user])

  const hasPermission = (resource: string, action: string): boolean => {
    return permissions.some(
      permission => 
        permission.resource_type === resource && 
        permission.action === action
    )
  }

  const hasRole = (roleName: string): boolean => {
    return roles.some(role => role.name === roleName)
  }

  return {
    permissions,
    roles,
    loading,
    hasPermission,
    hasRole
  }
}
