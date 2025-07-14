import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  retryAfter?: number
}

export interface RateLimitConfig {
  requests: number
  windowMs: number
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  keyGenerator?: (req: NextRequest) => string
}

export class RateLimitService {
  private supabase = createAdminClient()
  private memoryStore = new Map<string, { count: number; resetTime: number }>()

  /**
   * Check rate limit for a request
   */
  async checkRateLimit(
    req: NextRequest,
    maxRequests: number = 100,
    windowMs: number = 60000, // 1 minute
    identifier?: string
  ): Promise<RateLimitResult> {
    const key = identifier || this.generateKey(req)
    const now = Date.now()
    const _windowStart = now - windowMs

    try {
      // Use database for persistent rate limiting
      const result = await this.supabase.rpc('check_rate_limit', {
        p_identifier: key,
        p_endpoint: req.nextUrl.pathname,
        p_limit: maxRequests,
        p_window_minutes: Math.ceil(windowMs / 60000)
      })

      if (result.error) {
        console.error('Rate limit check error:', result.error)
        // Fallback to memory store
        return this.checkMemoryRateLimit(key, maxRequests, windowMs, now)
      }

      const allowed = result.data as boolean
      
      if (!allowed) {
        // Get current count and reset time
        const { data: rateLimitData } = await this.supabase
          .from('rate_limits')
          .select('requests_count, window_start')
          .eq('identifier', key)
          .eq('endpoint', req.nextUrl.pathname)
          .single()

        const resetTime = rateLimitData 
          ? new Date(rateLimitData.window_start).getTime() + windowMs
          : now + windowMs

        return {
          allowed: false,
          remaining: 0,
          resetTime,
          retryAfter: Math.ceil((resetTime - now) / 1000)
        }
      }

      // Get remaining requests
      const { data: rateLimitData } = await this.supabase
        .from('rate_limits')
        .select('requests_count, window_start')
        .eq('identifier', key)
        .eq('endpoint', req.nextUrl.pathname)
        .single()

      const remaining = Math.max(0, maxRequests - (rateLimitData?.requests_count || 0))
      const resetTime = rateLimitData 
        ? new Date(rateLimitData.window_start).getTime() + windowMs
        : now + windowMs

      return {
        allowed: true,
        remaining,
        resetTime
      }

    } catch (error) {
      console.error('Rate limiting error:', error)
      // Fallback to memory store
      return this.checkMemoryRateLimit(key, maxRequests, windowMs, now)
    }
  }

  /**
   * Memory-based rate limiting fallback
   */
  private checkMemoryRateLimit(
    key: string,
    maxRequests: number,
    windowMs: number,
    now: number
  ): RateLimitResult {
    const record = this.memoryStore.get(key)
    
    if (!record || now > record.resetTime) {
      // New window
      const resetTime = now + windowMs
      this.memoryStore.set(key, { count: 1, resetTime })
      
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime
      }
    }

