'use client'

import React from 'react'
import { usePermission, usePermissions } from '@/lib/rbac/hooks'
import type { PermissionCheck } from '@/lib/rbac/types'

interface PermissionGuardProps {
  children: React.ReactNode
  permission?: PermissionCheck
  permissions?: PermissionCheck[]
  requireAll?: boolean
  fallback?: React.ReactNode
  loading?: React.ReactNode
}

/**
 * Component that conditionally renders children based on user permissions
 */
export function PermissionGuard({
  children,
  permission,
  permissions,
  requireAll = false,
  fallback = null,
  loading = null
}: PermissionGuardProps) {
  // Single permission check
  if (permission) {
    const { allowed, loading: isLoading } = usePermission(permission)
    
    if (isLoading) {
      return <>{loading}</>
    }
    
    return allowed ? <>{children}</> : <>{fallback}</>
  }

  // Multiple permissions check
  if (permissions) {
    const { hasAnyPermission, hasAllPermissions, loading: isLoading } = usePermissions(permissions)
    
    if (isLoading) {
      return <>{loading}</>
    }
    
    const hasRequiredPermissions = requireAll ? hasAllPermissions : hasAnyPermission
    return hasRequiredPermissions ? <>{children}</> : <>{fallback}</>
  }

  // No permissions specified, render children
  return <>{children}</>
}

interface ConditionalRenderProps {
  condition: boolean
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Simple conditional render component
 */
export function ConditionalRender({ condition, children, fallback = null }: ConditionalRenderProps) {
  return condition ? <>{children}</> : <>{fallback}</>
}

interface RoleGuardProps {
  children: React.ReactNode
  roles: string[]
  requireAll?: boolean
  fallback?: React.ReactNode
  loading?: React.ReactNode
}

/**
 * Component that conditionally renders children based on user roles
 */
export function RoleGuard({
  children,
  roles,
  requireAll = false,
  fallback = null,
  loading = null
}: RoleGuardProps) {
  // Convert roles to permission checks
  const permissions: PermissionCheck[] = roles.map(role => ({
    resource: 'system_settings' as const,
    action: 'read' as const,
    context: { role }
  }))

  return (
    <PermissionGuard
      permissions={permissions}
      requireAll={requireAll}
      fallback={fallback}
      loading={loading}
    >
      {children}
    </PermissionGuard>
  )
}

interface AdminOnlyProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  loading?: React.ReactNode
}

/**
 * Component that only renders for admin users
 */
export function AdminOnly({ children, fallback = null, loading = null }: AdminOnlyProps) {
  return (
    <PermissionGuard
      permission={{
        resource: 'system_settings',
        action: 'update'
      }}
      fallback={fallback}
      loading={loading}
    >
      {children}
    </PermissionGuard>
  )
}

interface ManagerOrAdminProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  loading?: React.ReactNode
}

/**
 * Component that renders for manager or admin users
 */
export function ManagerOrAdmin({ children, fallback = null, loading = null }: ManagerOrAdminProps) {
  return (
    <PermissionGuard
      permissions={[
        { resource: 'deals', action: 'approve' },
        { resource: 'system_settings', action: 'update' }
      ]}
      requireAll={false} // Either permission is sufficient
      fallback={fallback}
      loading={loading}
    >
      {children}
    </PermissionGuard>
  )
}

interface CanCreateProps {
  resource: string
  children: React.ReactNode
  fallback?: React.ReactNode
  loading?: React.ReactNode
}

/**
 * Component that renders if user can create a specific resource
 */
export function CanCreate({ resource, children, fallback = null, loading = null }: CanCreateProps) {
  return (
    <PermissionGuard
      permission={{
        resource: resource as any,
        action: 'create'
      }}
      fallback={fallback}
      loading={loading}
    >
      {children}
    </PermissionGuard>
  )
}

interface CanEditProps {
  resource: string
  resourceId?: string
  children: React.ReactNode
  fallback?: React.ReactNode
  loading?: React.ReactNode
}

/**
 * Component that renders if user can edit a specific resource
 */
export function CanEdit({ 
  resource, 
  resourceId, 
  children, 
  fallback = null, 
  loading = null 
}: CanEditProps) {
  return (
    <PermissionGuard
      permission={{
        resource: resource as any,
        action: 'update',
        resourceId
      }}
      fallback={fallback}
      loading={loading}
    >
      {children}
    </PermissionGuard>
  )
}

interface CanDeleteProps {
  resource: string
  resourceId?: string
  children: React.ReactNode
  fallback?: React.ReactNode
  loading?: React.ReactNode
}

/**
 * Component that renders if user can delete a specific resource
 */
export function CanDelete({ 
  resource, 
  resourceId, 
  children, 
  fallback = null, 
  loading = null 
}: CanDeleteProps) {
  return (
    <PermissionGuard
      permission={{
        resource: resource as any,
        action: 'delete',
        resourceId
      }}
      fallback={fallback}
      loading={loading}
    >
      {children}
    </PermissionGuard>
  )
}

interface CanExportProps {
  resource: string
  children: React.ReactNode
  fallback?: React.ReactNode
  loading?: React.ReactNode
}

/**
 * Component that renders if user can export a specific resource
 */
export function CanExport({ resource, children, fallback = null, loading = null }: CanExportProps) {
  return (
    <PermissionGuard
      permission={{
        resource: resource as any,
        action: 'export'
      }}
      fallback={fallback}
      loading={loading}
    >
      {children}
    </PermissionGuard>
  )
}

interface PermissionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  permission: PermissionCheck
  children: React.ReactNode
  disabledText?: string
  loadingText?: string
}

/**
 * Button that is only enabled if user has the required permission
 */
export function PermissionButton({
  permission,
  children,
  disabledText = 'No permission',
  loadingText = 'Loading...',
  disabled,
  title,
  ...props
}: PermissionButtonProps) {
  const { allowed, loading } = usePermission(permission)

  if (loading) {
    return (
      <button {...props} disabled={true} title={loadingText}>
        {loadingText}
      </button>
    )
  }

  const isDisabled = disabled || !allowed
  const buttonTitle = !allowed ? disabledText : title

  return (
    <button {...props} disabled={isDisabled} title={buttonTitle}>
      {children}
    </button>
  )
}

interface PermissionLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  permission: PermissionCheck
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Link that only renders if user has the required permission
 */
export function PermissionLink({
  permission,
  children,
  fallback = null,
  ...props
}: PermissionLinkProps) {
  const { allowed, loading } = usePermission(permission)

  if (loading) {
    return <>{fallback}</>
  }

  if (!allowed) {
    return <>{fallback}</>
  }

  return <a {...props}>{children}</a>
}

// Export all components
export {
  PermissionGuard as default,
  ConditionalRender,
  RoleGuard,
  AdminOnly,
  ManagerOrAdmin,
  CanCreate,
  CanEdit,
  CanDelete,
  CanExport,
  PermissionButton,
  PermissionLink
}
