import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Client-side Supabase client
export const createClientComponentClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// Server-side Supabase client (simplified for development)
export const createServerComponentClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }
  return createClient(supabaseUrl, supabaseAnonKey)
}

// Admin client with service role key
export const createAdminClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables')
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Database types
export type Database = {
  public: {
    Tables: {
      resellers: {
        Row: {
          id: string
          name: string
          email: string
          territory: string
          tier: 'gold' | 'silver' | 'bronze'
          status: 'active' | 'inactive'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          territory: string
          tier: 'gold' | 'silver' | 'bronze'
          status?: 'active' | 'inactive'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          territory?: string
          tier?: 'gold' | 'silver' | 'bronze'
          status?: 'active' | 'inactive'
          created_at?: string
          updated_at?: string
        }
      }
      end_users: {
        Row: {
          id: string
          company_name: string
          contact_name: string
          contact_email: string
          territory: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_name: string
          contact_name: string
          contact_email: string
          territory: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_name?: string
          contact_name?: string
          contact_email?: string
          territory?: string
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          category: string
          list_price: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          category: string
          list_price: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: string
          list_price?: number
          created_at?: string
          updated_at?: string
        }
      }
      deals: {
        Row: {
          id: string
          reseller_id: string
          end_user_id: string
          assigned_reseller_id: string | null
          status: 'pending' | 'assigned' | 'disputed' | 'approved' | 'rejected'
          total_value: number
          submission_date: string
          assignment_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          reseller_id: string
          end_user_id: string
          assigned_reseller_id?: string | null
          status?: 'pending' | 'assigned' | 'disputed' | 'approved' | 'rejected'
          total_value: number
          submission_date?: string
          assignment_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          reseller_id?: string
          end_user_id?: string
          assigned_reseller_id?: string | null
          status?: 'pending' | 'assigned' | 'disputed' | 'approved' | 'rejected'
          total_value?: number
          submission_date?: string
          assignment_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      deal_products: {
        Row: {
          id: string
          deal_id: string
          product_id: string
          quantity: number
          price: number
          created_at: string
        }
        Insert: {
          id?: string
          deal_id: string
          product_id: string
          quantity: number
          price: number
          created_at?: string
        }
        Update: {
          id?: string
          deal_id?: string
          product_id?: string
          quantity?: number
          price?: number
          created_at?: string
        }
      }
      deal_conflicts: {
        Row: {
          id: string
          deal_id: string
          competing_deal_id: string
          conflict_type: 'duplicate_end_user' | 'territory_overlap' | 'timing_conflict'
          resolution_status: 'pending' | 'resolved' | 'dismissed'
          assigned_to_staff: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          deal_id: string
          competing_deal_id: string
          conflict_type: 'duplicate_end_user' | 'territory_overlap' | 'timing_conflict'
          resolution_status?: 'pending' | 'resolved' | 'dismissed'
          assigned_to_staff?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          deal_id?: string
          competing_deal_id?: string
          conflict_type?: 'duplicate_end_user' | 'territory_overlap' | 'timing_conflict'
          resolution_status?: 'pending' | 'resolved' | 'dismissed'
          assigned_to_staff?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      staff_users: {
        Row: {
          id: string
          email: string
          name: string
          role: 'admin' | 'manager' | 'staff'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          role?: 'admin' | 'manager' | 'staff'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: 'admin' | 'manager' | 'staff'
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
