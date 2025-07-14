import { createAdminClient } from './supabase'
import type { Deal, StaffUser, Notification, NotificationType } from './types'

export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

export interface NotificationPayload {
  type: NotificationType
  recipientId: string
  title: string
  message: string
  relatedDealId?: string
  actionUrl?: string
  emailData?: Record<string, any>
}

export class NotificationService {
  private supabase = createAdminClient()

  async sendNotification(payload: NotificationPayload): Promise<{ success: boolean; error?: string }> {
    try {
      // Create in-app notification
      const { error: notificationError } = await this.supabase
        .from('notifications')
        .insert({
          recipient_id: payload.recipientId,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          related_deal_id: payload.relatedDealId,
          action_url: payload.actionUrl,
          status: 'unread',
          created_at: new Date().toISOString()
        })

      if (notificationError) {
        console.error('Error creating notification:', notificationError)
        return { success: false, error: 'Failed to create notification' }
      }

      // Send email notification if email data is provided
      if (payload.emailData) {
        await this.sendEmailNotification(payload)
      }

      return { success: true }

    } catch (error) {
      console.error('Error sending notification:', error)
      return { success: false, error: 'An error occurred sending notification' }
    }
  }

  async notifyDealSubmitted(deal: Deal & { reseller: any; end_user: any }): Promise<void> {
    try {
      // Get all staff users who should be notified
      const { data: staffUsers } = await this.supabase
        .from('staff_users')
        .select('*')
        .eq('role', 'staff')

      if (!staffUsers) return

      const notifications = staffUsers.map(staff => ({
        type: 'deal_submitted' as NotificationType,
        recipientId: staff.id,
        title: 'New Deal Submitted',
        message: `New deal submitted by ${deal.reseller.name} for ${deal.end_user.company_name} - $${deal.total_value.toLocaleString()}`,
        relatedDealId: deal.id,
        actionUrl: `/deals/${deal.id}`,
        emailData: {
          staffName: staff.name,
          resellerName: deal.reseller.name,
          endUserCompany: deal.end_user.company_name,
          dealValue: deal.total_value,
          dealId: deal.id
        }
      }))

      // Send all notifications
      await Promise.all(notifications.map(notification => this.sendNotification(notification)))

    } catch (error) {
      console.error('Error notifying deal submitted:', error)
    }
  }

  async notifyApprovalRequired(deal: Deal, approvers: StaffUser[]): Promise<void> {
    try {
      const notifications = approvers.map(approver => ({
        type: 'approval_required' as NotificationType,
        recipientId: approver.id,
        title: 'Deal Approval Required',
        message: `Deal ${deal.id} requires your approval - $${deal.total_value.toLocaleString()}`,
        relatedDealId: deal.id,
        actionUrl: `/deals/${deal.id}/approve`,
        emailData: {
          approverName: approver.name,
          dealId: deal.id,
          dealValue: deal.total_value,
          priority: deal.priority || 1
        }
      }))

      await Promise.all(notifications.map(notification => this.sendNotification(notification)))

    } catch (error) {
      console.error('Error notifying approval required:', error)
    }
  }

  async notifyDealApproved(deal: Deal & { reseller: any }): Promise<void> {
    try {
      // Notify the submitting reseller (if we had reseller users)
      // For now, notify all staff
      const { data: staffUsers } = await this.supabase
        .from('staff_users')
        .select('*')

      if (!staffUsers) return

      const notifications = staffUsers.map(staff => ({
        type: 'deal_approved' as NotificationType,
        recipientId: staff.id,
        title: 'Deal Approved',
        message: `Deal ${deal.id} has been approved - $${deal.total_value.toLocaleString()}`,
        relatedDealId: deal.id,
        actionUrl: `/deals/${deal.id}`,
        emailData: {
          staffName: staff.name,
          dealId: deal.id,
          dealValue: deal.total_value,
          resellerName: deal.reseller.name
        }
      }))

      await Promise.all(notifications.map(notification => this.sendNotification(notification)))

    } catch (error) {
      console.error('Error notifying deal approved:', error)
    }
  }

  async notifyDealRejected(deal: Deal & { reseller: any }, reason: string): Promise<void> {
    try {
      const { data: staffUsers } = await this.supabase
        .from('staff_users')
        .select('*')

      if (!staffUsers) return

      const notifications = staffUsers.map(staff => ({
        type: 'deal_rejected' as NotificationType,
        recipientId: staff.id,
        title: 'Deal Rejected',
        message: `Deal ${deal.id} has been rejected: ${reason}`,
        relatedDealId: deal.id,
        actionUrl: `/deals/${deal.id}`,
        emailData: {
          staffName: staff.name,
          dealId: deal.id,
          dealValue: deal.total_value,
          resellerName: deal.reseller.name,
          rejectionReason: reason
        }
      }))

      await Promise.all(notifications.map(notification => this.sendNotification(notification)))

    } catch (error) {
      console.error('Error notifying deal rejected:', error)
    }
  }

