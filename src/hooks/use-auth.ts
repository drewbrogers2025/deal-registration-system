import { useAuth as useAuthProvider } from '@/components/providers/auth-provider'
import { 
  hasRole, 
  hasUserType, 
  isApproved, 
  canAccessAdmin,
  canManageDeals,
  canViewAllDeals,
  canManageResellers,
  canManageUsers,
  canAccessSettings,
  getUserTerritories,
  canAccessRoute,
  getRedirectPath,
  ACCESS_DENIED_MESSAGES
} from '@/lib/auth-utils'
import type { UserType } from '@/lib/types'

/**
 * Enhanced auth hook with role-based access control
 */
export function useAuth() {
  const authContext = useAuthProvider()
  
  return {
    ...authContext,
    
    // Permission checks
    hasRole: (roles: string | string[]) => hasRole(authContext.authUser, roles),
    hasUserType: (types: UserType['_type'] | UserType['_type'][]) => hasUserType(authContext.authUser, types),
    isApproved: () => isApproved(authContext.authUser),
    
    // Feature access checks
    canAccessAdmin: () => canAccessAdmin(authContext.authUser),
    canManageDeals: () => canManageDeals(authContext.authUser),
    canViewAllDeals: () => canViewAllDeals(authContext.authUser),
    canManageResellers: () => canManageResellers(authContext.authUser),
    canManageUsers: () => canManageUsers(authContext.authUser),
    canAccessSettings: () => canAccessSettings(authContext.authUser),
    
    // Territory access
    getUserTerritories: () => getUserTerritories(authContext.authUser),
    
    // Route access
    canAccessRoute: (pathname: string) => canAccessRoute(authContext.authUser, pathname),
    getRedirectPath: (pathname: string) => getRedirectPath(authContext.authUser, pathname),
    
    // User info helpers
    isReseller: () => hasUserType(authContext.authUser, 'reseller'),
    isStaff: () => hasUserType(authContext.authUser, ['site_admin', 'vendor_user']),
    isAdmin: () => hasUserType(authContext.authUser, 'site_admin'),
    
    // Access denied messages
    getAccessDeniedMessage: (scenario: keyof typeof ACCESS_DENIED_MESSAGES) => ACCESS_DENIED_MESSAGES[scenario],
  }
}

/**
 * Hook for checking if user has required permissions
 * Throws error or redirects if permissions are insufficient
 */
export function useRequireAuth(options?: {
  userTypes?: UserType['_type'] | UserType['_type'][]
  roles?: string | string[]
  requireApproval?: boolean
  redirectTo?: string
  throwError?: boolean
}) {
  const auth = useAuth()
  
  const {
    userTypes,
    roles,
    requireApproval = true,
    redirectTo,
    throwError = false
  } = options || {}
  
  // Check if user is authenticated
  if (!auth.user) {
    if (throwError) {
      throw new Error(ACCESS_DENIED_MESSAGES.NOT_AUTHENTICATED)
    }
    return {
      hasAccess: false,
      message: ACCESS_DENIED_MESSAGES.NOT_AUTHENTICATED,
      redirectTo: '/auth/login'
    }
  }
  
  // Check if user is approved
  if (requireApproval && !auth.isApproved()) {
    if (throwError) {
      throw new Error(ACCESS_DENIED_MESSAGES.NOT_APPROVED)
    }
    return {
      hasAccess: false,
      message: ACCESS_DENIED_MESSAGES.NOT_APPROVED,
      redirectTo: '/auth/pending-approval'
    }
  }
  
  // Check user types
  if (userTypes && !auth.hasUserType(userTypes)) {
    if (throwError) {
      throw new Error(ACCESS_DENIED_MESSAGES.INSUFFICIENT_PERMISSIONS)
    }
    return {
      hasAccess: false,
      message: ACCESS_DENIED_MESSAGES.INSUFFICIENT_PERMISSIONS,
      redirectTo: redirectTo || '/'
    }
  }
  
  // Check roles
  if (roles && !auth.hasRole(roles)) {
    if (throwError) {
      throw new Error(ACCESS_DENIED_MESSAGES.INSUFFICIENT_PERMISSIONS)
    }
    return {
      hasAccess: false,
      message: ACCESS_DENIED_MESSAGES.INSUFFICIENT_PERMISSIONS,
      redirectTo: redirectTo || '/'
    }
  }
  
  return {
    hasAccess: true,
    message: null,
    redirectTo: null
  }
}

