import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'
import { getServerAuthUser, canManageUsers } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const authUser = await getServerAuthUser()
    
    if (!canManageUsers(authUser)) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 })
    }

    const supabase = createServerComponentClient()
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const userType = searchParams.get('user_type') || ''
    
    const offset = (page - 1) * limit
    
    // Build query
    let query = supabase
      .from('users')
      .select(`
        *,
        staff_users (
          role,
          department,
          permissions
        ),
        reseller_users (
          reseller_id,
          can_create_deals,
          can_view_all_reseller_deals,
          territory_access,
          resellers (
            name,
            territory,
            tier
          )
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }
    
    if (status && status !== 'all') {
      query = query.eq('approval_status', status)
    }
    
    if (userType && userType !== 'all') {
      query = query.eq('user_type', userType)
    }
    
    const { data: users, error, count } = await query
    
    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch users',
        details: error
      }, { status: 500 })
    }
    
    const totalPages = Math.ceil((count || 0) / limit)
    
    return NextResponse.json({
      success: true,
      data: {
        items: users || [],
        total: count || 0,
        page,
        limit,
        totalPages
      },
      error: null
    })
    
  } catch (err: unknown) {
    console.error('Error in users API:', err)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: err.message
    }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authUser = await getServerAuthUser()
    
    if (!canManageUsers(authUser)) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 })
    }

    const supabase = createServerComponentClient()
    const body = await request.json()
    
    const { user_id, action, ...updateData } = body
    
    if (!user_id) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 })
    }
    
    let updates: unknown = {}
    
    // Handle specific actions
    if (action === 'approve') {
      updates = {
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: authUser?.id
      }
    } else if (action === 'reject') {
      updates = {
        approval_status: 'rejected',
        approved_at: null,
        approved_by: authUser?.id
      }
    } else if (action === 'update_profile') {
      // Allow updating specific profile fields
      const allowedFields = ['name', 'phone', 'company_position']
      updates = Object.keys(updateData)
        .filter(key => allowedFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = updateData[key]
          return obj
        }, {} as any)
      
      updates.updated_at = new Date().toISOString()
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid action'
      }, { status: 400 })
    }
    
    // Update user
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user_id)
      .select()
      .single()
    
    if (updateError) {
      console.error('Error updating user:', updateError)
      return NextResponse.json({
        success: false,
        error: 'Failed to update user',
        details: updateError
      }, { status: 500 })
    }
    
    // Handle staff user updates if needed
    if (action === 'update_staff' && updateData.staff_data) {
      const { role, department, permissions } = updateData.staff_data
      
      const { error: staffError } = await supabase
        .from('staff_users')
        .update({
          role,
          department,
          permissions,
          updated_at: new Date().toISOString()
        })
        .eq('id', user_id)
      
      if (staffError) {
        console.error('Error updating staff user:', staffError)
        // Don't fail the whole request, just log the error
      }
    }
    
    // Handle reseller user updates if needed
    if (action === 'update_reseller' && updateData.reseller_data) {
      const { can_create_deals, can_view_all_reseller_deals, territory_access } = updateData.reseller_data
      
      const { error: resellerError } = await supabase
        .from('reseller_users')
        .update({
          can_create_deals,
          can_view_all_reseller_deals,
          territory_access,
          updated_at: new Date().toISOString()
        })
        .eq('id', user_id)
      
      if (resellerError) {
        console.error('Error updating reseller user:', resellerError)
        // Don't fail the whole request, just log the error
      }
    }
    
    // TODO: Send email notification for approval/rejection
    if (action === 'approve' || action === 'reject') {
      // Implement email notification logic here
      console.log(`User ${user_id} ${action}d by ${authUser?.id}`)
    }
    
    return NextResponse.json({
      success: true,
      data: updatedUser,
      error: null
    })
    
  } catch (err: unknown) {
    console.error('Error updating user:', err)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: err.message
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authUser = await getServerAuthUser()
    
    if (!canManageUsers(authUser)) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 })
    }

    const supabase = createServerComponentClient()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 })
    }
    
    // Prevent self-deletion
    if (userId === authUser?.id) {
      return NextResponse.json({
        success: false,
        error: 'Cannot delete your own account'
      }, { status: 400 })
    }
    
    // Delete user (this will cascade to related tables due to foreign key constraints)
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)
    
    if (error) {
      console.error('Error deleting user:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to delete user',
        details: error
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      data: null,
      error: null
    })
    
  } catch (err: unknown) {
    console.error('Error deleting user:', err)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: err.message
    }, { status: 500 })
  }
}
