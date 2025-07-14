import { createServerComponentClient } from '@/lib/supabase'
import type { UserType, AuthUser } from '@/lib/types'

/**
 * Server-side function to get user profile with role information
 */
export async function getServerAuthUser(): Promise<AuthUser | null> {
  try {
    // const supabase = createServerComponentClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return null
    }

    // Get base user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return null
    }

    // Get staff user data if applicable
    let staffUser = null
    if (userData.user_type === 'site_admin' || userData.user_type === 'vendor_user') {
      const { data: staffData } = await supabase
        .from('staff_users')
        .select('*')
        .eq('id', user.id)
        .single()
      staffUser = staffData
    }

    // Get reseller user data if applicable
    let resellerUser = null
    if (userData.user_type === 'reseller') {
      const { data: resellerData } = await supabase
        .from('reseller_users')
        .select('*')
        .eq('id', user.id)
        .single()
      resellerUser = resellerData
    }

    return {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      user_type: userData.user_type,
      approval_status: userData.approval_status,
      phone: userData.phone,
      company_position: userData.company_position,
      staff_user: staffUser,
      reseller_user: resellerUser,
    }
  } catch (error) {
    console.error('Error getting server auth user:', error)
    return null
  }
}

/**
 * Check if user has required role(s)
 */
export function hasRole(authUser: AuthUser | null, roles: string | string[]): boolean {
  if (!authUser?.staff_user) return false
  const roleArray = Array.isArray(roles) ? roles : [roles]
  return roleArray.includes(authUser.staff_user.role)
}

/**
 * Check if user has required user type(s)
 */
export function hasUserType(authUser: AuthUser | null, types: UserType['_type'] | UserType['_type'][]): boolean {
  if (!authUser) return false
  const typeArray = Array.isArray(types) ? types : [types]
  return typeArray.includes(authUser.user_type)
}

/**
 * Check if user is approved
 */
export function isApproved(authUser: AuthUser | null): boolean {
  return authUser?.approval_status === 'approved'
}

/**
 * Check if user can access admin features
 */
export function canAccessAdmin(authUser: AuthUser | null): boolean {
  return hasUserType(authUser, 'site_admin') && isApproved(authUser)
}

/**
 * Check if user can manage deals
 */
export function canManageDeals(authUser: AuthUser | null): boolean {
  return (
    hasUserType(authUser, ['site_admin', 'vendor_user']) && 
    isApproved(authUser)
  ) || (
    hasUserType(authUser, 'reseller') && 
    isApproved(authUser) && 
    authUser?.reseller_user?.can_create_deals
  )
}

/**
 * Check if user can view all deals
 */
export function canViewAllDeals(authUser: AuthUser | null): boolean {
  return hasUserType(authUser, ['site_admin', 'vendor_user']) && isApproved(authUser)
}

/**
 * Check if user can manage resellers
 */
export function canManageResellers(authUser: AuthUser | null): boolean {
  return hasUserType(authUser, ['site_admin', 'vendor_user']) && isApproved(authUser)
}

/**
 * Check if user can manage users
 */
export function canManageUsers(authUser: AuthUser | null): boolean {
  return hasUserType(authUser, 'site_admin') && isApproved(authUser)
}

/**
 * Check if user can access settings
 */
export function canAccessSettings(authUser: AuthUser | null): boolean {
  return (
    hasUserType(authUser, ['site_admin', 'vendor_user']) && 
    isApproved(authUser) &&
    hasRole(authUser, ['admin', 'manager'])
  )
}

/**
 * Get user's accessible territories
 */
export function getUserTerritories(authUser: AuthUser | null): string[] {
  if (!authUser || !isApproved(authUser)) return []
  
  if (hasUserType(authUser, ['site_admin', 'vendor_user'])) {
    return ['*'] // Access to all territories
  }
  
  if (hasUserType(authUser, 'reseller') && authUser.reseller_user) {
    return authUser.reseller_user.territory_access || []
  }
  
  return []
}

