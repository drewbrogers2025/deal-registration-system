'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import type { AuthUser, UserType, ApprovalStatus } from '@/lib/types'

type AuthContextType = {
  user: User | null
  authUser: AuthUser | null
  loading: boolean
  isApproved: boolean
  userType: UserType['_type'] | null
  hasRole: (roles: string | string[]) => boolean
  hasUserType: (types: UserType['_type'] | UserType['_type'][]) => boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  authUser: null,
  loading: true,
  isApproved: false,
  userType: null,
  hasRole: () => false,
  hasUserType: () => false,
  signOut: async () => {},
  refreshUser: async () => {},
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Handle missing environment variables gracefully
  const [supabase, setSupabase] = useState<ReturnType<typeof createClientComponentClient> | null>(null)

  useEffect(() => {
    try {
      const client = createClientComponentClient()
      setSupabase(client)
    } catch (error) {
      console.warn('Supabase client initialization failed:', error)
      setLoading(false)
    }
  }, [])

  // Fetch user profile data
  const fetchUserProfile = async (userId: string): Promise<AuthUser | null> => {
    if (!supabase) return null

    try {
      // Get auth user data for email
      const { data: { user: authUser } } = await supabase.auth.getUser()

      // Get user data from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (userError || !userData) {
        console.warn('Failed to fetch user data:', userError)
        return null
      }

      // Get staff user data if applicable
      let staffUser = null
      if (userData.user_type === 'site_admin' || userData.user_type === 'vendor_user') {
        const { data: staffData } = await supabase
          .from('staff_users')
          .select('*')
          .eq('id', userId)
          .single()
        staffUser = staffData
      }

      // Get reseller user data if applicable
      let resellerUser = null
      if (userData.user_type === 'reseller') {
        const { data: resellerData } = await supabase
          .from('reseller_users')
          .select('*')
          .eq('id', userId)
          .single()
        resellerUser = resellerData
      }

      return {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        user_type: userData.user_type as 'site_admin' | 'vendor_user' | 'reseller',
        approval_status: userData.approval_status || 'pending',
        phone: userData.phone,
        company_position: userData.company_position,
        staff_user: staffUser,
        reseller_user: resellerUser,
      }
    } catch (error) {
      console.warn('Error fetching user profile:', error)
      return null
    }
  }

  const refreshUser = async () => {
    if (!supabase || !user) return

    const profile = await fetchUserProfile(user.id)
    setAuthUser(profile)
  }

  useEffect(() => {
    if (!supabase) return

    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)

        if (user) {
          const profile = await fetchUserProfile(user.id)
          setAuthUser(profile)
        } else {
          setAuthUser(null)
        }

        setLoading(false)
      } catch (error) {
        console.warn('Failed to get user:', error)
        setLoading(false)
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)

        if (session?.user) {
          const profile = await fetchUserProfile(session.user.id)
          setAuthUser(profile)
        } else {
          setAuthUser(null)
        }

        setLoading(false)

        if (event === 'SIGNED_IN') {
          router.push('/')
        } else if (event === 'SIGNED_OUT') {
          router.push('/auth/login')
        }

        router.refresh()
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase, router])

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut()
      setAuthUser(null)
    }
  }

  // Helper functions for role/permission checking
  const hasRole = (roles: string | string[]): boolean => {
    if (!authUser?.staff_user) return false
    const roleArray = Array.isArray(roles) ? roles : [roles]
    return roleArray.includes(authUser.staff_user.role)
  }

  const hasUserType = (types: UserType['_type'] | UserType['_type'][]): boolean => {
    if (!authUser) return false
    const typeArray = Array.isArray(types) ? types : [types]
    return typeArray.includes(authUser.user_type)
  }

  const isApproved = authUser?.approval_status === 'approved'
  const userType = authUser?.user_type || null

  const value = {
    user,
    authUser,
    loading,
    isApproved,
    userType,
    hasRole,
    hasUserType,
    signOut,
    refreshUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
