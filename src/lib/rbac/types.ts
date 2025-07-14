import { z } from 'zod'

// RBAC Types and Schemas
export const PermissionAction = z.enum([
  'create', 'read', 'update', 'delete', 'assign', 'approve', 'reject', 'export'
])

export const ResourceType = z.enum([
  'deals', 'resellers', 'end_users', 'products', 'conflicts', 'staff_users',
  'eligibility_rules', 'audit_logs', 'system_settings', 'reports'
])

export const AuditAction = z.enum([
  'login', 'logout', 'create', 'update', 'delete', 'view', 'export',
  'assign', 'approve', 'reject', 'password_change', 'permission_change'
])

export const SecurityEventType = z.enum([
  'login_success', 'login_failure', 'password_reset', 'account_locked',
  'permission_denied', 'suspicious_activity', 'data_export', 'bulk_operation'
])

// Permission Schema
export const PermissionSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string(),
  description: z.string().optional(),
  resource_type: ResourceType,
  action: PermissionAction,
  conditions: z.record(z.unknown()).default({}),
  is_system: z.boolean().default(false),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

// Role Schema
export const RoleSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string(),
  description: z.string().optional(),
  is_system: z.boolean().default(false),
  parent_role_id: z.string().uuid().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

// User Role Schema
export const UserRoleSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  role_id: z.string().uuid(),
  assigned_by: z.string().uuid().optional(),
  assigned_at: z.string().optional(),
  expires_at: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
})

// API Key Schema
export const ApiKeySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string(),
  key_hash: z.string(),
  key_prefix: z.string(),
  user_id: z.string().uuid().optional(),
  permissions: z.array(z.string()).default([]),
  rate_limit: z.number().default(1000),
  expires_at: z.string().nullable().optional(),
  last_used_at: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

// Audit Log Schema
export const AuditLogSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  action: AuditAction,
  resource_type: ResourceType.optional(),
  resource_id: z.string().uuid().optional(),
  old_values: z.record(z.unknown()).nullable().optional(),
  new_values: z.record(z.unknown()).nullable().optional(),
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
  session_id: z.string().optional(),
  success: z.boolean().default(true),
  error_message: z.string().optional(),
  metadata: z.record(z.unknown()).default({}),
  created_at: z.string().optional(),
})

// Security Event Schema
export const SecurityEventSchema = z.object({
  id: z.string().uuid().optional(),
  event_type: SecurityEventType,
  user_id: z.string().uuid().optional(),
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
  details: z.record(z.unknown()).default({}),
  severity: z.number().min(1).max(4).default(1), // 1=low, 2=medium, 3=high, 4=critical
  resolved: z.boolean().default(false),
  resolved_by: z.string().uuid().optional(),
  resolved_at: z.string().optional(),
  created_at: z.string().optional(),
})

// Rate Limit Schema
export const RateLimitSchema = z.object({
  id: z.string().uuid().optional(),
  identifier: z.string(),
  endpoint: z.string(),
  requests_count: z.number().default(0),
  window_start: z.string().optional(),
  blocked_until: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

// Type exports
export type Permission = z.infer<typeof PermissionSchema>
export type Role = z.infer<typeof RoleSchema>
export type UserRole = z.infer<typeof UserRoleSchema>
export type ApiKey = z.infer<typeof ApiKeySchema>
export type AuditLog = z.infer<typeof AuditLogSchema>
export type SecurityEvent = z.infer<typeof SecurityEventSchema>
export type RateLimit = z.infer<typeof RateLimitSchema>

// Extended types with relationships
export type RoleWithPermissions = Role & {
  permissions: Permission[]
  parent_role?: Role | null
}

export type UserWithRoles = {
  id: string
  email: string
  name: string
  roles: (UserRole & { role: RoleWithPermissions })[]
}

export type PermissionCheck = {
  resource: z.infer<typeof ResourceType>
  action: z.infer<typeof PermissionAction>
  resourceId?: string
  context?: Record<string, unknown>
}

// Permission context types
export type PermissionContext = {
  userId: string
  userRoles: string[]
  resourceOwnerId?: string
  territory?: string
  dealValue?: number
  [key: string]: unknown
}

// Security configuration types
export type SecurityConfig = {
  passwordPolicy: {
    minLength: number
    requireUppercase: boolean
    requireLowercase: boolean
    requireNumbers: boolean
    requireSpecialChars: boolean
    maxAge: number // days
  }
  sessionPolicy: {
    maxDuration: number // minutes
    idleTimeout: number // minutes
    maxConcurrentSessions: number
  }
  rateLimiting: {
    defaultLimit: number
    windowMinutes: number
    endpoints: Record<string, { limit: number; window: number }>
  }
  auditPolicy: {
    retentionDays: number
    logLevel: 'minimal' | 'standard' | 'detailed'
    sensitiveFields: string[]
  }
  twoFactorAuth: {
    enabled: boolean
    required: boolean
    issuer: string
  }
}

// API Response types for RBAC
export type RBACResponse<T> = {
  data: T | null
  error: string | null
  success: boolean
  permissions?: string[]
}

// Permission check result
export type PermissionResult = {
  allowed: boolean
  reason?: string
  conditions?: Record<string, unknown>
}

// Bulk permission check
export type BulkPermissionCheck = {
  permissions: PermissionCheck[]
  context: PermissionContext
}

export type BulkPermissionResult = {
  results: Record<string, PermissionResult>
  hasAnyPermission: boolean
  hasAllPermissions: boolean
}

// Security metrics
export type SecurityMetrics = {
  activeUsers: number
  failedLogins24h: number
  securityEvents24h: number
  criticalEvents: number
  blockedIPs: number
  lockedAccounts: number
  apiKeyUsage: number
  auditEvents24h: number
}

// Compliance report types
export type ComplianceReport = {
  period: {
    start: string
    end: string
  }
  dataAccess: {
    totalAccesses: number
    uniqueUsers: number
    exportEvents: number
  }
  dataModification: {
    creates: number
    updates: number
    deletes: number
  }
  securityEvents: {
    total: number
    byType: Record<string, number>
    resolved: number
    unresolved: number
  }
  userActivity: {
    totalUsers: number
    activeUsers: number
    newUsers: number
    deletedUsers: number
  }
  dataRetention: {
    recordsArchived: number
    recordsDeleted: number
    policiesApplied: number
  }
}

// GDPR specific types
export type GDPRRequest = {
  id: string
  type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction'
  subject_email: string
  requested_by: string
  status: 'pending' | 'processing' | 'completed' | 'rejected'
  reason?: string
  data_categories: string[]
  created_at: string
  completed_at?: string
}

export type DataSubjectRights = {
  access: boolean // Right to access personal data
  rectification: boolean // Right to rectify inaccurate data
  erasure: boolean // Right to be forgotten
  portability: boolean // Right to data portability
  restriction: boolean // Right to restrict processing
  objection: boolean // Right to object to processing
}