    if (record.count >= maxRequests) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime,
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      }
    }

    // Increment count
    record.count++
    this.memoryStore.set(key, record)

    return {
      allowed: true,
      remaining: maxRequests - record.count,
      resetTime: record.resetTime
    }
  }

  /**
   * Generate rate limit key from request
   */
  private generateKey(req: NextRequest): string {
    // Try to get user ID from auth
    const authHeader = req.headers.get('authorization')
    if (authHeader) {
      // Extract user ID from JWT or session
      // This is a simplified implementation
      return `user:${authHeader.slice(0, 10)}`
    }

    // Fallback to IP address
    const forwarded = req.headers.get('x-forwarded-for')
    const realIP = req.headers.get('x-real-ip')
    
    if (forwarded) {
      return `ip:${forwarded.split(',')[0].trim()}`
    }
    
    if (realIP) {
      return `ip:${realIP}`
    }
    
    return `ip:${req.ip || 'unknown'}`
  }

  /**
   * Rate limit by user ID
   */
  async checkUserRateLimit(
    userId: string,
    endpoint: string,
    maxRequests: number = 100,
    windowMs: number = 60000
  ): Promise<RateLimitResult> {
    const key = `user:${userId}`
    const now = Date.now()

    try {
      const result = await this.supabase.rpc('check_rate_limit', {
        p_identifier: key,
        p_endpoint: endpoint,
        p_limit: maxRequests,
        p_window_minutes: Math.ceil(windowMs / 60000)
      })

      if (result.error) {
        console.error('User rate limit check error:', result.error)
        return this.checkMemoryRateLimit(key, maxRequests, windowMs, now)
      }

      const allowed = result.data as boolean
      
      if (!allowed) {
        const { data: rateLimitData } = await this.supabase
          .from('rate_limits')
          .select('requests_count, window_start')
          .eq('identifier', key)
          .eq('endpoint', endpoint)
          .single()

        const resetTime = rateLimitData 
          ? new Date(rateLimitData.window_start).getTime() + windowMs
          : now + windowMs

        return {
          allowed: false,
          remaining: 0,
          resetTime,
          retryAfter: Math.ceil((resetTime - now) / 1000)
        }
      }

      const { data: rateLimitData } = await this.supabase
        .from('rate_limits')
        .select('requests_count, window_start')
        .eq('identifier', key)
        .eq('endpoint', endpoint)
        .single()

      const remaining = Math.max(0, maxRequests - (rateLimitData?.requests_count || 0))
      const resetTime = rateLimitData 
        ? new Date(rateLimitData.window_start).getTime() + windowMs
        : now + windowMs

      return {
        allowed: true,
        remaining,
        resetTime
      }

    } catch (error) {
      console.error('User rate limiting error:', error)
      return this.checkMemoryRateLimit(key, maxRequests, windowMs, now)
    }
  }

  /**
   * Rate limit by API key
   */
  async checkApiKeyRateLimit(
    apiKey: string,
    endpoint: string,
    maxRequests?: number,
    windowMs: number = 60000
  ): Promise<RateLimitResult> {
    try {
      // Get API key configuration
      const { data: apiKeyData } = await this.supabase
        .from('api_keys')
        .select('rate_limit, is_active')
        .eq('key_prefix', apiKey.slice(0, 8))
        .single()

      if (!apiKeyData || !apiKeyData.is_active) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: Date.now() + windowMs
        }
      }

      const limit = maxRequests || apiKeyData.rate_limit || 1000
      const key = `api:${apiKey.slice(0, 8)}`

      return this.checkUserRateLimit(key, endpoint, limit, windowMs)

    } catch (error) {
      console.error('API key rate limiting error:', error)
      return {
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + windowMs
      }
    }
  }

  /**
   * Get rate limit status for a key
   */
  async getRateLimitStatus(
    identifier: string,
    endpoint: string
  ): Promise<{
    requestsCount: number
    _windowStart: string
    blockedUntil?: string
  } | null> {
    try {
      const { data, error } = await this.supabase
        .from('rate_limits')
        .select('requests_count, window_start, blocked_until')
        .eq('identifier', identifier)
        .eq('endpoint', endpoint)
        .single()

      if (error || !data) {
        return null
      }

      return {
        requestsCount: data.requests_count,
        _windowStart: data.window_start,
        blockedUntil: data.blocked_until
      }

    } catch (error) {
      console.error('Error getting rate limit status:', error)
      return null
    }
  }

  /**
   * Block an identifier temporarily
   */
  async blockIdentifier(
    identifier: string,
    endpoint: string,
    durationMs: number,
    reason?: string
  ): Promise<boolean> {
    try {
      const blockedUntil = new Date(Date.now() + durationMs).toISOString()

      const { error } = await this.supabase
        .from('rate_limits')
        .upsert({
          identifier,
          endpoint,
          blocked_until: blockedUntil,
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error blocking identifier:', error)
        return false
      }

      // Log security event
      await this.supabase
        .from('security_events')
        .insert({
          event_type: 'suspicious_activity',
          ip_address: identifier.startsWith('ip:') ? identifier.slice(3) : null,
          details: {
            reason: reason || 'rate_limit_block',
            endpoint,
            blocked_until: blockedUntil,
            duration_ms: durationMs
          },
          severity: 2
        })

      return true

    } catch (error) {
      console.error('Error blocking identifier:', error)
      return false
    }
  }

  /**
   * Unblock an identifier
   */
  async unblockIdentifier(identifier: string, endpoint: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('rate_limits')
        .update({
          blocked_until: null,
          updated_at: new Date().toISOString()
        })
        .eq('identifier', identifier)
        .eq('endpoint', endpoint)

      if (error) {
        console.error('Error unblocking identifier:', error)
        return false
      }

      return true

    } catch (error) {
      console.error('Error unblocking identifier:', error)
      return false
    }
  }

  /**
   * Clean up expired rate limit records
   */
  async cleanupExpiredRecords(): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('rate_limits')
        .delete()
        .lt('window_start', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // 24 hours old
        .select('id')

      if (error) {
        console.error('Error cleaning up rate limit records:', error)
        return 0
      }

      // Clean up memory store
      const now = Date.now()
      for (const [key, record] of this.memoryStore.entries()) {
        if (now > record.resetTime) {
          this.memoryStore.delete(key)
        }
      }

      return data?.length || 0

    } catch (error) {
      console.error('Error cleaning up rate limit records:', error)
      return 0
    }
  }
}

// Singleton instance
export const rateLimitService = new RateLimitService()
