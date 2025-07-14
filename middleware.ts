import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // Skip auth check for API routes and static files
  if (req.nextUrl.pathname.startsWith('/api/') ||
      req.nextUrl.pathname.startsWith('/_next/') ||
      req.nextUrl.pathname.includes('.')) {
    return res
  }

  try {
    const supabase = createMiddlewareClient({ req, res })

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const pathname = req.nextUrl.pathname

    // Public auth routes
    const isAuthRoute = pathname.startsWith('/auth/')
    const isLoginRoute = pathname === '/auth/login'
    const isRegisterRoute = pathname === '/auth/register'
    const isVerifyRoute = pathname === '/auth/verify'
    const isPendingRoute = pathname === '/auth/pending-approval'

    // If user is not signed in
    if (!user) {
      // Allow access to auth routes
      if (isAuthRoute) {
        return res
      }
      // Redirect to login for protected routes
      return NextResponse.redirect(new URL('/auth/login', req.url))
    }

    // User is signed in - get their profile
    let userProfile = null
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('user_type, approval_status')
        .eq('id', user.id)
        .single()

      userProfile = userData
    } catch (error) {
      console.warn('Failed to fetch user profile in middleware:', error)
    }

    // If user is signed in but trying to access login/register, redirect appropriately
    if (isLoginRoute || isRegisterRoute) {
      if (userProfile?.approval_status === 'pending') {
        return NextResponse.redirect(new URL('/auth/pending-approval', req.url))
      } else if (userProfile?.approval_status === 'approved') {
        return NextResponse.redirect(new URL('/', req.url))
      } else {
        // User exists but no profile or rejected - allow access to auth routes
        return res
      }
    }

    // Allow access to verify route
    if (isVerifyRoute) {
      return res
    }

    // Check approval status for non-auth routes
    if (!isAuthRoute) {
      if (!userProfile) {
        // User exists but no profile - redirect to complete registration
        return NextResponse.redirect(new URL('/auth/register', req.url))
      }

      if (userProfile.approval_status === 'pending') {
        if (!isPendingRoute) {
          return NextResponse.redirect(new URL('/auth/pending-approval', req.url))
        }
        return res
      }

      if (userProfile.approval_status === 'rejected') {
        return NextResponse.redirect(new URL('/auth/login?error=account_rejected', req.url))
      }

      if (userProfile.approval_status !== 'approved') {
        return NextResponse.redirect(new URL('/auth/login?error=account_not_approved', req.url))
      }
    }

    // If user is on pending approval page but is approved, redirect to dashboard
    if (isPendingRoute && userProfile?.approval_status === 'approved') {
      return NextResponse.redirect(new URL('/', req.url))
    }

    return res
  } catch (error) {
    console.error('Middleware error:', error)
    // On error, allow the request to continue
    return res
  }
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
