import { createAdminClient } from './supabase'
import type { Deal, ApprovalWorkflow, DealApproval, StaffUser, Reseller } from './types'

export interface ApprovalStep {
  step: number
  role: 'staff' | 'manager' | 'admin'
  required: boolean
  auto_approve_threshold?: number
  threshold?: number
}

export interface ApprovalResult {
  workflowId: string
  currentStep: number
  nextApprovers: StaffUser[]
  autoApproved: boolean
  requiresManualApproval: boolean
  estimatedDays: number
}

export interface WorkflowCondition {
  min_deal_value?: number
  max_deal_value?: number
  partner_tiers?: string[]
  product_categories?: string[]
  territories?: string[]
}

export class ApprovalEngine {
  private supabase = createAdminClient()

  async determineWorkflow(deal: Deal & { reseller: Reseller }): Promise<ApprovalResult | null> {
    try {
      // Get all active workflows
      const { data: workflows, error } = await this.supabase
        .from('approval_workflows')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true })

      if (error || !workflows) {
        console.error('Error fetching workflows:', error)
        return null
      }

      // Find matching workflow based on conditions
      const matchingWorkflow = this.findMatchingWorkflow(deal, workflows)
      
      if (!matchingWorkflow) {
        console.warn('No matching workflow found for deal:', deal.id)
        return null
      }

      // Check for auto-approval conditions
      const autoApprovalResult = this.checkAutoApproval(deal, matchingWorkflow)
      
      if (autoApprovalResult.autoApproved) {
        await this.autoApproveDeal(deal.id, matchingWorkflow.id)
        return autoApprovalResult
      }

