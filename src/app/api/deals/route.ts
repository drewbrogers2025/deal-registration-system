import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'
import { CreateDealSchema } from '@/lib/types'
import { ConflictDetectionEngine } from '@/lib/conflict-detection'
import { mockDeals } from '@/lib/mock-data'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerComponentClient()
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const reseller_id = searchParams.get('reseller_id')
    const territory = searchParams.get('territory')
    const has_conflicts = searchParams.get('has_conflicts')
    
    const offset = (page - 1) * limit
    
    // Build query
    let query = supabase
      .from('deals')
      .select(`
        *,
        reseller:resellers!deals_reseller_id_fkey(*),
        end_user:end_users(*),
        assigned_reseller:resellers!deals_assigned_reseller_id_fkey(*),
        products:deal_products(
          *,
          product:products(*)
        ),
        conflicts:deal_conflicts!deal_conflicts_deal_id_fkey(
          *,
          competing_deal:deals!deal_conflicts_competing_deal_id_fkey(
            *,
            reseller:resellers!deals_reseller_id_fkey(*),
            end_user:end_users(*)
          )
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    
    if (reseller_id) {
      query = query.eq('reseller_id', reseller_id)
    }
    
    if (territory) {
      query = query.eq('end_users.territory', territory)
    }
    
    if (has_conflicts === 'true') {
      query = query.not('conflicts', 'is', null)
    }
    
    const { data: deals, error, count } = await query
    
    if (error) {
      console.error('Error fetching deals:', error)
      return NextResponse.json(
        { error: 'Failed to fetch deals', details: error.message },
        { status: 500 }
      )
    }
    
    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })
    
    return NextResponse.json({
      data: {
        items: deals || [],
        total: totalCount || 0,
        page,
        limit,
        totalPages: Math.ceil((totalCount || 0) / limit)
      },
      success: true,
      error: null
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
    const validation = CreateDealSchema.safeParse(body)
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
    
    // Start transaction
    const { data: insertedEndUser, error: endUserError } = await supabase
      .from('end_users')
      .upsert({
        id: dealData.end_user.id,
        company_name: dealData.end_user.company_name,
        contact_name: dealData.end_user.contact_name,
        contact_email: dealData.end_user.contact_email,
        territory: dealData.end_user.territory
      })
      .select()
      .single()
    
    if (endUserError) {
      console.error('Error creating/updating end user:', endUserError)
      return NextResponse.json(
        { error: 'Failed to create end user', details: endUserError.message },
        { status: 500 }
      )
    }
    
    // Calculate total value
    const totalValue = dealData.products.reduce(
      (sum, product) => sum + (product.quantity * product.price), 
      0
    )
    
    // Create deal
    const { data: insertedDeal, error: dealError } = await supabase
      .from('deals')
      .insert({
        reseller_id: dealData.reseller_id,
        end_user_id: insertedEndUser.id,
        total_value: totalValue,
        status: 'pending'
      })
      .select()
      .single()
    
    if (dealError) {
      console.error('Error creating deal:', dealError)
      return NextResponse.json(
        { error: 'Failed to create deal', details: dealError.message },
        { status: 500 }
      )
    }
    
    // Create deal products
    const dealProducts = dealData.products.map(product => ({
      deal_id: insertedDeal.id,
      product_id: product.product_id,
      quantity: product.quantity,
      price: product.price
    }))
    
    const { error: productsError } = await supabase
      .from('deal_products')
      .insert(dealProducts)
    
    if (productsError) {
      console.error('Error creating deal products:', productsError)
      // Rollback deal creation
      await supabase.from('deals').delete().eq('id', insertedDeal.id)
      return NextResponse.json(
        { error: 'Failed to create deal products', details: productsError.message },
        { status: 500 }
      )
    }
    
    // Detect conflicts
    const conflictEngine = new ConflictDetectionEngine()
    const conflictResult = await conflictEngine.detectConflicts({
      end_user: insertedEndUser,
      reseller_id: dealData.reseller_id,
      total_value: totalValue,
      submission_date: insertedDeal.created_at
    })
    
    // Create conflict records if any
    if (conflictResult.hasConflicts) {
      await conflictEngine.createConflictRecords(insertedDeal.id, conflictResult.conflicts)
      
      // Update deal status to disputed if high-severity conflicts
      const hasHighSeverityConflicts = conflictResult.conflicts.some(c => c.severity === 'high')
      if (hasHighSeverityConflicts) {
        await supabase
          .from('deals')
          .update({ status: 'disputed' })
          .eq('id', insertedDeal.id)
      }
    }
    
    // Fetch the complete deal with relationships
    const { data: completeDeal, error: fetchError } = await supabase
      .from('deals')
      .select(`
        *,
        reseller:resellers(*),
        end_user:end_users(*),
        products:deal_products(
          *,
          product:products(*)
        ),
        conflicts:deal_conflicts(
          *,
          competing_deal:deals!deal_conflicts_competing_deal_id_fkey(
            *,
            reseller:resellers(*),
            end_user:end_users(*)
          )
        )
      `)
      .eq('id', insertedDeal.id)
      .single()
    
    if (fetchError) {
      console.error('Error fetching complete deal:', fetchError)
      return NextResponse.json(
        { error: 'Deal created but failed to fetch details', details: fetchError.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      data: {
        deal: completeDeal,
        conflicts: conflictResult
      },
      success: true,
      error: null
    }, { status: 201 })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
