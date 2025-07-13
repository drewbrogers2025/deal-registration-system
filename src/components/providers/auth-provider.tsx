'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

type AuthContextType = {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
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

  useEffect(() => {
    if (!supabase) return

    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
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
    }
  }

  const value = {
    user,
    loading,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
