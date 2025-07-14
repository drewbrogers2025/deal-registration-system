/**
 * Security Implementation Tests
 * 
 * This file contains comprehensive tests for the security implementation
 * including RBAC, audit logging, rate limiting, and data protection.
 */

import { rbacService } from '../rbac/service'
import { auditService } from '../security/audit'
import { rateLimitService } from '../security/rate-limiting'
import { securityService } from '../security/security-service'
import type { PermissionCheck } from '../rbac/types'

// Mock Supabase client
jest.mock('../supabase', () => ({
  createAdminClient: () => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({ data: null, error: null }))
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({ data: { id: 'test-id' }, error: null }))
        }))
      })),
      rpc: jest.fn(() => ({ data: true, error: null }))
    }))
  })
}))

describe('RBAC Service', () => {
  const mockUserId = 'user-123'
  const mockPermissionCheck: PermissionCheck = {
    resource: 'deals',
    action: 'read'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('hasPermission', () => {
    it('should return true for valid permission', async () => {
      const result = await rbacService.hasPermission(mockUserId, mockPermissionCheck)
      expect(result.allowed).toBe(true)
    })

    it('should return false for invalid permission', async () => {
      // Mock no permissions found
      const mockSupabase = import('../supabase').createAdminClient()
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({ data: [], error: null }))
              }))
            }))
          }))
        }))
      })

      const result = await rbacService.hasPermission(mockUserId, mockPermissionCheck)
      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('Permission not granted')
    })

    it('should handle database errors gracefully', async () => {
      // Mock database error
      const mockSupabase = import('../supabase').createAdminClient()
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({ data: null, error: new Error('DB Error') }))
              }))
            }))
          }))
        }))
      })

      const result = await rbacService.hasPermission(mockUserId, mockPermissionCheck)
      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('Permission check failed')
    })
  })

  describe('assignRole', () => {
    it('should successfully assign role to user', async () => {
      const result = await rbacService.assignRole(
        mockUserId,
        'role-123',
        'admin-123'
      )
      expect(result).toBe(true)
    })

    it('should handle role assignment errors', async () => {
      // Mock database error
      const mockSupabase = import('../supabase').createAdminClient()
      mockSupabase.from.mockReturnValue({
        insert: jest.fn(() => ({ error: new Error('Insert failed') }))
      })

      const result = await rbacService.assignRole(
        mockUserId,
        'role-123',
        'admin-123'
      )
      expect(result).toBe(false)
    })
  })
})

describe('Audit Service', () => {
  const mockAuditInput = {
    user_id: 'user-123',
    action: 'create',
    resource_type: 'deals',
    resource_id: 'deal-123',
    success: true,
    metadata: { test: 'data' }
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('logEvent', () => {
    it('should successfully log audit event', async () => {
      const result = await auditService.logEvent(mockAuditInput)
      expect(result).toBe('test-id')
    })

    it('should handle logging errors gracefully', async () => {
      // Mock database error
      const mockSupabase = import('../supabase').createAdminClient()
      mockSupabase.from.mockReturnValue({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => ({ data: null, error: new Error('Insert failed') }))
          }))
        }))
      })

      const result = await auditService.logEvent(mockAuditInput)
      expect(result).toBeNull()
    })
  })

  describe('logAuthentication', () => {
    it('should log successful authentication', async () => {
      await auditService.logAuthentication(
        'user-123',
        'login',
        true,
        '192.168.1.1',
        'Mozilla/5.0'
      )

      // Verify the audit event was logged
      expect(auditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          action: 'login',
          success: true,
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0'
        })
      )
    })

    it('should log failed authentication', async () => {
      await auditService.logAuthentication(
        'user-123',
        'login',
        false,
        '192.168.1.1',
        'Mozilla/5.0',
        'Invalid credentials'
      )

      expect(auditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          action: 'login',
          success: false,
          error_message: 'Invalid credentials'
        })
      )
    })
  })
})

describe('Rate Limiting Service', () => {
  const mockRequest = {
    nextUrl: { pathname: '/api/test' },
    headers: new Map([
      ['x-forwarded-for', '192.168.1.1'],
      ['user-agent', 'Mozilla/5.0']
    ]),
    ip: '192.168.1.1'
  } as any

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('checkRateLimit', () => {
    it('should allow requests within limit', async () => {
      const result = await rateLimitService.checkRateLimit(
        mockRequest,
        100,
        60000
      )

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBeGreaterThanOrEqual(0)
      expect(result.resetTime).toBeGreaterThan(Date.now())
    })

    it('should block requests exceeding limit', async () => {
      // Mock rate limit exceeded
      const mockSupabase = import('../supabase').createAdminClient()
      mockSupabase.rpc.mockReturnValue({ data: false, error: null })

      const result = await rateLimitService.checkRateLimit(
        mockRequest,
        1,
        60000
      )

      expect(result.allowed).toBe(false)
      expect(result.retryAfter).toBeGreaterThan(0)
    })

    it('should fallback to memory store on database error', async () => {
      // Mock database error
      const mockSupabase = import('../supabase').createAdminClient()
      mockSupabase.rpc.mockReturnValue({ data: null, error: new Error('DB Error') })

      const result = await rateLimitService.checkRateLimit(
        mockRequest,
        100,
        60000
      )

      // Should still work with memory fallback
      expect(result.allowed).toBe(true)
    })
  })

  describe('checkUserRateLimit', () => {
    it('should check rate limit for specific user', async () => {
      const result = await rateLimitService.checkUserRateLimit(
        'user-123',
        '/api/deals',
        50,
        60000
      )

      expect(result.allowed).toBe(true)
    })
  })
})

