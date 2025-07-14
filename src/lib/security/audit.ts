import { createAdminClient } from '@/lib/supabase'
import type { AuditLog, SecurityEvent } from '@/lib/rbac/types'

export interface AuditLogInput {
  user_id?: string
  action: string
  resource_type?: string
  resource_id?: string
  old_values?: Record<string, unknown>
  new_values?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
  session_id?: string
  success?: boolean
  error_message?: string
  metadata?: Record<string, unknown>
}

export interface SecurityEventInput {
  event_type: string
  user_id?: string
  ip_address?: string
  user_agent?: string
  details?: Record<string, unknown>
  severity?: number
}

export class AuditService {
  private supabase = createAdminClient()

  /**
   * Log an audit event
   */
  async logEvent(input: AuditLogInput): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from('audit_logs')
        .insert({
          user_id: input.user_id,
          action: input.action,
          resource_type: input.resource_type,
          resource_id: input.resource_id,
          old_values: input.old_values,
          new_values: input.new_values,
          ip_address: input.ip_address,
          user_agent: input.user_agent,
          session_id: input.session_id,
          success: input.success ?? true,
          error_message: input.error_message,
          metadata: input.metadata || {}
        })
        .select('id')
        .single()

      if (error) {
        console.error('Error logging audit event:', error)
        return null
      }

