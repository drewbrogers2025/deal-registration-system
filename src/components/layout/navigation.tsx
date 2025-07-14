'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'
import {
  LayoutDashboard,
  FileText,
  Users,
  Building2,
  Package,
  AlertTriangle,
  Settings,
  LogOut,
  Shield,
  User
} from 'lucide-react'

// Navigation items will be filtered based on user permissions
const getAllNavigationItems = () => [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    requireAuth: true,
    requireApproval: true,
  },
  {
    name: 'Deal Registration',
    href: '/deals/new',
    icon: FileText,
    requireAuth: true,
    requireApproval: true,
    customCheck: 'canManageDeals',
  },
  {
    name: 'All Deals',
    href: '/deals',
    icon: FileText,
    requireAuth: true,
    requireApproval: true,
  },
  {
    name: 'Conflicts',
    href: '/conflicts',
    icon: AlertTriangle,
    requireAuth: true,
    requireApproval: true,
    customCheck: 'canViewAllDeals',
  },
  {
    name: 'Resellers',
    href: '/resellers',
    icon: Users,
    requireAuth: true,
    requireApproval: true,
    customCheck: 'canManageResellers',
  },
  {
    name: 'End Users',
    href: '/end-users',
    icon: Building2,
    requireAuth: true,
    requireApproval: true,
    customCheck: 'canManageResellers',
  },
  {
    name: 'Products',
    href: '/products',
    icon: Package,
    requireAuth: true,
    requireApproval: true,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    requireAuth: true,
    requireApproval: true,
    customCheck: 'canAccessSettings',
  },
  {
    name: 'User Management',
    href: '/admin/users',
    icon: Shield,
    requireAuth: true,
    requireApproval: true,
    customCheck: 'canManageUsers',
  },
]

export function Navigation() {
  const pathname = usePathname()
  const auth = useAuth()

  // Filter navigation items based on user permissions
  const getVisibleNavigationItems = () => {
    const allItems = getAllNavigationItems()

    if (!auth.authUser) return []

    return allItems.filter(item => {
      // Check basic auth requirement
      if (item.requireAuth && !auth.authUser) return false

      // Check approval requirement
      if (item.requireApproval && !auth.isApproved()) return false

      // Check custom permission
      if (item.customCheck) {
        const checkFunction = auth[item.customCheck as keyof typeof auth] as () => boolean
        if (typeof checkFunction === 'function' && !checkFunction()) return false
      }

      return true
    })
  }

  const visibleItems = getVisibleNavigationItems()

  const getUserTypeIcon = () => {
    if (!auth.authUser) return <User className="h-4 w-4" />

    switch (auth.authUser.user_type) {
      case 'site_admin':
        return <Shield className="h-4 w-4 text-red-400" />
      case 'vendor_user':
        return <Users className="h-4 w-4 text-blue-400" />
      case 'reseller':
        return <Building2 className="h-4 w-4 text-green-400" />
      default:
        return <User className="h-4 w-4" />
    }
  }

  const getUserTypeLabel = () => {
    if (!auth.authUser) return 'User'

    switch (auth.authUser.user_type) {
      case 'site_admin':
        return 'Admin'
      case 'vendor_user':
        return 'Vendor'
      case 'reseller':
        return 'Reseller'
      default:
        return 'User'
    }
  }

  const getStatusBadge = () => {
    if (!auth.authUser) return null

    switch (auth.authUser.approval_status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 text-xs">Active</Badge>
      case 'pending':
        return <Badge variant="secondary" className="text-xs">Pending</Badge>
      case 'rejected':
        return <Badge variant="destructive" className="text-xs">Rejected</Badge>
    }
  }

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900">
      <div className="flex h-16 items-center px-6">
        <h1 className="text-xl font-bold text-white">Deal Registration</h1>
      </div>

      {/* User Info */}
      {auth.authUser && (
        <div className="border-b border-gray-700 p-4">
          <Link href="/profile" className="block hover:bg-gray-800 rounded-md p-2 transition-colors">
            <div className="flex items-center gap-3">
              {getUserTypeIcon()}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">
                  {auth.authUser.name}
                </div>
                <div className="text-xs text-gray-400 truncate">
                  {getUserTypeLabel()}
                </div>
              </div>
              {getStatusBadge()}
            </div>
          </Link>
        </div>
      )}

      <nav className="flex-1 space-y-1 px-3 py-4">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              )}
            >
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0',
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                )}
              />
              {item.name}
            </Link>
          )
        })}

        {visibleItems.length === 0 && auth.authUser && (
          <div className="text-center text-gray-400 text-sm py-8">
            {auth.isApproved() ? 'No accessible features' : 'Account pending approval'}
          </div>
        )}
      </nav>

      <div className="border-t border-gray-700 p-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-300 hover:bg-gray-700 hover:text-white"
          onClick={auth.signOut}
        >
          <LogOut className="mr-3 h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}