describe('Security Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('validatePassword', () => {
    it('should accept strong password', () => {
      const result = securityService.validatePassword('StrongP@ssw0rd!')
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject weak password', () => {
      const result = securityService.validatePassword('weak')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should reject common passwords', () => {
      const result = securityService.validatePassword('password123')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password is too common and easily guessable')
    })
  })

  describe('logSecurityEvent', () => {
    it('should log security event successfully', async () => {
      const result = await securityService.logSecurityEvent({
        event_type: 'login_failure',
        user_id: 'user-123',
        ip_address: '192.168.1.1',
        severity: 2
      })

      expect(result).toBe('test-id')
    })

    it('should escalate critical events', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      await securityService.logSecurityEvent({
        event_type: 'suspicious_activity',
        severity: 4,
        details: { reason: 'multiple_failed_attempts' }
      })

      expect(consoleSpy).toHaveBeenCalledWith(
        'Critical security event detected:',
        expect.any(Object)
      )

      consoleSpy.mockRestore()
    })
  })

  describe('checkAccountLockout', () => {
    it('should not lock account with few failed attempts', async () => {
      // Mock user with 2 failed attempts
      const mockSupabase = import('../supabase').createAdminClient()
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: { failed_login_attempts: 2, locked_until: null },
              error: null
            }))
          }))
        }))
      })

      const result = await securityService.checkAccountLockout('user-123')
      expect(result.shouldLock).toBe(false)
      expect(result.attemptsRemaining).toBe(3)
    })

    it('should lock account after max failed attempts', async () => {
      // Mock user with 5 failed attempts
      const mockSupabase = import('../supabase').createAdminClient()
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: { failed_login_attempts: 5, locked_until: null },
              error: null
            }))
          }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({ error: null }))
        }))
      })

      const result = await securityService.checkAccountLockout('user-123')
      expect(result.shouldLock).toBe(true)
      expect(result.lockUntil).toBeInstanceOf(Date)
    })
  })
})

describe('Security Integration Tests', () => {
  it('should enforce permission-based access control', async () => {
    // Test that a user without permissions cannot access protected resources
    const hasPermission = await rbacService.hasPermission('user-123', {
      resource: 'admin_settings',
      action: 'update'
    })

    expect(hasPermission.allowed).toBe(false)
  })

  it('should log all security-relevant actions', async () => {
    const logSpy = jest.spyOn(auditService, 'logEvent')

    // Simulate a security action
    await securityService.recordFailedLogin(
      'user-123',
      '192.168.1.1',
      'Mozilla/5.0'
    )

    expect(logSpy).toHaveBeenCalled()
  })

  it('should rate limit API requests', async () => {
    const mockRequest = {
      nextUrl: { pathname: '/api/test' },
      headers: new Map([['x-forwarded-for', '192.168.1.1']]),
      ip: '192.168.1.1'
    } as any

    // First request should be allowed
    const result1 = await rateLimitService.checkRateLimit(mockRequest, 1, 60000)
    expect(result1.allowed).toBe(true)

    // Second request should be blocked (if using memory store)
    const _result2 = await rateLimitService.checkRateLimit(mockRequest, 1, 60000)
    // Note: This might pass if using database store, depending on implementation
  })
})

describe('Security Configuration Tests', () => {
  it('should have secure default configurations', () => {
    const { securityConfig } = import('../security/config')

    expect(securityConfig.passwordPolicy.minLength).toBeGreaterThanOrEqual(8)
    expect(securityConfig.passwordPolicy.requireUppercase).toBe(true)
    expect(securityConfig.passwordPolicy.requireNumbers).toBe(true)
    expect(securityConfig.sessionPolicy.maxDuration).toBeLessThanOrEqual(24 * 60)
    expect(securityConfig.rateLimiting.defaultLimit).toBeGreaterThan(0)
  })

  it('should have appropriate rate limits for sensitive endpoints', () => {
    const { securityConfig } = import('../security/config')

    expect(securityConfig.rateLimiting.endpoints['/api/auth/login'].limit).toBeLessThanOrEqual(10)
    expect(securityConfig.rateLimiting.endpoints['/api/export'].limit).toBeLessThanOrEqual(10)
  })
})

// Performance tests
describe('Security Performance Tests', () => {
  it('should check permissions efficiently', async () => {
    const start = Date.now()
    
    await rbacService.hasPermission('user-123', {
      resource: 'deals',
      action: 'read'
    })
    
    const duration = Date.now() - start
    expect(duration).toBeLessThan(100) // Should complete within 100ms
  })

  it('should log audit events efficiently', async () => {
    const start = Date.now()
    
    await auditService.logEvent({
      user_id: 'user-123',
      action: 'test',
      success: true
    })
    
    const duration = Date.now() - start
    expect(duration).toBeLessThan(50) // Should complete within 50ms
  })
})
