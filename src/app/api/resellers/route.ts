import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'
import { ResellerSchema } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerComponentClient()
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const territory = searchParams.get('territory')
    const tier = searchParams.get('tier')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    
    const offset = (page - 1) * limit
    
    // Build query
    let query = supabase
      .from('resellers')
      .select('*')
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1)
    
    // Apply filters
    if (territory) {
      query = query.eq('territory', territory)
    }
    
    if (tier) {
      query = query.eq('tier', tier)
    }
    
    if (status) {
      query = query.eq('status', status)
    }
    
    if (search) {
      query = query.ilike('name', `%${search}%`)
    }
    
    const { data: resellers, error, count } = await query
    
    if (error) {
      console.error('Error fetching resellers:', error)
      return NextResponse.json(
        { error: 'Failed to fetch resellers', details: error.message },
        { status: 500 }
      )
    }
    
    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('resellers')
      .select('*', { count: 'exact', head: true })
    
    return NextResponse.json({
      data: {
        items: resellers || [],
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
    const validation = ResellerSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data', 
          details: validation.error.issues 
        },
        { status: 400 }
      )
    }
    
    const resellerData = validation.data
    
    const { data: insertedReseller, error } = await supabase
      .from('resellers')
      .insert(resellerData)
      .select()
      .single()
    
    if (error) {
      console.error('Error creating reseller:', error)
      return NextResponse.json(
        { error: 'Failed to create reseller', details: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      data: insertedReseller,
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
