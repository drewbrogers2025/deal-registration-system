import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'
import { CreateCommentSchema } from '@/lib/types'
import { NotificationService } from '@/lib/notification-service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerComponentClient()
    const resolvedParams = await params
    const dealId = resolvedParams.id

    // Get comments for the deal
    const { data: comments, error } = await supabase
      .from('deal_comments')
      .select(`
        *,
        author:staff_users(name, email, role),
        replies:deal_comments!parent_comment_id(
          *,
          author:staff_users(name, email, role)
        )
      `)
      .eq('deal_id', dealId)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching comments:', error)
      return NextResponse.json(
        { error: 'Failed to fetch comments', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: comments || [],
      success: true,
      error: null
    })

  } catch (error) {
    console.error('Error in GET /api/deals/[id]/comments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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
    const validation = CreateCommentSchema.safeParse({
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

    const { content, is_internal, parent_comment_id } = validation.data

    // TODO: Get author ID from auth context
    const authorId = body.author_id || 'placeholder-author-id'

    // Verify deal exists
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('id')
      .eq('id', dealId)
      .single()

    if (dealError || !deal) {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      )
    }

    // Create comment
    const { data: comment, error: commentError } = await supabase
      .from('deal_comments')
      .insert({
        deal_id: dealId,
        author_id: authorId,
        content,
        is_internal: is_internal || false,
        parent_comment_id,
        created_at: new Date().toISOString()
      })
      .select(`
        *,
        author:staff_users(name, email, role)
      `)
      .single()

    if (commentError) {
      console.error('Error creating comment:', commentError)
      return NextResponse.json(
        { error: 'Failed to create comment', details: commentError.message },
        { status: 500 }
      )
    }

    // Send notification about new comment
    const notificationService = new NotificationService()
    await notificationService.notifyCommentAdded(
      dealId, 
      content, 
      comment.author?.name || 'Unknown User'
    )

    return NextResponse.json({
      data: comment,
      success: true,
      error: null
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/deals/[id]/comments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerComponentClient()
    const body = await request.json()
    const resolvedParams = await params
    const dealId = resolvedParams.id
    const { comment_id, content } = body

    if (!comment_id || !content) {
      return NextResponse.json(
        { error: 'Comment ID and content are required' },
        { status: 400 }
      )
    }

    // TODO: Verify user can edit this comment (author or admin)
    
    // Update comment
    const { data: comment, error } = await supabase
      .from('deal_comments')
      .update({
        content,
        updated_at: new Date().toISOString()
      })
      .eq('id', comment_id)
      .eq('deal_id', dealId)
      .select(`
        *,
        author:staff_users(name, email, role)
      `)
      .single()

    if (error) {
      console.error('Error updating comment:', error)
      return NextResponse.json(
        { error: 'Failed to update comment', details: error.message },
        { status: 500 }
      )
    }

    if (!comment) {
      return NextResponse.json(
        { error: 'Comment not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      data: comment,
      success: true,
      error: null
    })

  } catch (error) {
    console.error('Error in PUT /api/deals/[id]/comments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerComponentClient()
    const { searchParams } = new URL(request.url)
    const resolvedParams = await params
    const dealId = resolvedParams.id
    const commentId = searchParams.get('comment_id')

    if (!commentId) {
      return NextResponse.json(
        { error: 'Comment ID is required' },
        { status: 400 }
      )
    }

    // TODO: Verify user can delete this comment (author or admin)
    
    // Delete comment (this will cascade to replies due to foreign key)
    const { error } = await supabase
      .from('deal_comments')
      .delete()
      .eq('id', commentId)
      .eq('deal_id', dealId)

    if (error) {
      console.error('Error deleting comment:', error)
      return NextResponse.json(
        { error: 'Failed to delete comment', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      error: null
    })

  } catch (error) {
    console.error('Error in DELETE /api/deals/[id]/comments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
