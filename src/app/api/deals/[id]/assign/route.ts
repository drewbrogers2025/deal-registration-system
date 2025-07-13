import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'
import { AssignDealSchema } from '@/lib/types'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerComponentClient()
    const body = await request.json()
    const dealId = params.id
    
    // Validate request body
    const validation = AssignDealSchema.safeParse({
      deal_id: dealId,
      ...body
    })
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data', 
          details: validation.error.issues 
        },
        { status: 400 }
      )
    }
    
    const { assigned_reseller_id, reason } = validation.data
    
    // Get current deal details
    const { data: currentDeal, error: fetchError } = await supabase
      .from('deals')
      .select('*')
      .eq('id', dealId)
      .single()
    
    if (fetchError || !currentDeal) {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      )
    }
    
    // Update deal assignment
    const { data: updatedDeal, error: updateError } = await supabase
      .from('deals')
      .update({
        assigned_reseller_id,
        status: 'assigned',
        assignment_date: new Date().toISOString()
      })
      .eq('id', dealId)
      .select(`
        *,
        reseller:resellers(*),
        end_user:end_users(*),
        assigned_reseller:resellers!deals_assigned_reseller_id_fkey(*),
        products:deal_products(
          *,
          product:products(*)
        ),
        conflicts:deal_conflicts(*)
      `)
      .single()
    
    if (updateError) {
      console.error('Error updating deal assignment:', updateError)
      return NextResponse.json(
        { error: 'Failed to assign deal', details: updateError.message },
        { status: 500 }
      )
    }
    
    // Create assignment history record
    const { error: historyError } = await supabase
      .from('assignment_history')
      .insert({
        deal_id: dealId,
        old_reseller_id: currentDeal.assigned_reseller_id,
        new_reseller_id: assigned_reseller_id,
        assigned_by: null, // TODO: Get from auth context
        reason: reason || 'Manual assignment'
      })
    
    if (historyError) {
      console.error('Error creating assignment history:', historyError)
      // Don't fail the request, just log the error
    }
    
    // Resolve related conflicts
    const { error: conflictError } = await supabase
      .from('deal_conflicts')
      .update({
        resolution_status: 'resolved',
        updated_at: new Date().toISOString()
      })
      .eq('deal_id', dealId)
    
    if (conflictError) {
      console.error('Error resolving conflicts:', conflictError)
      // Don't fail the request, just log the error
    }
    
    return NextResponse.json({
      data: updatedDeal,
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
