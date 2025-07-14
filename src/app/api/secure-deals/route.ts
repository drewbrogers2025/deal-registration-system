import { NextRequest, NextResponse } from 'next/server'
import { withSecurity } from '@/lib/security/middleware'
import { createServerComponentClient } from '@/lib/supabase'
import { DealSchema } from '@/lib/types'
import { auditService } from '@/lib/security/audit'

/**
 * Enhanced secure API route for deals with comprehensive security
 */

// GET /api/secure-deals - List deals with security
const getHandler = withSecurity(
  async (req: NextRequest, context: { userId: string; sessionId?: string }) => {
    try {
      const supabase = createServerComponentClient()
      const { searchParams } = new URL(req.url)
      
      // Parse query parameters
      const page = parseInt(searchParams.get('page') || '1')
      const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100) // Max 100 items
      const status = searchParams.get('status')
      const territory = searchParams.get('territory')
      
      const offset = (page - 1) * limit

      // Build query with RLS automatically applied
      let query = supabase
        .from('deals')
        .select(`
          *,
          reseller:resellers(*),
          end_user:end_users(*),
          assigned_reseller:resellers!deals_assigned_reseller_id_fkey(*),
          products:deal_products(
            quantity,
            unit_price,
            product:products(*)
          ),
          conflicts:deal_conflicts(
            *,
            competing_deal:deals!deal_conflicts_competing_deal_id_fkey(*)
          )
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      // Apply filters
      if (status) {
        query = query.eq('status', status)
      }
      
      if (territory) {
        query = query.eq('territory', territory)
      }

      const { data: deals, error, count } = await query

      if (error) {
        console.error('Error fetching deals:', error)
        
        // Log the error
        await auditService.logEvent({
          user_id: context.userId,
          action: 'read',
          resource_type: 'deals',
          success: false,
          error_message: error.message,
          metadata: {
            filters: { status, territory, page, limit }
          }
        })

        return NextResponse.json(
          { error: 'Failed to fetch deals', details: error.message },
          { status: 500 }
        )
      }

      // Log successful access
      await auditService.logEvent({
        user_id: context.userId,
        action: 'read',
        resource_type: 'deals',
        success: true,
        metadata: {
          filters: { status, territory, page, limit },
          result_count: deals?.length || 0
        }
      })

      const totalPages = Math.ceil((count || 0) / limit)

      return NextResponse.json({
        data: {
          items: deals || [],
          total: count || 0,
          page,
          limit,
          totalPages
        },
        success: true,
        error: null
      })

    } catch (error) {
      console.error('Unexpected error:', error)
      
      // Log the error
      await auditService.logEvent({
        user_id: context.userId,
        action: 'read',
        resource_type: 'deals',
        success: false,
        error_message: error instanceof Error ? error.message : 'Unknown error'
      })

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  },
  {
    requireAuth: true,
    permissions: [{ resource: 'deals', action: 'read' }],
    rateLimit: { requests: 200, windowMs: 60 * 60 * 1000 }, // 200 requests per hour
    validateInput: false, // GET requests don't need input validation
    logAccess: true
  }
)

// POST /api/secure-deals - Create deal with security
const postHandler = withSecurity(
  async (req: NextRequest, context: { userId: string; sessionId?: string }) => {
    try {
      const supabase = createServerComponentClient()
      const body = await req.json()
      
      // Validate request body
      const validation = DealSchema.safeParse(body)
      if (!validation.success) {
        // Log validation failure
        await auditService.logEvent({
          user_id: context.userId,
          action: 'create',
          resource_type: 'deals',
          success: false,
          error_message: 'Validation failed',
          metadata: {
            validation_errors: validation.error.issues
          }
        })

        return NextResponse.json(
          { 
            error: 'Invalid request data', 
            details: validation.error.issues 
          },
          { status: 400 }
        )
      }

      const dealData = validation.data

      // Create the deal
      const { data: insertedDeal, error } = await supabase
        .from('deals')
        .insert({
          ...dealData,
          created_by: context.userId // Ensure created_by is set
        })
        .select(`
          *,
          reseller:resellers(*),
          end_user:end_users(*)
        `)
        .single()

      if (error) {
        console.error('Error creating deal:', error)
        
        // Log the error
        await auditService.logEvent({
          user_id: context.userId,
          action: 'create',
          resource_type: 'deals',
          success: false,
          error_message: error.message,
          new_values: dealData
        })

        return NextResponse.json(
          { error: 'Failed to create deal', details: error.message },
          { status: 500 }
        )
      }

      // Log successful creation
      await auditService.logEvent({
        user_id: context.userId,
        action: 'create',
        resource_type: 'deals',
        resource_id: insertedDeal.id,
        success: true,
        new_values: insertedDeal,
        metadata: {
          deal_value: insertedDeal.deal_value,
          territory: insertedDeal.territory
        }
      })

      return NextResponse.json({
        data: insertedDeal,
        success: true,
        error: null
      }, { status: 201 })

    } catch (error) {
      console.error('Unexpected error:', error)
      
      // Log the error
      await auditService.logEvent({
        user_id: context.userId,
        action: 'create',
        resource_type: 'deals',
        success: false,
        error_message: error instanceof Error ? error.message : 'Unknown error'
      })

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  },
  {
    requireAuth: true,
    permissions: [{ resource: 'deals', action: 'create' }],
    rateLimit: { requests: 50, windowMs: 60 * 60 * 1000 }, // 50 creates per hour
    validateInput: true,
    logAccess: true
  }
)

// Export the handlers
export const GET = getHandler
export const POST = postHandler

// Example of a more complex handler with multiple permission checks
const adminHandler = withSecurity(
  async (req: NextRequest, context: { userId: string; sessionId?: string }) => {
    // This handler would only be accessible to users with admin permissions
    return NextResponse.json({ message: 'Admin access granted' })
  },
  {
    requireAuth: true,
    permissions: [
      { resource: 'system_settings', action: 'update' },
      { resource: 'deals', action: 'delete' }
    ],
    rateLimit: { requests: 10, windowMs: 60 * 60 * 1000 },
    validateInput: true,
    logAccess: true
  }
)

// Example of API key protected endpoint
const apiKeyHandler = withSecurity(
  async (req: NextRequest, context: { userId: string; sessionId?: string }) => {
    // This handler would be accessible via API key
    return NextResponse.json({ message: 'API key access granted' })
  },
  {
    requireApiKey: true,
    rateLimit: { requests: 1000, windowMs: 60 * 60 * 1000 },
    validateInput: true,
    logAccess: true
  }
)

// Example usage in other files:
/*
// In your API route file:
import { withSecurity } from '@/lib/security/middleware'

export const GET = withSecurity(
  async (req, context) => {
    // Your handler logic here
    // context.userId will be available if requireAuth is true
  },
  {
    requireAuth: true,
    permissions: [{ resource: 'deals', action: 'read' }],
    rateLimit: { requests: 100, windowMs: 60000 },
    validateInput: false,
    logAccess: true
  }
)
*/
