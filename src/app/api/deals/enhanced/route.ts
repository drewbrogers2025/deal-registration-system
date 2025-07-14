import { createServerComponentClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { EnhancedDealSchema } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerComponentClient()
    const { searchParams } = new URL(request.url)
    
    // Get query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const stage = searchParams.get('stage')
    const priority = searchParams.get('priority')
    const source = searchParams.get('source')
    const complexity = searchParams.get('complexity')
    const resellerId = searchParams.get('reseller_id')
    const includeRelations = searchParams.get('include_relations') === 'true'
    
    // Calculate offset
    const offset = (page - 1) * limit
    
    // Build select clause
    let selectClause = `
      *,
      reseller:resellers(
        *,
        contacts:reseller_contacts(*),
        territories:reseller_territories(*)
      ),
      end_user:end_users(*),
      assigned_reseller:resellers!assigned_reseller_id(*)
    `
    
    if (includeRelations) {
      selectClause += `,
        stage_history:deal_stage_history(*),
        activities:deal_activities(
          *,
          created_by_staff:staff_users(name, email),
          contact:reseller_contacts(first_name, last_name, email)
        ),
        attachments:deal_attachments(
          *,
          uploaded_by_staff:staff_users(name, email)
        ),
        competitors:deal_competitors(*),
        team_members:deal_team_members(
          *,
          staff_user:staff_users(*),
          added_by_staff:staff_users!added_by(name, email)
        ),
        forecasting:deal_forecasting(
          *,
          created_by_staff:staff_users(name, email)
        ),
        notifications:deal_notifications(*)
      `
    }
    
    // Build query
    let query = supabase
      .from('deals')
      .select(selectClause, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    // Apply filters
    if (search) {
      query = query.or(`
        deal_name.ilike.%${search}%,
        deal_description.ilike.%${search}%,
        reseller.name.ilike.%${search}%
      `)
    }
    
    if (stage) {
      query = query.eq('opportunity_stage', stage)
    }
    
    if (priority) {
      query = query.eq('deal_priority', priority)
    }
    
    if (source) {
      query = query.eq('deal_source', source)
    }
    
    if (complexity) {
      query = query.eq('deal_complexity', complexity)
    }
    
    if (resellerId) {
      query = query.eq('reseller_id', resellerId)
    }
    
    const { data: deals, error, count } = await query
    
    if (error) {
      console.error('Error fetching enhanced deals:', error)
      return NextResponse.json(
        { error: 'Failed to fetch deals', details: error.message },
        { status: 500 }
      )
    }
    
    // Calculate pagination info
    const totalPages = Math.ceil((count || 0) / limit)
    
    return NextResponse.json({
      data: deals,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
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

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerComponentClient()
    const body = await request.json()

    // Validate request body
    const validation = EnhancedDealSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data', 
          details: validation.error.issues 
        },
        { status: 400 }
      )
    }

    const dealData = validation.data

    // Start transaction-like operations
    // 1. Create or get end user
    let endUserId = dealData.end_user_id
    if (!endUserId && body.end_user) {
      const { data: endUser, error: endUserError } = await supabase
        .from('end_users')
        .insert(body.end_user)
        .select()
        .single()

      if (endUserError) {
        console.error('Error creating end user:', endUserError)
        return NextResponse.json(
          { error: 'Failed to create end user', details: endUserError.message },
          { status: 500 }
        )
      }
      endUserId = endUser.id
    }

    // 2. Create the deal
    const dealInsertData = {
      ...dealData,
      end_user_id: endUserId,
      submission_date: new Date().toISOString(),
    }

    const { data: insertedDeal, error: dealError } = await supabase
      .from('deals')
      .insert(dealInsertData)
      .select(`
        *,
        reseller:resellers(*),
        end_user:end_users(*),
        assigned_reseller:resellers!assigned_reseller_id(*)
      `)
      .single()

    if (dealError) {
      console.error('Error creating deal:', dealError)
      return NextResponse.json(
        { error: 'Failed to create deal', details: dealError.message },
        { status: 500 }
      )
    }

    // 3. Create deal products if provided
    if (body.products && body.products.length > 0) {
      const dealProducts = body.products.map((product: Record<string, unknown>) => ({
        ...product,
        deal_id: insertedDeal.id,
      }))

      const { error: productsError } = await supabase
        .from('deal_products')
        .insert(dealProducts)

      if (productsError) {
        console.error('Error creating deal products:', productsError)
        // Note: In a real transaction, we'd rollback the deal creation here
      }
    }

    // 4. Create initial deal activity
    const { error: activityError } = await supabase
      .from('deal_activities')
      .insert({
        deal_id: insertedDeal.id,
        activity_type: 'deal_created',
        activity_subject: 'Deal Created',
        activity_description: `Deal was created`,
        outcome: 'positive',
        created_by: body.created_by, // Should come from auth context
      })

    if (activityError) {
      console.error('Error creating initial activity:', activityError)
      // Non-critical, continue
    }

    // 5. Create initial stage history entry
    const { error: stageError } = await supabase
      .from('deal_stage_history')
      .insert({
        deal_id: insertedDeal.id,
        from_stage: null,
        to_stage: 'lead',
        changed_by: body.created_by,
        change_reason: 'Initial deal creation',
      })

    if (stageError) {
      console.error('Error creating stage history:', stageError)
      // Non-critical, continue
    }

    return NextResponse.json({ 
      data: insertedDeal, 
      success: true,
      message: 'Enhanced deal created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Unexpected error during deal creation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerComponentClient()
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Deal ID is required' },
        { status: 400 }
      )
    }

    // Validate update data
    const validation = EnhancedDealSchema.partial().safeParse(updateData)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data', 
          details: validation.error.issues 
        },
        { status: 400 }
      )
    }

    const validatedData = validation.data

    // Get current deal for stage change tracking
    const { data: _currentDeal } = await supabase
      .from('deals')
      .select('opportunity_stage')
      .eq('id', id)
      .single()

    const { data: updatedDeal, error } = await supabase
      .from('deals')
      .update(validatedData)
      .eq('id', id)
      .select(`
        *,
        reseller:resellers(*),
        end_user:end_users(*),
        assigned_reseller:resellers!assigned_reseller_id(*)
      `)
      .single()

    if (error) {
      console.error('Error updating deal:', error)
      return NextResponse.json(
        { error: 'Failed to update deal', details: error.message },
        { status: 500 }
      )
    }

    // Create activity for the update
    const { error: activityError } = await supabase
      .from('deal_activities')
      .insert({
        deal_id: id,
        activity_type: 'deal_updated',
        activity_subject: 'Deal Updated',
        activity_description: `Deal "${updatedDeal.deal_name}" was updated`,
        outcome: 'neutral',
        created_by: body.updated_by,
      })

    if (activityError) {
      console.error('Error creating update activity:', activityError)
    }

    return NextResponse.json({ 
      data: updatedDeal, 
      success: true,
      message: 'Deal updated successfully'
    })

  } catch (error) {
    console.error('Unexpected error during deal update:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
