import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'
import { SaveDraftSchema } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerComponentClient()
    const { searchParams } = new URL(request.url)
    const resellerId = searchParams.get('reseller_id')

    if (!resellerId) {
      return NextResponse.json(
        { error: 'Reseller ID is required' },
        { status: 400 }
      )
    }

    // Get drafts for the reseller
    const { data: drafts, error } = await supabase
      .from('deal_drafts')
      .select('*')
      .eq('reseller_id', resellerId)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching drafts:', error)
      return NextResponse.json(
        { error: 'Failed to fetch drafts', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: drafts,
      success: true,
      error: null
    })

  } catch (error) {
    console.error('Error in GET /api/deals/drafts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerComponentClient()
    const body = await request.json()

    // Validate request body
    const validation = SaveDraftSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data', 
          details: validation.error.issues 
        },
        { status: 400 }
      )
    }

    const { reseller_id, step_completed, draft_data } = validation.data

    // Check if draft already exists for this reseller
    const { data: existingDraft } = await supabase
      .from('deal_drafts')
      .select('id')
      .eq('reseller_id', reseller_id)
      .single()

    let result

    if (existingDraft) {
      // Update existing draft
      const { data: updatedDraft, error: updateError } = await supabase
        .from('deal_drafts')
        .update({
          draft_data,
          step_completed,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingDraft.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating draft:', updateError)
        return NextResponse.json(
          { error: 'Failed to update draft', details: updateError.message },
          { status: 500 }
        )
      }

      result = updatedDraft
    } else {
      // Create new draft
      const { data: newDraft, error: createError } = await supabase
        .from('deal_drafts')
        .insert({
          reseller_id,
          draft_data,
          step_completed
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating draft:', createError)
        return NextResponse.json(
          { error: 'Failed to create draft', details: createError.message },
          { status: 500 }
        )
      }

      result = newDraft
    }

    return NextResponse.json({
      data: result,
      success: true,
      error: null
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/deals/drafts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerComponentClient()
    const { searchParams } = new URL(request.url)
    const draftId = searchParams.get('id')
    const resellerId = searchParams.get('reseller_id')

    if (!draftId && !resellerId) {
      return NextResponse.json(
        { error: 'Draft ID or Reseller ID is required' },
        { status: 400 }
      )
    }

    let query = supabase.from('deal_drafts').delete()

    if (draftId) {
      query = query.eq('id', draftId)
    } else if (resellerId) {
      query = query.eq('reseller_id', resellerId)
    }

    const { error } = await query

    if (error) {
      console.error('Error deleting draft:', error)
      return NextResponse.json(
        { error: 'Failed to delete draft', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      error: null
    })

  } catch (error) {
    console.error('Error in DELETE /api/deals/drafts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