/**
 * Route protection configuration
 */
export const ROUTE_PERMISSIONS = {
  '/': { requireAuth: true, requireApproval: true },
  '/deals': { requireAuth: true, requireApproval: true },
  '/deals/new': { requireAuth: true, requireApproval: true, customCheck: canManageDeals },
  '/resellers': { requireAuth: true, requireApproval: true, customCheck: canManageResellers },
  '/end-users': { requireAuth: true, requireApproval: true, customCheck: canManageResellers },
  '/products': { requireAuth: true, requireApproval: true },
  '/conflicts': { requireAuth: true, requireApproval: true, customCheck: canViewAllDeals },
  '/settings': { requireAuth: true, requireApproval: true, customCheck: canAccessSettings },
  '/admin': { requireAuth: true, requireApproval: true, customCheck: canAccessAdmin },
} as const

/**
 * Check if user can access a specific route
 */
export function canAccessRoute(authUser: AuthUser | null): boolean {
  // Public routes
  if (pathname.startsWith('/auth/')) {
    return true
  }

  // Find matching route permission
  const routeConfig = ROUTE_PERMISSIONS[pathname as keyof typeof ROUTE_PERMISSIONS]
  
  if (!routeConfig) {
    // Default to requiring auth for unknown routes
    return !!authUser
  }

  // Check basic auth requirement
  if (routeConfig.requireAuth && !authUser) {
    return false
  }

  // Check approval requirement
  if (routeConfig.requireApproval && !isApproved(authUser)) {
    return false
  }

  // Check custom permission
  if (routeConfig.customCheck && !routeConfig.customCheck(authUser)) {
    return false
  }

  return true
}

/**
 * Get redirect path for unauthorized users
 */
export function getRedirectPath(authUser: AuthUser | null): string {
  if (!authUser) {
    return '/auth/login'
  }

  if (!isApproved(authUser)) {
    return '/auth/pending-approval'
  }

  // If user doesn't have permission for the specific route, redirect to dashboard
  return '/'
}

/**
 * Navigation items with permission checks
 */
export function getNavigationItems(authUser: AuthUser | null) {
  const items = [
    {
      name: 'Dashboard',
      href: '/',
      icon: 'LayoutDashboard',
      show: !!authUser && isApproved(authUser),
    },
    {
      name: 'Deal Registration',
      href: '/deals/new',
      icon: 'FileText',
      show: canManageDeals(authUser),
    },
    {
      name: 'All Deals',
      href: '/deals',
      icon: 'FileText',
      show: !!authUser && isApproved(authUser),
    },
    {
      name: 'Conflicts',
      href: '/conflicts',
      icon: 'AlertTriangle',
      show: canViewAllDeals(authUser),
    },
    {
      name: 'Resellers',
      href: '/resellers',
      icon: 'Users',
      show: canManageResellers(authUser),
    },
    {
      name: 'End Users',
      href: '/end-users',
      icon: 'Building2',
      show: canManageResellers(authUser),
    },
    {
      name: 'Products',
      href: '/products',
      icon: 'Package',
      show: !!authUser && isApproved(authUser),
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: 'Settings',
      show: canAccessSettings(authUser),
    },
    {
      name: 'User Management',
      href: '/admin/users',
      icon: 'Shield',
      show: canManageUsers(authUser),
    },
  ]

  return items.filter(item => item.show)
}

/**
 * Error messages for different access scenarios
 */
export const ACCESS_DENIED_MESSAGES = {
  NOT_AUTHENTICATED: 'Please sign in to access this page.',
  NOT_APPROVED: 'Your account is pending approval. Please wait for an administrator to approve your account.',
  INSUFFICIENT_PERMISSIONS: 'You do not have permission to access this page.',
  RESELLER_ONLY: 'This feature is only available to reseller partners.',
  STAFF_ONLY: 'This feature is only available to staff members.',
  ADMIN_ONLY: 'This feature is only available to administrators.',
} as const
