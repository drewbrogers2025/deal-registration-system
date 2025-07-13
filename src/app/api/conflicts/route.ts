import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerComponentClient()
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const resolution_status = searchParams.get('resolution_status')
    const conflict_type = searchParams.get('conflict_type')
    const assigned_to_staff = searchParams.get('assigned_to_staff')
    
    const offset = (page - 1) * limit
    
    // Build query
    let query = supabase
      .from('deal_conflicts')
      .select(`
        *,
        deal:deals!deal_conflicts_deal_id_fkey(
          *,
          reseller:resellers!deals_reseller_id_fkey(*),
          end_user:end_users(*),
          products:deal_products(
            *,
            product:products(*)
          )
        ),
        competing_deal:deals!deal_conflicts_competing_deal_id_fkey(
          *,
          reseller:resellers!deals_reseller_id_fkey(*),
          end_user:end_users(*),
          products:deal_products(
            *,
            product:products(*)
          )
        ),
        assigned_staff:staff_users(*)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    // Apply filters
    if (resolution_status) {
      query = query.eq('resolution_status', resolution_status)
    }
    
    if (conflict_type) {
      query = query.eq('conflict_type', conflict_type)
    }
    
    if (assigned_to_staff) {
      query = query.eq('assigned_to_staff', assigned_to_staff)
    }
    
    const { data: conflicts, error, count } = await query
    
    if (error) {
      console.error('Error fetching conflicts:', error)
      return NextResponse.json(
        { error: 'Failed to fetch conflicts', details: error.message },
        { status: 500 }
      )
    }
    
    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('deal_conflicts')
      .select('*', { count: 'exact', head: true })
    
    return NextResponse.json({
      data: {
        items: conflicts || [],
        total: totalCount || 0,
        page,
        limit,
        totalPages: Math.ceil((totalCount || 0) / limit)
      },
      success: true,
      error: null
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerComponentClient()
    const body = await request.json()
    
    const { conflict_id, resolution_status, assigned_to_staff } = body
    
    if (!conflict_id) {
      return NextResponse.json(
        { error: 'Conflict ID is required' },
        { status: 400 }
      )
    }
    
    const updateData: any = {}
    
    if (resolution_status) {
      updateData.resolution_status = resolution_status
    }
    
    if (assigned_to_staff !== undefined) {
      updateData.assigned_to_staff = assigned_to_staff
    }
    
    updateData.updated_at = new Date().toISOString()
    
    const { data: updatedConflict, error } = await supabase
      .from('deal_conflicts')
      .update(updateData)
      .eq('id', conflict_id)
      .select(`
        *,
        deal:deals!deal_conflicts_deal_id_fkey(
          *,
          reseller:resellers(*),
          end_user:end_users(*)
        ),
        competing_deal:deals!deal_conflicts_competing_deal_id_fkey(
          *,
          reseller:resellers(*),
          end_user:end_users(*)
        ),
        assigned_staff:staff_users(*)
      `)
      .single()
    
    if (error) {
      console.error('Error updating conflict:', error)
      return NextResponse.json(
        { error: 'Failed to update conflict', details: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      data: updatedConflict,
      success: true,
      error: null
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
