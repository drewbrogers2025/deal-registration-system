import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerComponentClient()
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const territory = searchParams.get('territory') || ''
    
    const offset = (page - 1) * limit
    
    // Build query
    let query = supabase
      .from('end_users')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    // Apply filters
    if (search) {
      query = query.or(`company_name.ilike.%${search}%,contact_name.ilike.%${search}%,contact_email.ilike.%${search}%`)
    }
    
    if (territory) {
      query = query.eq('territory', territory)
    }
    
    const { data: endUsers, error, count } = await query
    
    if (error) {
      console.error('Error fetching end users:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch end users',
        details: error
      }, { status: 500 })
    }
    
    const totalPages = Math.ceil((count || 0) / limit)
    
    return NextResponse.json({
      success: true,
      data: {
        items: endUsers || [],
        total: count || 0,
        page,
        limit,
        totalPages
      },
      error: null
    })
    
  } catch (error) {
    console.error('Unexpected error in end-users API:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerComponentClient()
    const body = await request.json()
    
    // Validate required fields
    const { company_name, contact_name, contact_email, territory } = body
    
    if (!company_name || !contact_name || !contact_email || !territory) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: company_name, contact_name, contact_email, territory'
      }, { status: 400 })
    }
    
    // Check for duplicate company in same territory
    const { data: existing } = await supabase
      .from('end_users')
      .select('id')
      .eq('company_name', company_name)
      .eq('territory', territory)
      .single()
    
    if (existing) {
      return NextResponse.json({
        success: false,
        error: 'End user with this company name already exists in this territory'
      }, { status: 409 })
    }
    
    // Create new end user
    const { data: endUser, error } = await supabase
      .from('end_users')
      .insert([{
        company_name,
        contact_name,
        contact_email,
        territory
      }])
      .select()
      .single()
    
    if (error) {
      console.error('Error creating end user:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to create end user',
        details: error
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      data: endUser,
      error: null
    }, { status: 201 })
    
  } catch (error) {
    console.error('Unexpected error in end-users POST:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