      // Initialize workflow for manual approval
      const workflowResult = await this.initializeWorkflow(deal, matchingWorkflow)
      return workflowResult

    } catch (error) {
      console.error('Error determining workflow:', error)
      return null
    }
  }

  private findMatchingWorkflow(deal: Deal & { reseller: Reseller }, workflows: ApprovalWorkflow[]): ApprovalWorkflow | null {
    for (const workflow of workflows) {
      const conditions = workflow.conditions as WorkflowCondition
      
      // Check deal value conditions
      if (conditions.min_deal_value && deal.total_value < conditions.min_deal_value) {
        continue
      }
      
      if (conditions.max_deal_value && deal.total_value > conditions.max_deal_value) {
        continue
      }

      // Check partner tier conditions
      if (conditions.partner_tiers && !conditions.partner_tiers.includes(deal.reseller.tier)) {
        continue
      }

      // Check territory conditions
      if (conditions.territories && !conditions.territories.includes(deal.reseller.territory)) {
        continue
      }

      // If all conditions match, return this workflow
      return workflow
    }

    // Return default workflow if no specific match
    return workflows.find(w => w.name === 'Standard Deal Approval') || workflows[0] || null
  }

  private checkAutoApproval(deal: Deal, workflow: ApprovalWorkflow): ApprovalResult {
    const steps = workflow.steps as ApprovalStep[]
    
    // Check if deal qualifies for auto-approval
    for (const step of steps) {
      if (step.auto_approve_threshold && deal.total_value <= step.auto_approve_threshold) {
        return {
          workflowId: workflow.id!,
          currentStep: 0,
          nextApprovers: [],
          autoApproved: true,
          requiresManualApproval: false,
          estimatedDays: 0
        }
      }
    }

    return {
      workflowId: workflow.id!,
      currentStep: 1,
      nextApprovers: [],
      autoApproved: false,
      requiresManualApproval: true,
      estimatedDays: this.estimateApprovalTime(steps)
    }
  }

  private async initializeWorkflow(deal: Deal, workflow: ApprovalWorkflow): Promise<ApprovalResult> {
    const steps = workflow.steps as ApprovalStep[]
    const firstStep = steps[0]

    if (!firstStep) {
      throw new Error('Workflow has no steps defined')
    }

    // Create initial approval record
    const { error: approvalError } = await this.supabase
      .from('deal_approvals')
      .insert({
        deal_id: deal.id,
        workflow_id: workflow.id,
        step_number: firstStep.step,
        created_at: new Date().toISOString()
      })

    if (approvalError) {
      console.error('Error creating approval record:', approvalError)
      throw new Error('Failed to initialize workflow')
    }

    // Get next approvers
    const nextApprovers = await this.getApproversForStep(firstStep)

    // Update deal status
    await this.updateDealStatus(deal.id, 'pending', 'approval_pending')

    return {
      workflowId: workflow.id!,
      currentStep: firstStep.step,
      nextApprovers,
      autoApproved: false,
      requiresManualApproval: true,
      estimatedDays: this.estimateApprovalTime(steps)
    }
  }

  private async autoApproveDeal(dealId: string, workflowId: string): Promise<void> {
    // Create approval record for auto-approval
    await this.supabase
      .from('deal_approvals')
      .insert({
        deal_id: dealId,
        workflow_id: workflowId,
        step_number: 0,
        action: 'approve',
        comments: 'Auto-approved based on workflow conditions',
        approved_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      })

    // Update deal status to approved
    await this.updateDealStatus(dealId, 'approved', 'approved_conditional')
  }

  async processApprovalAction(
    dealId: string, 
    approverId: string, 
    action: 'approve' | 'reject' | 'request_changes' | 'escalate',
    comments?: string,
    escalateToId?: string
  ): Promise<{ success: boolean; nextStep?: ApprovalResult; message: string }> {
    try {
      // Get current approval step
      const { data: currentApproval, error: approvalError } = await this.supabase
        .from('deal_approvals')
        .select(`
          *,
          workflow:approval_workflows(*)
        `)
        .eq('deal_id', dealId)
        .is('approved_at', null)
        .order('step_number', { ascending: false })
        .limit(1)
        .single()

      if (approvalError || !currentApproval) {
        return { success: false, message: 'No pending approval found' }
      }

      // Update current approval record
      const { error: updateError } = await this.supabase
        .from('deal_approvals')
        .update({
          approver_id: approverId,
          action,
          comments,
          approved_at: new Date().toISOString()
        })
        .eq('id', currentApproval.id)

      if (updateError) {
        console.error('Error updating approval:', updateError)
        return { success: false, message: 'Failed to update approval' }
      }

      // Handle different actions
      switch (action) {
        case 'approve':
          return await this.handleApproval(dealId, currentApproval)
        
        case 'reject':
          await this.handleRejection(dealId, comments || 'No reason provided')
          return { success: true, message: 'Deal rejected successfully' }
        
        case 'request_changes':
          await this.handleChangeRequest(dealId, comments || 'Changes requested')
          return { success: true, message: 'Changes requested successfully' }
        
        case 'escalate':
          return await this.handleEscalation(dealId, currentApproval, escalateToId)
        
        default:
          return { success: false, message: 'Invalid action' }
      }

    } catch (error) {
      console.error('Error processing approval action:', error)
      return { success: false, message: 'An error occurred processing the approval' }
    }
  }

  private async handleApproval(dealId: string, currentApproval: any): Promise<{ success: boolean; nextStep?: ApprovalResult; message: string }> {
    const workflow = currentApproval.workflow
    const steps = workflow.steps as ApprovalStep[]
    const currentStepNumber = currentApproval.step_number
    
    // Find next required step
    const nextStep = steps.find(step => step.step > currentStepNumber && step.required)
    
    if (!nextStep) {
      // No more steps, approve the deal
      await this.updateDealStatus(dealId, 'approved', 'approved_conditional')
      return { success: true, message: 'Deal approved successfully' }
    }

    // Create next approval step
    const { error } = await this.supabase
      .from('deal_approvals')
      .insert({
        deal_id: dealId,
        workflow_id: workflow.id,
        step_number: nextStep.step,
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error('Error creating next approval step:', error)
      return { success: false, message: 'Failed to advance to next approval step' }
    }

    // Get next approvers
    const nextApprovers = await this.getApproversForStep(nextStep)
    
    // Update deal substatus
    const substatus = nextStep.role === 'admin' ? 'admin_review' : 'manager_review'
    await this.updateDealStatus(dealId, 'pending', substatus)

    const nextStepResult: ApprovalResult = {
      workflowId: workflow.id,
      currentStep: nextStep.step,
      nextApprovers,
      autoApproved: false,
      requiresManualApproval: true,
      estimatedDays: this.estimateStepTime(nextStep)
    }

    return { 
      success: true, 
      nextStep: nextStepResult,
      message: `Approved. Advanced to ${nextStep.role} review.` 
    }
  }

  private async handleRejection(dealId: string, reason: string): Promise<void> {
    await this.updateDealStatus(dealId, 'rejected', 'rejected_approval')
    
    // Add status history
    await this.addStatusHistory(dealId, 'pending', 'rejected', 'approval_pending', 'rejected_approval', reason)
  }

  private async handleChangeRequest(dealId: string, reason: string): Promise<void> {
    await this.updateDealStatus(dealId, 'pending', 'validation_pending')
    
    // Add status history
    await this.addStatusHistory(dealId, 'pending', 'pending', 'approval_pending', 'validation_pending', reason)
  }

  private async handleEscalation(dealId: string, currentApproval: any, escalateToId?: string): Promise<{ success: boolean; message: string }> {
    const workflow = currentApproval.workflow
    const steps = workflow.steps as ApprovalStep[]
    
    // Find admin step for escalation
    const adminStep = steps.find(step => step.role === 'admin')
    
    if (!adminStep) {
      return { success: false, message: 'No escalation path available' }
    }

    // Create escalated approval step
    const { error } = await this.supabase
      .from('deal_approvals')
      .insert({
        deal_id: dealId,
        workflow_id: workflow.id,
        step_number: adminStep.step,
        approver_id: escalateToId,
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error('Error creating escalated approval:', error)
      return { success: false, message: 'Failed to escalate approval' }
    }

    await this.updateDealStatus(dealId, 'pending', 'admin_review')
    
    return { success: true, message: 'Deal escalated to admin review' }
  }

  private async getApproversForStep(step: ApprovalStep): Promise<StaffUser[]> {
    const { data: approvers, error } = await this.supabase
      .from('staff_users')
      .select('*')
      .eq('role', step.role)
      .order('name')

    if (error) {
      console.error('Error fetching approvers:', error)
      return []
    }

    return approvers || []
  }

  private async updateDealStatus(dealId: string, status: string, substatus: string): Promise<void> {
    const { error } = await this.supabase
      .from('deals')
      .update({ 
        status, 
        substatus,
        updated_at: new Date().toISOString() 
      })
      .eq('id', dealId)

    if (error) {
      console.error('Error updating deal status:', error)
    }
  }

  private async addStatusHistory(
    dealId: string, 
    oldStatus: string, 
    newStatus: string, 
    oldSubstatus: string, 
    newSubstatus: string, 
    reason: string
  ): Promise<void> {
    await this.supabase
      .from('deal_status_history')
      .insert({
        deal_id: dealId,
        old_status: oldStatus,
        new_status: newStatus,
        old_substatus: oldSubstatus,
        new_substatus: newSubstatus,
        reason,
        created_at: new Date().toISOString()
      })
  }

  private estimateApprovalTime(steps: ApprovalStep[]): number {
    // Estimate based on number of required steps
    const requiredSteps = steps.filter(step => step.required).length
    return Math.max(1, requiredSteps * 2) // 2 days per step minimum
  }

  private estimateStepTime(step: ApprovalStep): number {
    const timeByRole = {
      'staff': 1,
      'manager': 2,
      'admin': 3
    }
    return timeByRole[step.role] || 2
  }

  async getBulkApprovalCandidates(approverId: string): Promise<Deal[]> {
    try {
      // Get deals pending approval by this user's role
      const { data: approver } = await this.supabase
        .from('staff_users')
        .select('role')
        .eq('id', approverId)
        .single()

      if (!approver) {
        return []
      }

      // Find deals in approval steps matching this user's role
      const { data: pendingApprovals } = await this.supabase
        .from('deal_approvals')
        .select(`
          deal_id,
          workflow:approval_workflows(steps)
        `)
        .is('approved_at', null)

      if (!pendingApprovals) {
        return []
      }

      const eligibleDealIds = pendingApprovals
        .filter(approval => {
          const steps = approval.workflow.steps as ApprovalStep[]
          const currentStep = steps.find(step => step.step === approval.step_number)
          return currentStep?.role === approver.role
        })
        .map(approval => approval.deal_id)

      if (eligibleDealIds.length === 0) {
        return []
      }

      // Get deal details
      const { data: deals } = await this.supabase
        .from('deals')
        .select(`
          *,
          reseller:resellers(*),
          end_user:end_users(*)
        `)
        .in('id', eligibleDealIds)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })

      return deals || []

    } catch (error) {
      console.error('Error getting bulk approval candidates:', error)
      return []
    }
  }

  async bulkApprove(dealIds: string[], approverId: string, comments?: string): Promise<{ success: boolean; processed: number; errors: string[] }> {
    const errors: string[] = []
    let processed = 0

    for (const dealId of dealIds) {
      try {
        const result = await this.processApprovalAction(dealId, approverId, 'approve', comments)
        if (result.success) {
          processed++
        } else {
          errors.push(`Deal ${dealId}: ${result.message}`)
        }
      } catch (error) {
        errors.push(`Deal ${dealId}: ${error}`)
      }
    }

    return {
      success: errors.length === 0,
      processed,
      errors
    }
  }
}
