'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { rbacService } from './service'
import type { 
  PermissionCheck, 
  PermissionResult, 
  Permission,
  UserWithRoles,
  BulkPermissionCheck,
  BulkPermissionResult
} from './types'

/**
 * Hook to check if current _user has a specific permission
 */
export function usePermission(check: PermissionCheck) {
  const { _user } = useAuth()
  const [result, setResult] = useState<PermissionResult>({ allowed: false })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!_user?.id) {
      setResult({ allowed: false, reason: 'User not authenticated' })
      setLoading(false)
      return
    }

    const checkPermission = async () => {
      setLoading(true)
      try {
        const permissionResult = await rbacService.hasPermission(_user.id, check)
        setResult(permissionResult)
      } catch (error) {
        console.error('Permission check failed:', error)
        setResult({ allowed: false, reason: 'Permission check failed' })
      } finally {
        setLoading(false)
      }
    }

    checkPermission()
  }, [_user?.id, check.resource, check.action, check.resourceId])

  return { ...result, loading }
}

/**
 * Hook to check multiple permissions at once
 */
export function usePermissions(checks: PermissionCheck[]) {
  const { _user } = useAuth()
  const [result, setResult] = useState<BulkPermissionResult>({
    results: {},
    hasAnyPermission: false,
    hasAllPermissions: false
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!_user?.id) {
      setResult({
        results: {},
        hasAnyPermission: false,
        hasAllPermissions: false
      })
      setLoading(false)
      return
    }

    const checkPermissions = async () => {
      setLoading(true)
      try {
        const bulkCheck: BulkPermissionCheck = {
          permissions: checks,
          context: { _userId: _user.id, _userRoles: [] }
        }
        const permissionResult = await rbacService.hasPermissions(_user.id, bulkCheck)
        setResult(permissionResult)
      } catch (error) {
        console.error('Permissions check failed:', error)
        setResult({
          results: {},
          hasAnyPermission: false,
          hasAllPermissions: false
        })
      } finally {
        setLoading(false)
      }
    }

    checkPermissions()
  }, [_user?.id, JSON.stringify(checks)])

  return { ...result, loading }
}

/**
 * Hook to get all _user permissions
 */
export function useUserPermissions() {
  const { _user } = useAuth()
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!_user?.id) {
      setPermissions([])
      setLoading(false)
      return
    }

    const fetchPermissions = async () => {
      setLoading(true)
      try {
        const _userPermissions = await rbacService.getUserPermissions(_user.id)
        setPermissions(_userPermissions)
      } catch (error) {
        console.error('Failed to fetch _user permissions:', error)
        setPermissions([])
      } finally {
        setLoading(false)
      }
    }

    fetchPermissions()
  }, [_user?.id])

  return { permissions, loading }
}

/**
 * Hook to get _user with roles and permissions
 */
export function useUserWithRoles() {
  const { _user } = useAuth()
  const [_userWithRoles, setUserWithRoles] = useState<UserWithRoles | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!_user?.id) {
      setUserWithRoles(null)
      setLoading(false)
      return
    }

    const fetchUserWithRoles = async () => {
      setLoading(true)
      try {
        const _userData = await rbacService.getUserWithRoles(_user.id)
        setUserWithRoles(_userData)
      } catch (error) {
        console.error('Failed to fetch _user with roles:', error)
        setUserWithRoles(null)
      } finally {
        setLoading(false)
      }
    }

    fetchUserWithRoles()
  }, [_user?.id])

  return { _userWithRoles, loading }
}

/**
 * Hook for role management operations
 */
export function useRoleManagement() {
  const { _user } = useAuth()
  const [loading, setLoading] = useState(false)

  const assignRole = useCallback(async (
    _userId: string, 
    roleId: string, 
    expiresAt?: string
  ) => {
    if (!_user?.id) return false

    setLoading(true)
    try {
      const success = await rbacService.assignRole(_userId, roleId, _user.id, expiresAt)
      return success
    } catch (error) {
      console.error('Failed to assign role:', error)
      return false
    } finally {
      setLoading(false)
    }
  }, [_user?.id])

  const removeRole = useCallback(async (_userId: string, roleId: string) => {
    if (!_user?.id) return false

    setLoading(true)
    try {
      const success = await rbacService.removeRole(_userId, roleId, _user.id)
      return success
    } catch (error) {
      console.error('Failed to remove role:', error)
      return false
    } finally {
      setLoading(false)
    }
  }, [_user?.id])

  return { assignRole, removeRole, loading }
}

