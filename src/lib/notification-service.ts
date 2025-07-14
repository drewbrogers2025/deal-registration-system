export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  read: boolean
  created_at: string
  updated_at: string
}

export interface CreateNotificationData {
  user_id: string
  title: string
  message: string
  type?: 'info' | 'success' | 'warning' | 'error'
}

export class NotificationService {
  static async createNotification(data: CreateNotificationData): Promise<Notification> {
    // In a real implementation, this would save to the database
    const notification: Notification = {
      id: crypto.randomUUID(),
      user_id: data.user_id,
      title: data.title,
      message: data.message,
      type: data.type || 'info',
      read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // TODO: Save to database
    console.log('Creating notification:', notification)
    
    return notification
  }

  static async getUserNotifications(userId: string): Promise<Notification[]> {
    // In a real implementation, this would fetch from the database
    // For now, return empty array
    console.log('Fetching notifications for user:', userId)
    return []
  }

  static async markAsRead(notificationId: string): Promise<void> {
    // In a real implementation, this would update the database
    console.log('Marking notification as read:', notificationId)
  }

  static async markAllAsRead(userId: string): Promise<void> {
    // In a real implementation, this would update all user notifications
    console.log('Marking all notifications as read for user:', userId)
  }

  static async deleteNotification(notificationId: string): Promise<void> {
    // In a real implementation, this would delete from the database
    console.log('Deleting notification:', notificationId)
  }

  // Notification templates for common events
  static async notifyDealRegistered(userId: string, dealId: string): Promise<Notification> {
    return this.createNotification({
      user_id: userId,
      title: 'Deal Registered',
      message: `Your deal registration ${dealId} has been submitted and is under review.`,
      type: 'info'
    })
  }

  static async notifyDealApproved(userId: string, dealId: string): Promise<Notification> {
    return this.createNotification({
      user_id: userId,
      title: 'Deal Approved',
      message: `Your deal registration ${dealId} has been approved!`,
      type: 'success'
    })
  }

  static async notifyDealRejected(userId: string, dealId: string, reason?: string): Promise<Notification> {
    const message = reason 
      ? `Your deal registration ${dealId} has been rejected. Reason: ${reason}`
      : `Your deal registration ${dealId} has been rejected.`
    
    return this.createNotification({
      user_id: userId,
      title: 'Deal Rejected',
      message,
      type: 'error'
    })
  }

  static async notifyResellerApproved(userId: string): Promise<Notification> {
    return this.createNotification({
      user_id: userId,
      title: 'Reseller Application Approved',
      message: 'Congratulations! Your reseller application has been approved. You can now start registering deals.',
      type: 'success'
    })
  }

  static async notifyResellerRejected(userId: string, reason?: string): Promise<Notification> {
    const message = reason 
      ? `Your reseller application has been rejected. Reason: ${reason}`
      : 'Your reseller application has been rejected.'
    
    return this.createNotification({
      user_id: userId,
      title: 'Reseller Application Rejected',
      message,
      type: 'error'
    })
  }

  static async notifyConflictDetected(userId: string, dealId: string, conflictType: string): Promise<Notification> {
    return this.createNotification({
      user_id: userId,
      title: 'Deal Conflict Detected',
      message: `A ${conflictType} conflict has been detected for your deal ${dealId}. Please review and resolve.`,
      type: 'warning'
    })
  }
}
