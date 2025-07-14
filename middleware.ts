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

    // If user is not signed in and the current path is not /auth/login, redirect to login
    if (!user && !req.nextUrl.pathname.startsWith('/auth')) {
      return NextResponse.redirect(new URL('/auth/login', req.url))
    }

    // If user is signed in and trying to access login page, redirect to dashboard
    if (user && req.nextUrl.pathname.startsWith('/auth/login')) {
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
