'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { createClientComponentClient } from '@/lib/supabase'
import type { StaffRole } from '@/lib/types'

export interface UserPermissions {
  canViewAllDeals: boolean
  canAssignDeals: boolean
  canResolveConflicts: boolean
  canManageUsers: boolean
  canManageSettings: boolean
  canViewReports: boolean
  canExportData: boolean
  canManageResellers: boolean
  canManageProducts: boolean
  canViewAnalytics: boolean
}

export interface UserProfile {
  id: string
  email: string
  name: string
  role: StaffRole
  permissions: UserPermissions
}

const rolePermissions: Record<StaffRole, UserPermissions> = {
  admin: {
    canViewAllDeals: true,
    canAssignDeals: true,
    canResolveConflicts: true,
    canManageUsers: true,
    canManageSettings: true,
    canViewReports: true,
    canExportData: true,
    canManageResellers: true,
    canManageProducts: true,
    canViewAnalytics: true,
  },
  manager: {
    canViewAllDeals: true,
    canAssignDeals: true,
    canResolveConflicts: true,
    canManageUsers: false,
    canManageSettings: false,
    canViewReports: true,
    canExportData: true,
    canManageResellers: true,
    canManageProducts: true,
    canViewAnalytics: true,
  },
  staff: {
    canViewAllDeals: true,
    canAssignDeals: false,
    canResolveConflicts: false,
    canManageUsers: false,
    canManageSettings: false,
    canViewReports: false,
    canExportData: false,
    canManageResellers: false,
    canManageProducts: false,
    canViewAnalytics: false,
  },
}

export function useRolePermissions() {
  const { user } = useAuth()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setUserProfile(null)
      setLoading(false)
      return
    }

    const fetchUserProfile = async () => {
      try {
        const supabase = createClientComponentClient()
        
        const { data: staffUser, error: staffError } = await supabase
          .from('staff_users')
          .select('*')
          .eq('id', user.id)
          .single()

        if (staffError) {
          console.error('Error fetching staff user:', staffError)
          setError('Failed to fetch user profile')
          setLoading(false)
          return
        }

        if (!staffUser) {
          setError('User profile not found')
          setLoading(false)
          return
        }

        const permissions = rolePermissions[staffUser.role as StaffRole]
        
        setUserProfile({
          id: staffUser.id,
          email: staffUser.email,
          name: staffUser.name,
          role: staffUser.role as StaffRole,
          permissions,
        })
        
        setError(null)
      } catch (err) {
        console.error('Unexpected error fetching user profile:', err)
        setError('An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchUserProfile()
  }, [user])

  const hasPermission = (permission: keyof UserPermissions): boolean => {
    return userProfile?.permissions[permission] ?? false
  }

  const isRole = (role: StaffRole): boolean => {
    return userProfile?.role === role
  }

  const isAdmin = (): boolean => isRole('admin')
  const isManager = (): boolean => isRole('manager')
  const isStaff = (): boolean => isRole('staff')

  return {
    userProfile,
    loading,
    error,
    hasPermission,
    isRole,
    isAdmin,
    isManager,
    isStaff,
  }
}