      return data.id
    } catch (error) {
      console.error('Audit logging error:', error)
      return null
    }
  }

  /**
   * Log user access
   */
  async logAccess(input: AuditLogInput): Promise<void> {
    await this.logEvent({
      ...input,
      action: input.action || 'view'
    })
  }

  /**
   * Log data modification
   */
  async logModification(
    userId: string,
    action: 'create' | 'update' | 'delete',
    resourceType: string,
    resourceId: string,
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.logEvent({
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      old_values: oldValues,
      new_values: newValues,
      metadata
    })
  }

  /**
   * Log authentication events
   */
  async logAuthentication(
    userId: string | null,
    action: 'login' | 'logout' | 'password_change',
    success: boolean,
    ipAddress?: string,
    userAgent?: string,
    errorMessage?: string
  ): Promise<void> {
    await this.logEvent({
      user_id: userId,
      action,
      resource_type: 'staff_users',
      resource_id: userId,
      success,
      ip_address: ipAddress,
      user_agent: userAgent,
      error_message: errorMessage,
      metadata: {
        authentication_event: true
      }
    })
  }

  /**
   * Log permission changes
   */
  async logPermissionChange(
    userId: string,
    targetUserId: string,
    action: 'role_assigned' | 'role_removed' | 'permission_granted' | 'permission_revoked',
    details: Record<string, unknown>
  ): Promise<void> {
    await this.logEvent({
      user_id: userId,
      action: 'permission_change',
      resource_type: 'staff_users',
      resource_id: targetUserId,
      metadata: {
        permission_action: action,
        ...details
      }
    })
  }

  /**
   * Log data export events
   */
  async logDataExport(
    userId: string,
    resourceType: string,
    filters?: Record<string, unknown>,
    recordCount?: number
  ): Promise<void> {
    await this.logEvent({
      user_id: userId,
      action: 'export',
      resource_type: resourceType,
      metadata: {
        export_filters: filters,
        record_count: recordCount,
        export_timestamp: new Date().toISOString()
      }
    })
  }

  /**
   * Get audit logs with filtering
   */
  async getAuditLogs(filters: {
    userId?: string
    action?: string
    resourceType?: string
    startDate?: string
    endDate?: string
    page?: number
    limit?: number
  }): Promise<{
    logs: AuditLog[]
    total: number
    page: number
    totalPages: number
  }> {
    try {
      const page = filters.page || 1
      const limit = filters.limit || 50
      const offset = (page - 1) * limit

      let query = this.supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (filters.userId) {
        query = query.eq('user_id', filters.userId)
      }

      if (filters.action) {
        query = query.eq('action', filters.action)
      }

      if (filters.resourceType) {
        query = query.eq('resource_type', filters.resourceType)
      }

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate)
      }

      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate)
      }

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching audit logs:', error)
        return { logs: [], total: 0, page, totalPages: 0 }
      }

      const totalPages = Math.ceil((count || 0) / limit)

      return {
        logs: data as AuditLog[],
        total: count || 0,
        page,
        totalPages
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error)
      return { logs: [], total: 0, page: 1, totalPages: 0 }
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStats(timeframe: '24h' | '7d' | '30d' = '24h'): Promise<{
    totalEvents: number
    uniqueUsers: number
    topActions: Array<{ action: string; count: number }>
    topResources: Array<{ resource_type: string; count: number }>
    errorRate: number
  }> {
    try {
      const timeMap = {
        '24h': '24 hours',
        '7d': '7 days',
        '30d': '30 days'
      }

      const timeInterval = timeMap[timeframe]

      // Get total events
      const { count: totalEvents } = await this.supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `now() - interval '${timeInterval}'`)

      // Get unique users
      const { data: uniqueUsersData } = await this.supabase
        .from('audit_logs')
        .select('user_id')
        .gte('created_at', `now() - interval '${timeInterval}'`)
        .not('user_id', 'is', null)

      const uniqueUsers = new Set(uniqueUsersData?.map(log => log.user_id)).size

      // Get top actions
      const { data: actionsData } = await this.supabase
        .from('audit_logs')
        .select('action')
        .gte('created_at', `now() - interval '${timeInterval}'`)

      const actionCounts = actionsData?.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      const topActions = Object.entries(actionCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([action, count]) => ({ action, count }))

      // Get top resources
      const { data: resourcesData } = await this.supabase
        .from('audit_logs')
        .select('resource_type')
        .gte('created_at', `now() - interval '${timeInterval}'`)
        .not('resource_type', 'is', null)

      const resourceCounts = resourcesData?.reduce((acc, log) => {
        acc[log.resource_type] = (acc[log.resource_type] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      const topResources = Object.entries(resourceCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([resource_type, count]) => ({ resource_type, count }))

      // Get error rate
      const { count: errorCount } = await this.supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `now() - interval '${timeInterval}'`)
        .eq('success', false)

      const errorRate = totalEvents ? ((errorCount || 0) / totalEvents) * 100 : 0

      return {
        totalEvents: totalEvents || 0,
        uniqueUsers,
        topActions,
        topResources,
        errorRate
      }
    } catch (error) {
      console.error('Error fetching audit stats:', error)
      return {
        totalEvents: 0,
        uniqueUsers: 0,
        topActions: [],
        topResources: [],
        errorRate: 0
      }
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    startDate: string,
    endDate: string
  ): Promise<{
    period: { start: string; end: string }
    dataAccess: { totalAccesses: number; uniqueUsers: number; exportEvents: number }
    dataModification: { creates: number; updates: number; deletes: number }
    userActivity: { totalUsers: number; activeUsers: number }
  }> {
    try {
      // Data access metrics
      const { count: totalAccesses } = await this.supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .in('action', ['view', 'read'])

      const { data: accessUsers } = await this.supabase
        .from('audit_logs')
        .select('user_id')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .in('action', ['view', 'read'])
        .not('user_id', 'is', null)

      const uniqueUsers = new Set(accessUsers?.map(log => log.user_id)).size

      const { count: exportEvents } = await this.supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .eq('action', 'export')

      // Data modification metrics
      const { count: creates } = await this.supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .eq('action', 'create')

      const { count: updates } = await this.supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .eq('action', 'update')

      const { count: deletes } = await this.supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .eq('action', 'delete')

      // User activity metrics
      const { data: allUsers } = await this.supabase
        .from('audit_logs')
        .select('user_id')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .not('user_id', 'is', null)

      const activeUsers = new Set(allUsers?.map(log => log.user_id)).size

      const { count: totalUsers } = await this.supabase
        .from('staff_users')
        .select('*', { count: 'exact', head: true })

      return {
        period: { start: startDate, end: endDate },
        dataAccess: {
          totalAccesses: totalAccesses || 0,
          uniqueUsers,
          exportEvents: exportEvents || 0
        },
        dataModification: {
          creates: creates || 0,
          updates: updates || 0,
          deletes: deletes || 0
        },
        userActivity: {
          totalUsers: totalUsers || 0,
          activeUsers
        }
      }
    } catch (error) {
      console.error('Error generating compliance report:', error)
      throw error
    }
  }
}

// Singleton instance
export const auditService = new AuditService()
