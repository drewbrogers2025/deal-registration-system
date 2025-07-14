import { createServerComponentClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerComponentClient()
    const { id: resellerId } = await params
    const body = await request.json()
    const { action, reason } = body // action: 'approve' | 'reject'

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Valid action (approve/reject) is required' },
        { status: 400 }
      )
    }

    if (action === 'reject' && !reason) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      )
    }

    // Get current user (staff member)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify user is staff
    const { data: staffUser, error: staffError } = await supabase
      .from('staff_users')
      .select('id, role')
      .eq('email', user.email)
      .single()

    if (staffError || !staffUser) {
      return NextResponse.json(
        { error: 'Staff access required' },
        { status: 403 }
      )
    }

    // Check if reseller exists and is in the right status
    const { data: reseller, error: resellerError } = await supabase
      .from('resellers')
      .select('id, registration_status, email, name')
      .eq('id', resellerId)
      .single()

    if (resellerError || !reseller) {
      return NextResponse.json(
        { error: 'Reseller not found' },
        { status: 404 }
      )
    }

    if (!['submitted', 'under_review'].includes(reseller.registration_status)) {
      return NextResponse.json(
        { error: 'Reseller is not in a reviewable status' },
        { status: 400 }
      )
    }

    // For approval, ensure reseller has a primary contact
    if (action === 'approve') {
      const { data: primaryContact, error: contactError } = await supabase
        .from('reseller_contacts')
        .select('id')
        .eq('reseller_id', resellerId)
        .eq('is_primary', true)
        .single()

      if (contactError || !primaryContact) {
        return NextResponse.json(
          { error: 'Reseller must have a primary contact before approval' },
          { status: 400 }
        )
      }
    }

    // Update reseller status
    const updateData = action === 'approve' 
      ? {
          registration_status: 'approved' as const,
          approved_at: new Date().toISOString(),
          approved_by: staffUser.id,
          rejection_reason: null
        }
      : {
          registration_status: 'rejected' as const,
          approved_at: null,
          approved_by: null,
          rejection_reason: reason
        }

    const { data: updatedReseller, error: updateError } = await supabase
      .from('resellers')
      .update(updateData)
      .eq('id', resellerId)
      .select(`
        *,
        contacts:reseller_contacts(*),
        territories:reseller_territories(*),
        approved_by_staff:staff_users(name, email)
      `)
      .single()

    if (updateError) {
      console.error('Error updating reseller status:', updateError)
      return NextResponse.json(
        { error: 'Failed to update reseller status', details: updateError.message },
        { status: 500 }
      )
    }

    // Log the activity
    if (action === 'approve') {
      // Find primary contact to log activity
      const primaryContact = updatedReseller.contacts?.find((c: unknown) => c.is_primary)
      if (primaryContact) {
        await supabase
          .from('contact_activity')
          .insert({
            contact_id: primaryContact.id,
            activity_type: 'approval',
            subject: 'Reseller Application Approved',
            description: `Reseller application approved by ${staffUser.role}`,
            created_by: staffUser.id,
            metadata: {
              action: 'approve',
              approved_by: staffUser.id,
              approved_at: updateData.approved_at
            }
          })
      }
    } else {
      // Log rejection activity
      const primaryContact = updatedReseller.contacts?.find((c: unknown) => c.is_primary)
      if (primaryContact) {
        await supabase
          .from('contact_activity')
          .insert({
            contact_id: primaryContact.id,
            activity_type: 'rejection',
            subject: 'Reseller Application Rejected',
            description: `Reseller application rejected: ${reason}`,
            created_by: staffUser.id,
            metadata: {
              action: 'reject',
              reason: reason,
              rejected_by: staffUser.id
            }
          })
      }
    }

    // TODO: Send notification email to reseller
    // This would typically involve sending an email notification
    // about the approval or rejection

    return NextResponse.json({ 
      data: updatedReseller, 
      success: true,
      message: action === 'approve' 
        ? 'Reseller approved successfully' 
        : 'Reseller rejected successfully'
    })

  } catch (error) {
    console.error('Unexpected error during reseller approval:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get approval history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerComponentClient()
    const { id: resellerId } = await params

    // Get reseller with approval information
    const { data: reseller, error } = await supabase
      .from('resellers')
      .select(`
        id,
        name,
        email,
        registration_status,
        approved_at,
        rejection_reason,
        approved_by_staff:staff_users(name, email, role),
        contacts:reseller_contacts!inner(
          id,
          first_name,
          last_name,
          email,
          is_primary,
          activities:contact_activity(
            activity_type,
            subject,
            description,
            created_at,
            created_by_staff:staff_users(name, email)
          )
        )
      `)
      .eq('id', resellerId)
      .single()

    if (error) {
      console.error('Error fetching approval history:', error)
      return NextResponse.json(
        { error: 'Failed to fetch approval history', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      data: reseller, 
      success: true 
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
