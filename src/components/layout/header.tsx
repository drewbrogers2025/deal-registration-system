'use client'

import { Bell, Search, User, Shield, Users, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/use-auth'
import Link from 'next/link'

interface HeaderProps {
  title: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  const auth = useAuth()

  const getUserTypeIcon = () => {
    if (!auth.authUser) return <User className="h-4 w-4" />

    switch (auth.authUser.user_type) {
      case 'site_admin':
        return <Shield className="h-4 w-4 text-red-600" />
      case 'vendor_user':
        return <Users className="h-4 w-4 text-blue-600" />
      case 'reseller':
        return <Building2 className="h-4 w-4 text-green-600" />
      default:
        return <User className="h-4 w-4" />
    }
  }

  const getUserTypeLabel = () => {
    if (!auth.authUser) return 'User'

    switch (auth.authUser.user_type) {
      case 'site_admin':
        return 'Site Administrator'
      case 'vendor_user':
        return 'Vendor User'
      case 'reseller':
        return 'Reseller Partner'
      default:
        return 'User'
    }
  }

  return (
    <header className="border-b bg-white px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-600">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search deals, resellers..."
              className="w-64 pl-10"
            />
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs"
            >
              3
            </Badge>
          </Button>

          {/* User Menu */}
          {auth.authUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-3">
                  {getUserTypeIcon()}
                  <div className="text-left">
                    <div className="text-sm font-medium">{auth.authUser.name}</div>
                    <div className="text-xs text-gray-500">{getUserTypeLabel()}</div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex items-center gap-2">
                    {getUserTypeIcon()}
                    <div>
                      <div className="font-medium">{auth.authUser.name}</div>
                      <div className="text-xs text-gray-500">{auth.authUser.email}</div>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                {auth.canAccessSettings() && (
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Shield className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                )}
                {auth.canManageUsers() && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin/users">
                      <Users className="mr-2 h-4 w-4" />
                      User Management
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={auth.signOut}>
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
