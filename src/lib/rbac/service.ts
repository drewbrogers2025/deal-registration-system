import type { 
  Permission, 
  Role, 
  UserRole, 
  PermissionCheck, 
  PermissionResult, 
  PermissionContext,
  BulkPermissionCheck,
  BulkPermissionResult,
  UserWithRoles,
  RoleWithPermissions
} from './types'

export class RBACService {
  private supabase = createAdminClient()

  /**
   * Check if a user has a specific permission
   */
  async hasPermission(
    _userId: string, 
    check: PermissionCheck, 
    context?: PermissionContext
  ): Promise<PermissionResult> {
    try {
      // Get user's permissions through roles
      const { data: userPermissions, error } = await this.supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', _userId)
        .eq('resource_type', check.resource)
        .eq('action', check.action)
        .eq('role_active', true)

      if (error) {
        console.error('Error checking permission:', error)
        return { allowed: false, reason: 'Permission check failed' }
      }

      if (!userPermissions || userPermissions.length === 0) {
        return { allowed: false, reason: 'Permission not granted' }
      }

      // Check context-based conditions if provided
      if (context && check.resourceId) {
        const contextResult = await this.checkContextualPermissions(
          _userId, 
          check, 
          context
        )
        if (!contextResult.allowed) {
          return contextResult
        }
      }

      return { allowed: true }
    } catch (error) {
      console.error('Permission check error:', error)
      return { allowed: false, reason: 'Permission check failed' }
    }
  }

  /**
   * Check multiple permissions at once
   */
  async hasPermissions(
    _userId: string, 
    checks: BulkPermissionCheck
  ): Promise<BulkPermissionResult> {
    const results: Record<string, PermissionResult> = {}
    
    for (const [index, check] of checks.permissions.entries()) {
      const key = `${check.resource}.${check.action}.${index}`
      results[key] = await this.hasPermission(_userId, check, checks.context)
    }

    const hasAnyPermission = Object.values(results).some(r => r.allowed)
    const hasAllPermissions = Object.values(results).every(r => r.allowed)

    return {
      results,
      hasAnyPermission,
      hasAllPermissions
    }
  }

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(_userId: string): Promise<Permission[]> {
    const { data, error } = await this.supabase
      .from('user_permissions')
      .select('permission_name, resource_type, action')
      .eq('user_id', _userId)
      .eq('role_active', true)

    if (error) {
      console.error('Error fetching user permissions:', error)
      return []
    }

    return data.map(p => ({
      name: p.permission_name,
      resource_type: p.resource_type,
      action: p.action
    })) as Permission[]
  }

