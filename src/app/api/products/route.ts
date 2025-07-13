import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'
import { ProductSchema } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerComponentClient()
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    
    const offset = (page - 1) * limit
    
    // Build query
    let query = supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1)
    
    // Apply filters
    if (category) {
      query = query.eq('category', category)
    }
    
    if (search) {
      query = query.ilike('name', `%${search}%`)
    }
    
    const { data: products, error, count } = await query
    
    if (error) {
      console.error('Error fetching products:', error)
      return NextResponse.json(
        { error: 'Failed to fetch products', details: error.message },
        { status: 500 }
      )
    }
    
    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
    
    return NextResponse.json({
      data: {
        items: products || [],
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
    const validation = ProductSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data', 
          details: validation.error.issues 
        },
        { status: 400 }
      )
    }
    
    const productData = validation.data
    
    const { data: insertedProduct, error } = await supabase
      .from('products')
      .insert(productData)
      .select()
      .single()
    
    if (error) {
      console.error('Error creating product:', error)
      return NextResponse.json(
        { error: 'Failed to create product', details: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      data: insertedProduct,
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
