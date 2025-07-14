import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'
import { ApprovalActionSchema } from '@/lib/types'
import { ApprovalEngine } from '@/lib/approval-engine'
import { NotificationService } from '@/lib/notification-service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerComponentClient()
    const body = await request.json()
    const resolvedParams = await params
    const dealId = resolvedParams.id

    // Validate request body
    const validation = ApprovalActionSchema.safeParse({
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

    const { action, comments, escalate_to } = validation.data

    // TODO: Get approver ID from auth context
    // For now, we'll use a placeholder
    const approverId = body.approver_id || 'placeholder-approver-id'

    // Get deal details
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select(`
        *,
        reseller:resellers(*),
        end_user:end_users(*)
      `)
      .eq('id', dealId)
      .single()

    if (dealError || !deal) {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      )
    }

    // Process approval action
    const approvalEngine = new ApprovalEngine()
    const result = await approvalEngine.processApprovalAction(
      dealId,
      approverId,
      action,
      comments,
      escalate_to
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      )
    }

    // Send notifications based on action
    const notificationService = new NotificationService()
    
    switch (action) {
      case 'approve':
        if (result.nextStep) {
          // Notify next approvers
          await notificationService.notifyApprovalRequired(deal, result.nextStep.nextApprovers)
        } else {
          // Deal fully approved
          await notificationService.notifyDealApproved(deal)
        }
        break
      
      case 'reject':
        await notificationService.notifyDealRejected(deal, comments || 'No reason provided')
        break
      
      case 'escalate':
        // Notify escalated approvers
        if (result.nextStep) {
          await notificationService.notifyApprovalRequired(deal, result.nextStep.nextApprovers)
        }
        break
    }

    // Get updated deal with latest status
    const { data: updatedDeal, error: fetchError } = await supabase
      .from('deals')
      .select(`
        *,
        reseller:resellers(*),
        end_user:end_users(*),
        approvals:deal_approvals(
          *,
          approver:staff_users(name, email, role),
          workflow:approval_workflows(name, description)
        ),
        status_history:deal_status_history(
          *,
          changed_by_user:staff_users(name, role)
        )
      `)
      .eq('id', dealId)
      .single()

    if (fetchError) {
      console.error('Error fetching updated deal:', fetchError)
      return NextResponse.json(
        { error: 'Action processed but failed to fetch updated deal' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: {
        deal: updatedDeal,
        result: result
      },
      success: true,
      error: null
    })

  } catch (error) {
    console.error('Error processing approval:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerComponentClient()
    const resolvedParams = await params
    const dealId = resolvedParams.id

    // Get deal approval status and history
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select(`
        *,
        reseller:resellers(*),
        end_user:end_users(*),
        approvals:deal_approvals(
          *,
          approver:staff_users(name, email, role),
          workflow:approval_workflows(name, description, steps)
        ),
        status_history:deal_status_history(
          *,
          changed_by_user:staff_users(name, role)
        )
      `)
      .eq('id', dealId)
      .single()

    if (dealError || !deal) {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      )
    }

    // Get current approval step info
    const currentApproval = deal.approvals?.find((approval: any) => !approval.approved_at)
    let nextApprovers: any[] = []
    let canApprove = false

    if (currentApproval) {
      const workflow = currentApproval.workflow
      const steps = workflow?.steps as any[]
      const currentStep = steps?.find(step => step.step === currentApproval.step_number)
      
      if (currentStep) {
        // Get potential approvers for current step
        const { data: approvers } = await supabase
          .from('staff_users')
          .select('*')
          .eq('role', currentStep.role)

        nextApprovers = approvers || []
        
        // TODO: Check if current user can approve based on their role
        // canApprove = currentUser.role === currentStep.role
      }
    }

    return NextResponse.json({
      data: {
        deal,
        currentApproval,
        nextApprovers,
        canApprove
      },
      success: true,
      error: null
    })

  } catch (error) {
    console.error('Error fetching approval info:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