  async notifyConflictDetected(deal: Deal, conflictingDeals: Deal[]): Promise<void> {
    try {
      // Notify managers and admins about conflicts
      const { data: staffUsers } = await this.supabase
        .from('staff_users')
        .select('*')
        .in('role', ['manager', 'admin'])

      if (!staffUsers) return

      const conflictSummary = conflictingDeals.map(d => `Deal ${d.id}`).join(', ')

      const notifications = staffUsers.map(staff => ({
        type: 'conflict_detected' as NotificationType,
        recipientId: staff.id,
        title: 'Deal Conflict Detected',
        message: `Deal ${deal.id} has conflicts with: ${conflictSummary}`,
        relatedDealId: deal.id,
        actionUrl: `/deals/${deal.id}/conflicts`,
        emailData: {
          staffName: staff.name,
          dealId: deal.id,
          conflictingDeals: conflictingDeals.map(d => d.id),
          conflictCount: conflictingDeals.length
        }
      }))

      await Promise.all(notifications.map(notification => this.sendNotification(notification)))

    } catch (error) {
      console.error('Error notifying conflict detected:', error)
    }
  }

  async notifyCommentAdded(dealId: string, comment: string, authorName: string): Promise<void> {
    try {
      // Get all staff users involved with this deal
      const { data: staffUsers } = await this.supabase
        .from('staff_users')
        .select('*')

      if (!staffUsers) return

      const notifications = staffUsers.map(staff => ({
        type: 'comment_added' as NotificationType,
        recipientId: staff.id,
        title: 'New Comment Added',
        message: `${authorName} added a comment to deal ${dealId}`,
        relatedDealId: dealId,
        actionUrl: `/deals/${dealId}#comments`,
        emailData: {
          staffName: staff.name,
          dealId,
          authorName,
          commentPreview: comment.substring(0, 100) + (comment.length > 100 ? '...' : '')
        }
      }))

      await Promise.all(notifications.map(notification => this.sendNotification(notification)))

    } catch (error) {
      console.error('Error notifying comment added:', error)
    }
  }

  async notifyDocumentUploaded(dealId: string, filename: string, uploaderName: string): Promise<void> {
    try {
      const { data: staffUsers } = await this.supabase
        .from('staff_users')
        .select('*')

      if (!staffUsers) return

      const notifications = staffUsers.map(staff => ({
        type: 'document_uploaded' as NotificationType,
        recipientId: staff.id,
        title: 'Document Uploaded',
        message: `${uploaderName} uploaded "${filename}" to deal ${dealId}`,
        relatedDealId: dealId,
        actionUrl: `/deals/${dealId}#documents`,
        emailData: {
          staffName: staff.name,
          dealId,
          uploaderName,
          filename
        }
      }))

      await Promise.all(notifications.map(notification => this.sendNotification(notification)))

    } catch (error) {
      console.error('Error notifying document uploaded:', error)
    }
  }

