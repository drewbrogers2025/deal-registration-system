import { createAdminClient } from '@/lib/supabase'
import { auditService } from './audit'
import type { SecurityEvent, SecurityMetrics, GDPRRequest } from '@/lib/rbac/types'

export interface SecurityEventInput {
  event_type: string
  user_id?: string
  ip_address?: string
  user_agent?: string
  details?: Record<string, unknown>
  severity?: number
}

export interface PasswordPolicy {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
  maxAge: number // days
}

export interface SessionPolicy {
  maxDuration: number // minutes
  idleTimeout: number // minutes
  maxConcurrentSessions: number
}

export class SecurityService {
  private supabase = createAdminClient()

  /**
   * Log a security event
   */
  async logSecurityEvent(input: SecurityEventInput): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from('security_events')
        .insert({
          event_type: input.event_type,
          user_id: input.user_id,
          ip_address: input.ip_address,
          user_agent: input.user_agent,
          details: input.details || {},
          severity: input.severity || 1
        })
        .select('id')
        .single()

      if (error) {
        console.error('Error logging security event:', error)
        return null
      }

      // Auto-escalate critical events
      if (input.severity && input.severity >= 3) {
        await this.escalateCriticalEvent(data.id, input)
      }

      return data.id
    } catch (error) {
      console.error('Security event logging error:', error)
      return null
    }
  }

  /**
   * Validate password against policy
   */
  validatePassword(password: string, policy?: PasswordPolicy): {
    valid: boolean
    errors: string[]
  } {
    const defaultPolicy: PasswordPolicy = {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      maxAge: 90
    }

    const activePolicy = policy || defaultPolicy
    const errors: string[] = []

    if (password.length < activePolicy.minLength) {
      errors.push(`Password must be at least ${activePolicy.minLength} characters long`)
    }

    if (activePolicy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }

    if (activePolicy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }

    if (activePolicy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number')
    }

    if (activePolicy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character')
    }

    // Check for common weak passwords
    const commonPasswords = [
      'password', '123456', 'password123', 'admin', 'qwerty',
      'letmein', 'welcome', 'monkey', '1234567890'
    ]

    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common and easily guessable')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Check if account should be locked due to failed login attempts
   */
  async checkAccountLockout(userId: string): Promise<{
    shouldLock: boolean
    lockUntil?: Date
    attemptsRemaining?: number
  }> {
    try {
      const { data: user, error } = await this.supabase
        .from('staff_users')
        .select('failed_login_attempts, locked_until')
        .eq('id', userId)
        .single()

      if (error || !user) {
        return { shouldLock: false }
      }

      const maxAttempts = 5
      const lockDurationMs = 30 * 60 * 1000 // 30 minutes

      // Check if already locked
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        return {
          shouldLock: true,
          lockUntil: new Date(user.locked_until)
        }
      }

      // Check if should be locked
      if (user.failed_login_attempts >= maxAttempts) {
        const lockUntil = new Date(Date.now() + lockDurationMs)
        
        await this.supabase
          .from('staff_users')
          .update({ locked_until: lockUntil.toISOString() })
          .eq('id', userId)

        await this.logSecurityEvent({
          event_type: 'account_locked',
          user_id: userId,
          details: {
            reason: 'max_failed_attempts',
            failed_attempts: user.failed_login_attempts,
            lock_duration_ms: lockDurationMs
          },
          severity: 3
        })

        return {
          shouldLock: true,
          lockUntil
        }
      }

      return {
        shouldLock: false,
        attemptsRemaining: maxAttempts - user.failed_login_attempts
      }

    } catch (error) {
      console.error('Error checking account lockout:', error)
      return { shouldLock: false }
    }
  }

  /**
   * Record failed login attempt
   */
  async recordFailedLogin(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      // Increment failed attempts
      await this.supabase
        .from('staff_users')
        .update({
          failed_login_attempts: this.supabase.raw('failed_login_attempts + 1')
        })
        .eq('id', userId)

      // Log security event
      await this.logSecurityEvent({
        event_type: 'login_failure',
        user_id: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        details: {
          reason: 'invalid_credentials'
        },
        severity: 2
      })

      // Check for lockout
      await this.checkAccountLockout(userId)

    } catch (error) {
      console.error('Error recording failed login:', error)
    }
  }

  /**
   * Record successful login
   */
  async recordSuccessfulLogin(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      // Reset failed attempts and update last login
      await this.supabase
        .from('staff_users')
        .update({
          failed_login_attempts: 0,
          locked_until: null,
          last_login_at: new Date().toISOString(),
          last_login_ip: ipAddress
        })
        .eq('id', userId)

      // Log security event
      await this.logSecurityEvent({
        event_type: 'login_success',
        user_id: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        details: {
          login_method: 'password'
        },
        severity: 1
      })

    } catch (error) {
      console.error('Error recording successful login:', error)
    }
  }

  /**
   * Manage user sessions
   */
  async createSession(
    userId: string,
    sessionToken: string,
    ipAddress?: string,
    userAgent?: string,
    maxDuration: number = 24 * 60 * 60 * 1000 // 24 hours
  ): Promise<boolean> {
    try {
      const expiresAt = new Date(Date.now() + maxDuration)

      const { error } = await this.supabase
        .from('user_sessions')
        .insert({
          user_id: userId,
          session_token: sessionToken,
          ip_address: ipAddress,
          user_agent: userAgent,
          expires_at: expiresAt.toISOString()
        })

      if (error) {
        console.error('Error creating session:', error)
        return false
      }

      return true

    } catch (error) {
      console.error('Session creation error:', error)
      return false
    }
  }

  /**
   * Validate session
   */
  async validateSession(sessionToken: string): Promise<{
    valid: boolean
    userId?: string
    expired?: boolean
  }> {
    try {
      const { data: session, error } = await this.supabase
        .from('user_sessions')
        .select('user_id, expires_at, is_active')
        .eq('session_token', sessionToken)
        .single()

      if (error || !session) {
        return { valid: false }
      }

      if (!session.is_active) {
        return { valid: false }
      }

      if (new Date(session.expires_at) < new Date()) {
        // Mark session as inactive
        await this.supabase
          .from('user_sessions')
          .update({ is_active: false })
          .eq('session_token', sessionToken)

        return { valid: false, expired: true }
      }

      // Update last activity
      await this.supabase
        .from('user_sessions')
        .update({ last_activity: new Date().toISOString() })
        .eq('session_token', sessionToken)

      return {
        valid: true,
        userId: session.user_id
      }

    } catch (error) {
      console.error('Session validation error:', error)
      return { valid: false }
    }
  }

  /**
   * Invalidate session
   */
  async invalidateSession(sessionToken: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('session_token', sessionToken)

      return !error

    } catch (error) {
      console.error('Session invalidation error:', error)
      return false
    }
  }

  /**
   * Get security metrics
   */
  async getSecurityMetrics(): Promise<SecurityMetrics> {
    try {
      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      // Active users (with sessions)
      const { count: activeUsers } = await this.supabase
        .from('user_sessions')
        .select('user_id', { count: 'exact', head: true })
        .eq('is_active', true)
        .gt('last_activity', yesterday.toISOString())

      // Failed logins in last 24h
      const { count: failedLogins24h } = await this.supabase
        .from('security_events')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'login_failure')
        .gt('created_at', yesterday.toISOString())

      // Security events in last 24h
      const { count: securityEvents24h } = await this.supabase
        .from('security_events')
        .select('*', { count: 'exact', head: true })
        .gt('created_at', yesterday.toISOString())

      // Critical unresolved events
      const { count: criticalEvents } = await this.supabase
        .from('security_events')
        .select('*', { count: 'exact', head: true })
        .gte('severity', 3)
        .eq('resolved', false)

      // Blocked IPs
      const { count: blockedIPs } = await this.supabase
        .from('rate_limits')
        .select('*', { count: 'exact', head: true })
        .gt('blocked_until', now.toISOString())

      // Locked accounts
      const { count: lockedAccounts } = await this.supabase
        .from('staff_users')
        .select('*', { count: 'exact', head: true })
        .gt('locked_until', now.toISOString())

      // API key usage (placeholder)
      const apiKeyUsage = 0

      // Audit events in last 24h
      const { count: auditEvents24h } = await this.supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .gt('created_at', yesterday.toISOString())

      return {
        activeUsers: activeUsers || 0,
        failedLogins24h: failedLogins24h || 0,
        securityEvents24h: securityEvents24h || 0,
        criticalEvents: criticalEvents || 0,
        blockedIPs: blockedIPs || 0,
        lockedAccounts: lockedAccounts || 0,
        apiKeyUsage,
        auditEvents24h: auditEvents24h || 0
      }

    } catch (error) {
      console.error('Error getting security metrics:', error)
      return {
        activeUsers: 0,
        failedLogins24h: 0,
        securityEvents24h: 0,
        criticalEvents: 0,
        blockedIPs: 0,
        lockedAccounts: 0,
        apiKeyUsage: 0,
        auditEvents24h: 0
      }
    }
  }

  /**
   * Escalate critical security events
   */
  private async escalateCriticalEvent(
    eventId: string,
    event: SecurityEventInput
  ): Promise<void> {
    try {
      // Log escalation
      console.warn('Critical security event detected:', {
        eventId,
        type: event.event_type,
        severity: event.severity,
        details: event.details
      })

      // In a real implementation, you might:
      // - Send notifications to security team
      // - Trigger automated responses
      // - Create incident tickets
      // - Block suspicious IPs automatically

    } catch (error) {
      console.error('Error escalating critical event:', error)
    }
  }

  /**
   * Clean up expired sessions and security data
   */
  async cleanupExpiredData(): Promise<{
    sessionsCleared: number
    eventsArchived: number
  }> {
    try {
      const now = new Date()

      // Clear expired sessions
      const { data: expiredSessions } = await this.supabase
        .from('user_sessions')
        .delete()
        .lt('expires_at', now.toISOString())
        .select('id')

      // Archive old security events (older than 1 year)
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      const { data: oldEvents } = await this.supabase
        .from('security_events')
        .delete()
        .lt('created_at', oneYearAgo.toISOString())
        .eq('resolved', true)
        .select('id')

      return {
        sessionsCleared: expiredSessions?.length || 0,
        eventsArchived: oldEvents?.length || 0
      }

    } catch (error) {
      console.error('Error cleaning up expired data:', error)
      return {
        sessionsCleared: 0,
        eventsArchived: 0
      }
    }
  }
}

// Singleton instance
export const securityService = new SecurityService()
