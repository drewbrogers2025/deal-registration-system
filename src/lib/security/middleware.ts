import { NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { rbacService } from '@/lib/rbac/service'
import { auditService } from './audit'
import { rateLimitService } from './rate-limiting'
import { securityService } from './security-service'
import type { PermissionCheck } from '@/lib/rbac/types'

export interface SecurityMiddlewareConfig {
  requireAuth?: boolean
  permissions?: PermissionCheck[]
  rateLimit?: {
    requests: number
    windowMs: number
  }
  validateInput?: boolean
  logAccess?: boolean
  requireApiKey?: boolean
}

/**
 * Enhanced security middleware for API routes
 */
export function withSecurity(
  handler: (req: NextRequest, context?: unknown) => Promise<NextResponse>,
  config: SecurityMiddlewareConfig = {}
) {
  return async (req: NextRequest, context?: unknown): Promise<NextResponse> => {
    const startTime = Date.now()
    let userId: string | null = null
    let sessionId: string | null = null

    try {
      // 1. Rate limiting check
      if (config.rateLimit) {
        const rateLimitResult = await rateLimitService.checkRateLimit(
          req,
          config.rateLimit.requests,
          config.rateLimit.windowMs
        )

        if (!rateLimitResult.allowed) {
          await securityService.logSecurityEvent({
            event_type: 'suspicious_activity',
            ip_address: getClientIP(req),
            user_agent: req.headers.get('user-agent') || undefined,
            details: {
              reason: 'rate_limit_exceeded',
              endpoint: req.nextUrl.pathname,
              limit: config.rateLimit.requests,
              window: config.rateLimit.windowMs
            },
            severity: 2
          })

          return NextResponse.json(
            { error: 'Rate limit exceeded', retryAfter: rateLimitResult.retryAfter },
            { status: 429 }
          )
        }
      }

      // 2. Authentication check
      if (config.requireAuth || config.permissions) {
        const authResult = await authenticateRequest(req)
        
        if (!authResult.success) {
          await securityService.logSecurityEvent({
            event_type: 'permission_denied',
            ip_address: getClientIP(req),
            user_agent: req.headers.get('user-agent') || undefined,
            details: {
              reason: 'authentication_failed',
              endpoint: req.nextUrl.pathname
            },
            severity: 2
          })

          return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
          )
        }

        userId = authResult.userId
        sessionId = authResult.sessionId
      }

      // 3. API Key validation (if required)
      if (config.requireApiKey) {
        const apiKeyResult = await validateApiKey(req)
        
        if (!apiKeyResult.valid) {
          await securityService.logSecurityEvent({
            event_type: 'permission_denied',
            ip_address: getClientIP(req),
            user_agent: req.headers.get('user-agent') || undefined,
            details: {
              reason: 'invalid_api_key',
              endpoint: req.nextUrl.pathname
            },
            severity: 3
          })

          return NextResponse.json(
            { error: 'Invalid API key' },
            { status: 401 }
          )
        }

        userId = apiKeyResult.userId
      }

      // 4. Permission checks
      if (config.permissions && userId) {
        for (const permission of config.permissions) {
          const permissionResult = await rbacService.hasPermission(userId, permission)
          
          if (!permissionResult.allowed) {
            await securityService.logSecurityEvent({
              event_type: 'permission_denied',
              user_id: userId,
              ip_address: getClientIP(req),
              user_agent: req.headers.get('user-agent') || undefined,
              details: {
                reason: 'insufficient_permissions',
                endpoint: req.nextUrl.pathname,
                required_permission: `${permission.resource}.${permission.action}`,
                permission_reason: permissionResult.reason
              },
              severity: 2
            })

            return NextResponse.json(
              { error: 'Insufficient permissions', required: `${permission.resource}.${permission.action}` },
              { status: 403 }
            )
          }
        }
      }

      // 5. Input validation
      if (config.validateInput && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
        const validationResult = await validateRequestInput(req)
        
        if (!validationResult.valid) {
          await securityService.logSecurityEvent({
            event_type: 'suspicious_activity',
            user_id: userId,
            ip_address: getClientIP(req),
            user_agent: req.headers.get('user-agent') || undefined,
            details: {
              reason: 'invalid_input',
              endpoint: req.nextUrl.pathname,
              validation_errors: validationResult.errors
            },
            severity: 1
          })

          return NextResponse.json(
            { error: 'Invalid input', details: validationResult.errors },
            { status: 400 }
          )
        }
      }

      // 6. Log access if required
      if (config.logAccess && userId) {
        await auditService.logAccess({
          user_id: userId,
          action: 'view',
          resource_type: getResourceTypeFromPath(req.nextUrl.pathname),
          ip_address: getClientIP(req),
          user_agent: req.headers.get('user-agent') || undefined,
          session_id: sessionId,
          metadata: {
            method: req.method,
            endpoint: req.nextUrl.pathname,
            query_params: Object.fromEntries(req.nextUrl.searchParams)
          }
        })
      }

      // 7. Execute the actual handler
      const response = await handler(req, { ...context, userId, sessionId })

      // 8. Log response if needed
      const responseTime = Date.now() - startTime
      if (config.logAccess && userId) {
        await auditService.logAccess({
          user_id: userId,
          action: getActionFromMethod(req.method),
          resource_type: getResourceTypeFromPath(req.nextUrl.pathname),
          ip_address: getClientIP(req),
          user_agent: req.headers.get('user-agent') || undefined,
          session_id: sessionId,
          success: response.status < 400,
          metadata: {
            method: req.method,
            endpoint: req.nextUrl.pathname,
            status_code: response.status,
            response_time_ms: responseTime
          }
        })
      }

      return response

    } catch (error) {
      console.error('Security middleware error:', error)

      // Log security error
      await securityService.logSecurityEvent({
        event_type: 'suspicious_activity',
        user_id: userId,
        ip_address: getClientIP(req),
        user_agent: req.headers.get('user-agent') || undefined,
        details: {
          reason: 'middleware_error',
          endpoint: req.nextUrl.pathname,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        severity: 3
      })

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Authenticate request using Supabase
 */
async function authenticateRequest(req: NextRequest): Promise<{
  success: boolean
  userId?: string
  sessionId?: string
}> {
  try {
    const res = NextResponse.next()
    const supabase = createMiddlewareClient({ req, res })

    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return { success: false }
    }

    return {
      success: true,
      userId: user.id,
      sessionId: req.headers.get('x-session-id') || undefined
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return { success: false }
  }
}

/**
 * Validate API key
 */
async function validateApiKey(req: NextRequest): Promise<{
  valid: boolean
  userId?: string
}> {
  const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '')
  
  if (!apiKey) {
    return { valid: false }
  }

  try {
    // This would validate against your API keys table
    // For now, return a placeholder implementation
    return { valid: false }
  } catch (error) {
    console.error('API key validation error:', error)
    return { valid: false }
  }
}

/**
 * Validate request input for common security issues
 */
async function validateRequestInput(req: NextRequest): Promise<{
  valid: boolean
  errors?: string[]
}> {
  try {
    const body = await req.clone().text()
    const errors: string[] = []

    // Check for SQL injection patterns
    const sqlInjectionPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
      /(--|\/\*|\*\/|;)/,
      /(\b(OR|AND)\b.*=.*)/i
    ]

    for (const pattern of sqlInjectionPatterns) {
      if (pattern.test(body)) {
        errors.push('Potential SQL injection detected')
        break
      }
    }

    // Check for XSS patterns
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/i,
      /on\w+\s*=/i
    ]

    for (const pattern of xssPatterns) {
      if (pattern.test(body)) {
        errors.push('Potential XSS detected')
        break
      }
    }

    // Check for excessive payload size
    if (body.length > 1024 * 1024) { // 1MB limit
      errors.push('Payload too large')
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    }
  } catch (error) {
    console.error('Input validation error:', error)
    return { valid: false, errors: ['Validation failed'] }
  }
}

/**
 * Get client IP address
 */
function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const realIP = req.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  return req.ip || 'unknown'
}

/**
 * Get resource type from URL path
 */
function getResourceTypeFromPath(path: string): string {
  const segments = path.split('/').filter(Boolean)
  if (segments.length >= 2 && segments[0] === 'api') {
    return segments[1]
  }
  return 'unknown'
}

/**
 * Get action from HTTP method
 */
function getActionFromMethod(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET': return 'read'
    case 'POST': return 'create'
    case 'PUT':
    case 'PATCH': return 'update'
    case 'DELETE': return 'delete'
    default: return 'unknown'
  }
}