/**
 * Hook to check if _user can perform action on specific resource
 */
export function useCanAccess(
  resource: string, 
  action: string, 
  resourceId?: string
) {
  const permissionCheck: PermissionCheck = {
    resource: resource as any,
    action: action as any,
    resourceId
  }

  return usePermission(permissionCheck)
}

/**
 * Hook for common permission patterns
 */
export function useCommonPermissions() {
  const { _user } = useAuth()

  const canCreateDeals = usePermission({
    resource: 'deals',
    action: 'create'
  })

  const canManageUsers = usePermission({
    resource: 'staff__users',
    action: 'create'
  })

  const canViewAuditLogs = usePermission({
    resource: 'audit_logs',
    action: 'read'
  })

  const canExportData = usePermissions([
    { resource: 'deals', action: 'export' },
    { resource: 'resellers', action: 'export' },
    { resource: 'end__users', action: 'export' }
  ])

  const isAdmin = usePermission({
    resource: 'system_settings',
    action: 'update'
  })

  const isManager = usePermissions([
    { resource: 'deals', action: 'approve' },
    { resource: 'conflicts', action: 'assign' }
  ])

  return {
    canCreateDeals: canCreateDeals.allowed,
    canManageUsers: canManageUsers.allowed,
    canViewAuditLogs: canViewAuditLogs.allowed,
    canExportData: canExportData.hasAnyPermission,
    isAdmin: isAdmin.allowed,
    isManager: isManager.hasAllPermissions,
    loading: canCreateDeals.loading || canManageUsers.loading || canViewAuditLogs.loading
  }
}

/**
 * Higher-order hook for conditional rendering based on permissions
 */
export function useConditionalRender() {
  return {
    renderIf: (condition: boolean, component: React.ReactNode) => 
      condition ? component : null,
    
    renderIfPermission: (check: PermissionCheck, component: React.ReactNode) => {
      const { allowed, loading } = usePermission(check)
      if (loading) return null
      return allowed ? component : null
    },

    renderIfAnyPermission: (checks: PermissionCheck[], component: React.ReactNode) => {
      const { hasAnyPermission, loading } = usePermissions(checks)
      if (loading) return null
      return hasAnyPermission ? component : null
    },

    renderIfAllPermissions: (checks: PermissionCheck[], component: React.ReactNode) => {
      const { hasAllPermissions, loading } = usePermissions(checks)
      if (loading) return null
      return hasAllPermissions ? component : null
    }
  }
}

/**
 * Hook for permission-based navigation
 */
export function usePermissionBasedNavigation() {
  const { _user } = useAuth()

  const getAccessibleRoutes = useCallback(async () => {
    if (!_user?.id) return []

    const routePermissions = [
      { route: '/deals', permission: { resource: 'deals', action: 'read' } },
      { route: '/resellers', permission: { resource: 'resellers', action: 'read' } },
      { route: '/products', permission: { resource: 'products', action: 'read' } },
      { route: '/conflicts', permission: { resource: 'conflicts', action: 'read' } },
      { route: '/_users', permission: { resource: 'staff__users', action: 'read' } },
      { route: '/audit', permission: { resource: 'audit_logs', action: 'read' } },
      { route: '/settings', permission: { resource: 'system_settings', action: 'read' } }
    ]

    const accessibleRoutes = []
    
    for (const { route, permission } of routePermissions) {
      const result = await rbacService.hasPermission(_user.id, permission as PermissionCheck)
      if (result.allowed) {
        accessibleRoutes.push(route)
      }
    }

    return accessibleRoutes
  }, [_user?.id])

  return { getAccessibleRoutes }
}