  async getNotifications(userId: string, limit = 50): Promise<Notification[]> {
    try {
      const { data: notifications, error } = await this.supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching notifications:', error)
        return []
      }

      return notifications || []

    } catch (error) {
      console.error('Error getting notifications:', error)
      return []
    }
  }

  async markAsRead(notificationId: string): Promise<{ success: boolean }> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({ 
          status: 'read',
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId)

      return { success: !error }

    } catch (error) {
      console.error('Error marking notification as read:', error)
      return { success: false }
    }
  }

  async markAllAsRead(userId: string): Promise<{ success: boolean }> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({ 
          status: 'read',
          read_at: new Date().toISOString()
        })
        .eq('recipient_id', userId)
        .eq('status', 'unread')

      return { success: !error }

    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      return { success: false }
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .eq('status', 'unread')

      if (error) {
        console.error('Error getting unread count:', error)
        return 0
      }

      return count || 0

    } catch (error) {
      console.error('Error getting unread count:', error)
      return 0
    }
  }

  private async sendEmailNotification(payload: NotificationPayload): Promise<void> {
    try {
      // Get recipient email
      const { data: recipient } = await this.supabase
        .from('staff_users')
        .select('email, name')
        .eq('id', payload.recipientId)
        .single()

      if (!recipient) {
        console.warn('Recipient not found for email notification')
        return
      }

      // Generate email template
      const template = this.generateEmailTemplate(payload.type, payload.emailData || {})
      
      // In a real implementation, you would integrate with an email service like:
      // - SendGrid
      // - AWS SES
      // - Mailgun
      // - Resend
      
      console.log('Email notification would be sent:', {
        to: recipient.email,
        subject: template.subject,
        html: template.html
      })

      // TODO: Implement actual email sending
      // await emailService.send({
      //   to: recipient.email,
      //   subject: template.subject,
      //   html: template.html
      // })

    } catch (error) {
      console.error('Error sending email notification:', error)
    }
  }

  private generateEmailTemplate(type: NotificationType, data: Record<string, any>): EmailTemplate {
    const templates = {
      deal_submitted: {
        subject: `New Deal Submitted - ${data.endUserCompany}`,
        html: `
          <h2>New Deal Submitted</h2>
          <p>Hello ${data.staffName},</p>
          <p>A new deal has been submitted by <strong>${data.resellerName}</strong> for <strong>${data.endUserCompany}</strong>.</p>
          <p><strong>Deal Value:</strong> $${data.dealValue?.toLocaleString()}</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/deals/${data.dealId}">View Deal</a></p>
        `,
        text: `New deal submitted by ${data.resellerName} for ${data.endUserCompany} - $${data.dealValue?.toLocaleString()}`
      },
      approval_required: {
        subject: `Deal Approval Required - ${data.dealId}`,
        html: `
          <h2>Deal Approval Required</h2>
          <p>Hello ${data.approverName},</p>
          <p>Deal <strong>${data.dealId}</strong> requires your approval.</p>
          <p><strong>Deal Value:</strong> $${data.dealValue?.toLocaleString()}</p>
          <p><strong>Priority:</strong> ${data.priority}</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/deals/${data.dealId}/approve">Review & Approve</a></p>
        `,
        text: `Deal ${data.dealId} requires your approval - $${data.dealValue?.toLocaleString()}`
      },
      deal_approved: {
        subject: `Deal Approved - ${data.dealId}`,
        html: `
          <h2>Deal Approved</h2>
          <p>Hello ${data.staffName},</p>
          <p>Deal <strong>${data.dealId}</strong> has been approved.</p>
          <p><strong>Reseller:</strong> ${data.resellerName}</p>
          <p><strong>Deal Value:</strong> $${data.dealValue?.toLocaleString()}</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/deals/${data.dealId}">View Deal</a></p>
        `,
        text: `Deal ${data.dealId} has been approved - $${data.dealValue?.toLocaleString()}`
      },
      deal_rejected: {
        subject: `Deal Rejected - ${data.dealId}`,
        html: `
          <h2>Deal Rejected</h2>
          <p>Hello ${data.staffName},</p>
          <p>Deal <strong>${data.dealId}</strong> has been rejected.</p>
          <p><strong>Reason:</strong> ${data.rejectionReason}</p>
          <p><strong>Reseller:</strong> ${data.resellerName}</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/deals/${data.dealId}">View Deal</a></p>
        `,
        text: `Deal ${data.dealId} has been rejected: ${data.rejectionReason}`
      },
      conflict_detected: {
        subject: `Deal Conflict Detected - ${data.dealId}`,
        html: `
          <h2>Deal Conflict Detected</h2>
          <p>Hello ${data.staffName},</p>
          <p>Deal <strong>${data.dealId}</strong> has conflicts with ${data.conflictCount} other deal(s).</p>
          <p><strong>Conflicting Deals:</strong> ${data.conflictingDeals?.join(', ')}</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/deals/${data.dealId}/conflicts">Resolve Conflicts</a></p>
        `,
        text: `Deal ${data.dealId} has conflicts that need resolution`
      },
      comment_added: {
        subject: `New Comment - Deal ${data.dealId}`,
        html: `
          <h2>New Comment Added</h2>
          <p>Hello ${data.staffName},</p>
          <p><strong>${data.authorName}</strong> added a comment to deal <strong>${data.dealId}</strong>.</p>
          <p><em>"${data.commentPreview}"</em></p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/deals/${data.dealId}#comments">View Comment</a></p>
        `,
        text: `${data.authorName} added a comment to deal ${data.dealId}`
      },
      document_uploaded: {
        subject: `Document Uploaded - Deal ${data.dealId}`,
        html: `
          <h2>Document Uploaded</h2>
          <p>Hello ${data.staffName},</p>
          <p><strong>${data.uploaderName}</strong> uploaded a document to deal <strong>${data.dealId}</strong>.</p>
          <p><strong>File:</strong> ${data.filename}</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/deals/${data.dealId}#documents">View Documents</a></p>
        `,
        text: `${data.uploaderName} uploaded "${data.filename}" to deal ${data.dealId}`
      }
    }

    return templates[type] || {
      subject: 'Notification',
      html: '<p>You have a new notification.</p>',
      text: 'You have a new notification.'
    }
  }
}
