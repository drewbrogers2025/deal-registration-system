import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'
import { ApprovalEngine } from '@/lib/approval-engine'
import { NotificationService } from '@/lib/notification-service'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerComponentClient()
    const body = await request.json()
    const { deal_ids, approver_id, comments } = body

    if (!deal_ids || !Array.isArray(deal_ids) || deal_ids.length === 0) {
      return NextResponse.json(
        { error: 'deal_ids array is required and must not be empty' },
        { status: 400 }
      )
    }

    if (!approver_id) {
      return NextResponse.json(
        { error: 'approver_id is required' },
        { status: 400 }
      )
    }

    // Verify approver exists
    const { data: approver, error: approverError } = await supabase
      .from('staff_users')
      .select('*')
      .eq('id', approver_id)
      .single()

    if (approverError || !approver) {
      return NextResponse.json(
        { error: 'Invalid approver_id' },
        { status: 400 }
      )
    }

    // Process bulk approval
    const approvalEngine = new ApprovalEngine()
    const result = await approvalEngine.bulkApprove(deal_ids, approver_id, comments)

    // Get details of processed deals for notifications
    const { data: processedDeals } = await supabase
      .from('deals')
      .select(`
        *,
        reseller:resellers(*),
        end_user:end_users(*)
      `)
      .in('id', deal_ids)

    // Send notifications for successfully processed deals
    if (processedDeals && result.processed > 0) {
      const notificationService = new NotificationService()
      
      for (const deal of processedDeals) {
        // Check if this deal was successfully processed
        const wasProcessed = !result.errors.some(error => error.includes(deal.id))
        
        if (wasProcessed) {
          await notificationService.notifyDealApproved(deal)
        }
      }
    }

    return NextResponse.json({
      data: {
        processed: result.processed,
        total: deal_ids.length,
        errors: result.errors,
        success_rate: (result.processed / deal_ids.length) * 100
      },
      success: result.success,
      error: result.errors.length > 0 ? 'Some deals could not be processed' : null
    })

  } catch (error) {
    console.error('Error in bulk approval:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const approverId = searchParams.get('approver_id')

    if (!approverId) {
      return NextResponse.json(
        { error: 'approver_id is required' },
        { status: 400 }
      )
    }

    // Get bulk approval candidates
    const approvalEngine = new ApprovalEngine()
    const candidates = await approvalEngine.getBulkApprovalCandidates(approverId)

    return NextResponse.json({
      data: candidates,
      success: true,
      error: null
    })

  } catch (error) {
    console.error('Error getting bulk approval candidates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