  /**
   * Get user with roles and permissions
   */
  async getUserWithRoles(_userId: string): Promise<UserWithRoles | null> {
    const { data: user, error: userError } = await this.supabase
      .from('staff_users')
      .select('id, email, name')
      .eq('id', _userId)
      .single()

    if (userError || !user) {
      return null
    }

    const { data: userRoles, error: rolesError } = await this.supabase
      .from('user_roles')
      .select(`
        *,
        role:roles(
          *,
          permissions:role_permissions(
            permission:permissions(*)
          )
        )
      `)
      .eq('user_id', _userId)
      .eq('is_active', true)

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError)
      return { ...user, roles: [] }
    }

    return {
      ...user,
      roles: userRoles as (UserRole & { role: RoleWithPermissions })[]
    }
  }

  /**
   * Assign role to user
   */
  async assignRole(
    _userId: string, 
    roleId: string, 
    assignedBy: string,
    expiresAt?: string
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_roles')
        .insert({
          user_id: _userId,
          role_id: roleId,
          assigned_by: assignedBy,
          expires_at: expiresAt
        })

      if (error) {
        console.error('Error assigning role:', error)
        return false
      }

      // Log the role assignment
      await this.logAuditEvent(assignedBy, 'permission_change', 'staff_users', _userId, {
        action: 'role_assigned',
        role_id: roleId,
        expires_at: expiresAt
      })

      return true
    } catch (error) {
      console.error('Role assignment error:', error)
      return false
    }
  }

  /**
   * Remove role from user
   */
  async removeRole(_userId: string, roleId: string, removedBy: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_roles')
        .update({ is_active: false })
        .eq('user_id', _userId)
        .eq('role_id', roleId)

      if (error) {
        console.error('Error removing role:', error)
        return false
      }

      // Log the role removal
      await this.logAuditEvent(removedBy, 'permission_change', 'staff_users', _userId, {
        action: 'role_removed',
        role_id: roleId
      })

      return true
    } catch (error) {
      console.error('Role removal error:', error)
      return false
    }
  }

  /**
   * Create a new role
   */
  async createRole(role: Omit<Role, 'id' | 'created_at' | 'updated_at'>): Promise<Role | null> {
    try {
      const { data, error } = await this.supabase
        .from('roles')
        .insert(role)
        .select()
        .single()

      if (error) {
        console.error('Error creating role:', error)
        return null
      }

      return data as Role
    } catch (error) {
      console.error('Role creation error:', error)
      return null
    }
  }

  /**
   * Get all roles
   */
  async getRoles(): Promise<Role[]> {
    const { data, error } = await this.supabase
      .from('roles')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching roles:', error)
      return []
    }

    return data as Role[]
  }

  /**
   * Get all permissions
   */
  async getPermissions(): Promise<Permission[]> {
    const { data, error } = await this.supabase
      .from('permissions')
      .select('*')
      .order('resource_type, action')

    if (error) {
      console.error('Error fetching permissions:', error)
      return []
    }

    return data as Permission[]
  }

  /**
   * Check contextual permissions (e.g., own data vs all data)
   */
  private async checkContextualPermissions(
    _userId: string,
    check: PermissionCheck,
    context: PermissionContext
  ): Promise<PermissionResult> {
    // Example: Users can only modify their own data unless they have elevated permissions
    if (check.action === 'update' || check.action === 'delete') {
      // Check if user is trying to modify their own data
      if (context.resourceOwnerId && context.resourceOwnerId !== _userId) {
        // Check if user has elevated permissions for this resource
        const hasElevatedPermission = await this.hasElevatedPermission(
          _userId, 
          check.resource
        )
        
        if (!hasElevatedPermission) {
          return { 
            allowed: false, 
            reason: 'Can only modify own data' 
          }
        }
      }
    }

    // Territory-based permissions
    if (context.territory && check.resource === 'deals') {
      const userTerritory = await this.getUserTerritory(_userId)
      if (userTerritory && userTerritory !== context.territory) {
        const hasGlobalAccess = await this.hasGlobalAccess(_userId)
        if (!hasGlobalAccess) {
          return { 
            allowed: false, 
            reason: 'Territory access restricted' 
          }
        }
      }
    }

    return { allowed: true }
  }

  /**
   * Check if user has elevated permissions for a resource
   */
  private async hasElevatedPermission(_userId: string, resource: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('user_permissions')
      .select('role_name')
      .eq('user_id', _userId)
      .eq('resource_type', resource)
      .in('role_name', ['admin', 'manager'])
      .eq('role_active', true)

    return data && data.length > 0
  }

  /**
   * Get user's territory
   */
  private async getUserTerritory(_userId: string): Promise<string | null> {
    // This would depend on how territories are assigned to users
    // For now, return null (implement based on your business logic)
    return null
  }

  /**
   * Check if user has global access
   */
  private async hasGlobalAccess(_userId: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('user_permissions')
      .select('role_name')
      .eq('user_id', _userId)
      .in('role_name', ['admin', 'manager'])
      .eq('role_active', true)

    return data && data.length > 0
  }

  /**
   * Log audit event
   */
  private async logAuditEvent(
    _userId: string,
    action: string,
    resourceType?: string,
    resourceId?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      await this.supabase.rpc('log_audit_event', {
        p_user_id: _userId,
        p_action: action,
        p_resource_type: resourceType,
        p_resource_id: resourceId,
        p_metadata: metadata || {}
      })
    } catch (error) {
      console.error('Error logging audit event:', error)
    }
  }
}

// Singleton instance
export const rbacService = new RBACService()
