import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { rateLimitService } from '@/lib/security/rate-limiting'
import { securityService } from '@/lib/security/security-service'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // Add security headers
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-XSS-Protection', '1; mode=block')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  // Skip auth check for API routes and static files
  if (req.nextUrl.pathname.startsWith('/api/') ||
      req.nextUrl.pathname.startsWith('/_next/') ||
      req.nextUrl.pathname.includes('.')) {

    // Apply rate limiting to API routes
    if (req.nextUrl.pathname.startsWith('/api/')) {
      const rateLimitResult = await rateLimitService.checkRateLimit(req, 100, 60000) // 100 requests per minute

      if (!rateLimitResult.allowed) {
        await securityService.logSecurityEvent({
          event_type: 'suspicious_activity',
          ip_address: getClientIP(req),
          user_agent: req.headers.get('user-agent') || undefined,
          details: {
            reason: 'rate_limit_exceeded',
            endpoint: req.nextUrl.pathname
          },
          severity: 2
        })

        return NextResponse.json(
          { error: 'Rate limit exceeded' },
          {
            status: 429,
            headers: {
              'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
              'X-RateLimit-Limit': '100',
              'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
              'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
            }
          }
        )
      }

      // Add rate limit headers to successful responses
      res.headers.set('X-RateLimit-Limit', '100')
      res.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
      res.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString())
    }

    return res
  }

  try {
    const supabase = createMiddlewareClient({ req, res })

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // If user is not signed in and the current path is not /auth/login, redirect to login
    if (!user && !req.nextUrl.pathname.startsWith('/auth')) {
      return NextResponse.redirect(new URL('/auth/login', req.url))
    }

    // If user is signed in and trying to access login page, redirect to dashboard
    if (user && req.nextUrl.pathname.startsWith('/auth/login')) {
      return NextResponse.redirect(new URL('/', req.url))
    }

    // Log successful page access
    if (user) {
      // Don't await this to avoid slowing down the request
      securityService.logSecurityEvent({
        event_type: 'login_success',
        user_id: user.id,
        ip_address: getClientIP(req),
        user_agent: req.headers.get('user-agent') || undefined,
        details: {
          page_access: req.nextUrl.pathname
        },
        severity: 1
      }).catch(error => console.error('Error logging page access:', error))
    }

    return res
  } catch (error) {
    console.error('Middleware error:', error)

    // Log security error
    securityService.logSecurityEvent({
      event_type: 'suspicious_activity',
      ip_address: getClientIP(req),
      user_agent: req.headers.get('user-agent') || undefined,
      details: {
        reason: 'middleware_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        path: req.nextUrl.pathname
      },
      severity: 3
    }).catch(logError => console.error('Error logging security event:', logError))

    // On error, allow the request to continue
    return res
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

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - file extensions
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