/**
 * Hook for admin-only features
 */
export function useRequireAdmin() {
  return useRequireAuth({
    userTypes: 'site_admin',
    requireApproval: true,
    throwError: true
  })
}

/**
 * Hook for staff-only features
 */
export function useRequireStaff() {
  return useRequireAuth({
    userTypes: ['site_admin', 'vendor_user'],
    requireApproval: true,
    throwError: true
  })
}

/**
 * Hook for reseller-only features
 */
export function useRequireReseller() {
  return useRequireAuth({
    userTypes: 'reseller',
    requireApproval: true,
    throwError: true
  })
}

/**
 * Hook for manager/admin role features
 */
export function useRequireManagerRole() {
  return useRequireAuth({
    userTypes: ['site_admin', 'vendor_user'],
    roles: ['admin', 'manager'],
    requireApproval: true,
    throwError: true
  })
}

/**
 * Hook to get user's accessible reseller IDs
 */
export function useAccessibleResellers() {
  const auth = useAuth()
  
  if (!auth.authUser || !auth.isApproved()) {
    return []
  }
  
  // Site admins and vendor users can access all resellers
  if (auth.hasUserType(['site_admin', 'vendor_user'])) {
    return ['*'] // Indicates access to all
  }
  
  // Resellers can only access their own reseller
  if (auth.hasUserType('reseller') && auth.authUser.reseller_user) {
    return [auth.authUser.reseller_user.reseller_id]
  }
  
  return []
}

/**
 * Hook to check if user can access specific reseller data
 */
export function useCanAccessReseller(resellerId: string) {
  const accessibleResellers = useAccessibleResellers()
  
  return accessibleResellers.includes('*') || accessibleResellers.includes(resellerId)
}

/**
 * Hook to get filtered navigation items based on user permissions
 */
export function useNavigationItems() {
  const auth = useAuth()
  
  const items = [
    {
      name: 'Dashboard',
      href: '/',
      icon: 'LayoutDashboard',
      show: !!auth.authUser && auth.isApproved(),
    },
    {
      name: 'Deal Registration',
      href: '/deals/new',
      icon: 'FileText',
      show: auth.canManageDeals(),
    },
    {
      name: 'All Deals',
      href: '/deals',
      icon: 'FileText',
      show: !!auth.authUser && auth.isApproved(),
    },
    {
      name: 'Conflicts',
      href: '/conflicts',
      icon: 'AlertTriangle',
      show: auth.canViewAllDeals(),
    },
    {
      name: 'Resellers',
      href: '/resellers',
      icon: 'Users',
      show: auth.canManageResellers(),
    },
    {
      name: 'End Users',
      href: '/end-users',
      icon: 'Building2',
      show: auth.canManageResellers(),
    },
    {
      name: 'Products',
      href: '/products',
      icon: 'Package',
      show: !!auth.authUser && auth.isApproved(),
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: 'Settings',
      show: auth.canAccessSettings(),
    },
    {
      name: 'User Management',
      href: '/admin/users',
      icon: 'Shield',
      show: auth.canManageUsers(),
    },
  ]

  return items.filter(item => item.show)
}

/**
 * Hook for conditional rendering based on permissions
 */
export function usePermissionGate() {
  const auth = useAuth()
  
  return {
    // Render component only if user has permission
    renderIf: (condition: boolean, component: React.ReactNode) => {
      return condition ? component : null
    },
    
    // Render component only for specific user types
    renderForUserTypes: (types: UserType['_type'] | UserType['_type'][], component: React.ReactNode) => {
      return auth.hasUserType(types) && auth.isApproved() ? component : null
    },
    
    // Render component only for specific roles
    renderForRoles: (roles: string | string[], component: React.ReactNode) => {
      return auth.hasRole(roles) && auth.isApproved() ? component : null
    },
    
    // Render different components based on user type
    renderByUserType: (components: {
      site_admin?: React.ReactNode
      vendor_user?: React.ReactNode
      reseller?: React.ReactNode
      default?: React.ReactNode
    }) => {
      if (!auth.authUser || !auth.isApproved()) {
        return components.default || null
      }
      
      return components[auth.authUser.user_type] || components.default || null
    }
  }
}
