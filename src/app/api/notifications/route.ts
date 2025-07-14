import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'
import { NotificationService } from '@/lib/notification-service'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerComponentClient()
    const { searchParams } = new URL(request.url)
    
    // TODO: Get user ID from auth context
    const userId = searchParams.get('user_id') || 'placeholder-user-id'
    const limit = parseInt(searchParams.get('limit') || '50')
    const status = searchParams.get('status') // 'unread', 'read', 'archived'

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: notifications, error } = await query

    if (error) {
      console.error('Error fetching notifications:', error)
      return NextResponse.json(
        { error: 'Failed to fetch notifications', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: notifications || [],
      success: true,
      error: null
    })

  } catch (error) {
    console.error('Error in GET /api/notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, recipient_id, title, message, related_deal_id, action_url } = body

    if (!type || !recipient_id || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: type, recipient_id, title, message' },
        { status: 400 }
      )
    }

    const notificationService = new NotificationService()
    const result = await notificationService.sendNotification({
      type,
      recipientId: recipient_id,
      title,
      message,
      relatedDealId: related_deal_id,
      actionUrl: action_url
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      error: null
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/notifications:', error)
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
    const { notification_id, action } = body

    if (!notification_id || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: notification_id, action' },
        { status: 400 }
      )
    }

    const notificationService = new NotificationService()

    if (action === 'mark_read') {
      const result = await notificationService.markAsRead(notification_id)
      
      if (!result.success) {
        return NextResponse.json(
          { error: 'Failed to mark notification as read' },
          { status: 500 }
        )
      }
    } else if (action === 'mark_all_read') {
      // TODO: Get user ID from auth context
      const userId = body.user_id || 'placeholder-user-id'
      const result = await notificationService.markAllAsRead(userId)
      
      if (!result.success) {
        return NextResponse.json(
          { error: 'Failed to mark all notifications as read' },
          { status: 500 }
        )
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Supported actions: mark_read, mark_all_read' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      error: null
    })

  } catch (error) {
    console.error('Error in PATCH /api/notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
