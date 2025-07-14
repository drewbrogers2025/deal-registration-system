'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/components/providers/auth-provider'
import { useRolePermissions } from '@/hooks/use-role-permissions'
import { useMobileDetection } from '@/hooks/use-mobile-detection'
import {
  LayoutDashboard,
  FileText,
  Users,
  Building2,
  Package,
  AlertTriangle,
  Settings,
  LogOut,
  BarChart3,
  UserCheck,
  Shield,
  Menu,
  X,
} from 'lucide-react'
import { useState } from 'react'

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string | number
  permission?: keyof import('@/hooks/use-role-permissions').UserPermissions
  roles?: Array<'admin' | 'manager' | 'staff'>
}

const navigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    name: 'Deal Registration',
    href: '/deals/new',
    icon: FileText,
  },
  {
    name: 'All Deals',
    href: '/deals',
    icon: FileText,
    permission: 'canViewAllDeals',
  },
  {
    name: 'Conflicts',
    href: '/conflicts',
    icon: AlertTriangle,
    permission: 'canResolveConflicts',
    badge: 3, // This would come from real data
  },
  {
    name: 'Resellers',
    href: '/resellers',
    icon: Users,
    permission: 'canManageResellers',
  },
  {
    name: 'End Users',
    href: '/end-users',
    icon: Building2,
  },
  {
    name: 'Products',
    href: '/products',
    icon: Package,
    permission: 'canManageProducts',
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: BarChart3,
    permission: 'canViewReports',
  },
  {
    name: 'User Management',
    href: '/users',
    icon: UserCheck,
    permission: 'canManageUsers',
    roles: ['admin'],
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    permission: 'canManageSettings',
  },
]

interface RoleBasedNavigationProps {
  className?: string
}

export function RoleBasedNavigation({ className }: RoleBasedNavigationProps) {
  const pathname = usePathname()
  const { signOut } = useAuth()
  const { userProfile, hasPermission, loading } = useRolePermissions()
  const { isMobile } = useMobileDetection()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  if (loading) {
    return (
      <div className="flex h-full w-64 flex-col bg-gray-900">
        <div className="flex h-16 items-center px-6">
          <div className="h-6 w-32 bg-gray-700 rounded animate-pulse" />
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-3 px-3 py-2">
              <div className="h-5 w-5 bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-20 bg-gray-700 rounded animate-pulse" />
            </div>
          ))}
        </nav>
      </div>
    )
  }

  const filteredNavigation = navigationItems.filter(item => {
    // Check role-based access
    if (item.roles && userProfile) {
      if (!item.roles.includes(userProfile.role)) {
        return false
      }
    }

    // Check permission-based access
    if (item.permission) {
      return hasPermission(item.permission)
    }

    return true
  })

  const NavigationContent = () => (
    <>
      <div className="flex h-16 items-center px-6">
        <h1 className="text-xl font-bold text-white">Deal Registration</h1>
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto text-white hover:bg-gray-800"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>
      
      <nav className="flex-1 space-y-1 px-3 py-4">
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href))
          
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => isMobile && setIsMobileMenuOpen(false)}
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
              <span className="flex-1">{item.name}</span>
              {item.badge && (
                <Badge 
                  variant="destructive" 
                  className="ml-2 h-5 w-5 rounded-full p-0 text-xs"
                >
                  {item.badge}
                </Badge>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User Info and Sign Out */}
      <div className="border-t border-gray-700 p-4">
        {userProfile && (
          <div className="mb-3 px-3">
            <p className="text-sm font-medium text-white">{userProfile.name}</p>
            <p className="text-xs text-gray-400">{userProfile.email}</p>
            <div className="mt-1">
              <Badge 
                variant={
                  userProfile.role === 'admin' ? 'destructive' :
                  userProfile.role === 'manager' ? 'warning' : 'secondary'
                }
                className="text-xs"
              >
                <Shield className="mr-1 h-3 w-3" />
                {userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1)}
              </Badge>
            </div>
          </div>
        )}
        
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-300 hover:bg-gray-700 hover:text-white"
          onClick={signOut}
        >
          <LogOut className="mr-3 h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </>
  )

  if (isMobile) {
    return (
      <>
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 bg-gray-900 text-white hover:bg-gray-800 md:hidden"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden">
            <div className="fixed inset-y-0 left-0 w-64 bg-gray-900">
              <NavigationContent />
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <div className={cn("flex h-full w-64 flex-col bg-gray-900", className)}>
      <NavigationContent />
    </div>
  )
}
