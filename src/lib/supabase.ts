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
          legal_name: string | null
          dba: string | null
          tax_id: string | null
          website: string | null
          phone: string | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          state_province: string | null
          postal_code: string | null
          country: string | null
          years_in_business: number | null
          employee_count: number | null
          revenue_range: 'under_1m' | '1m_5m' | '5m_25m' | '25m_100m' | 'over_100m' | null
          registration_status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected'
          approved_at: string | null
          approved_by: string | null
          rejection_reason: string | null
          terms_accepted_at: string | null
          terms_version: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          territory: string
          tier?: 'gold' | 'silver' | 'bronze'
          status?: 'active' | 'inactive'
          legal_name?: string | null
          dba?: string | null
          tax_id?: string | null
          website?: string | null
          phone?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state_province?: string | null
          postal_code?: string | null
          country?: string | null
          years_in_business?: number | null
          employee_count?: number | null
          revenue_range?: 'under_1m' | '1m_5m' | '5m_25m' | '25m_100m' | 'over_100m' | null
          registration_status?: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected'
          approved_at?: string | null
          approved_by?: string | null
          rejection_reason?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
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
          legal_name?: string | null
          dba?: string | null
          tax_id?: string | null
          website?: string | null
          phone?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state_province?: string | null
          postal_code?: string | null
          country?: string | null
          years_in_business?: number | null
          employee_count?: number | null
          revenue_range?: 'under_1m' | '1m_5m' | '5m_25m' | '25m_100m' | 'over_100m' | null
          registration_status?: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected'
          approved_at?: string | null
          approved_by?: string | null
          rejection_reason?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
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
      reseller_contacts: {
        Row: {
          id: string
          reseller_id: string
          first_name: string
          last_name: string
          email: string
          phone: string | null
          role: 'primary' | 'sales' | 'technical' | 'billing' | 'executive'
          title: string | null
          department: string | null
          is_primary: boolean
          can_register_deals: boolean
          can_view_reports: boolean
          can_manage_contacts: boolean
          last_login_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          reseller_id: string
          first_name: string
          last_name: string
          email: string
          phone?: string | null
          role: 'primary' | 'sales' | 'technical' | 'billing' | 'executive'
          title?: string | null
          department?: string | null
          is_primary?: boolean
          can_register_deals?: boolean
          can_view_reports?: boolean
          can_manage_contacts?: boolean
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          reseller_id?: string
          first_name?: string
          last_name?: string
          email?: string
          phone?: string | null
          role?: 'primary' | 'sales' | 'technical' | 'billing' | 'executive'
          title?: string | null
          department?: string | null
          is_primary?: boolean
          can_register_deals?: boolean
          can_view_reports?: boolean
          can_manage_contacts?: boolean
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      company_documents: {
        Row: {
          id: string
          reseller_id: string
          name: string
          description: string | null
          document_type: 'certification' | 'agreement' | 'license' | 'insurance' | 'other'
          file_path: string
          file_size: number | null
          mime_type: string | null
          version: number
          is_current: boolean
          expires_at: string | null
          uploaded_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          reseller_id: string
          name: string
          description?: string | null
          document_type: 'certification' | 'agreement' | 'license' | 'insurance' | 'other'
          file_path: string
          file_size?: number | null
          mime_type?: string | null
          version?: number
          is_current?: boolean
          expires_at?: string | null
          uploaded_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          reseller_id?: string
          name?: string
          description?: string | null
          document_type?: 'certification' | 'agreement' | 'license' | 'insurance' | 'other'
          file_path?: string
          file_size?: number | null
          mime_type?: string | null
          version?: number
          is_current?: boolean
          expires_at?: string | null
          uploaded_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      reseller_territories: {
        Row: {
          id: string
          reseller_id: string
          territory_name: string
          territory_type: string
          is_primary: boolean
          effective_from: string
          effective_until: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          reseller_id: string
          territory_name: string
          territory_type?: string
          is_primary?: boolean
          effective_from?: string
          effective_until?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          reseller_id?: string
          territory_name?: string
          territory_type?: string
          is_primary?: boolean
          effective_from?: string
          effective_until?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      company_metrics: {
        Row: {
          id: string
          reseller_id: string
          metric_period: string
          deals_registered: number
          deals_won: number
          total_deal_value: number
          average_deal_size: number
          win_rate: number
          time_to_close_avg: number
          customer_satisfaction: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          reseller_id: string
          metric_period: string
          deals_registered?: number
          deals_won?: number
          total_deal_value?: number
          average_deal_size?: number
          win_rate?: number
          time_to_close_avg?: number
          customer_satisfaction?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          reseller_id?: string
          metric_period?: string
          deals_registered?: number
          deals_won?: number
          total_deal_value?: number
          average_deal_size?: number
          win_rate?: number
          time_to_close_avg?: number
          customer_satisfaction?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      contact_activity: {
        Row: {
          id: string
          contact_id: string
          activity_type: string
          subject: string | null
          description: string | null
          metadata: Record<string, any> | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          contact_id: string
          activity_type: string
          subject?: string | null
          description?: string | null
          metadata?: Record<string, any> | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          contact_id?: string
          activity_type?: string
          subject?: string | null
          description?: string | null
          metadata?: Record<string, any> | null
          created_by?: string | null
          created_at?: string
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
