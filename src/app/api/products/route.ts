import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'
import { ProductSchema, ProductCatalogFilterSchema } from '@/lib/types'
import { pricingEngine } from '@/lib/pricing'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerComponentClient()
    const { searchParams } = new URL(request.url)

    // Parse and validate query parameters
    const filterParams = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      category_id: searchParams.get('category_id') || undefined,
      status: searchParams.get('status') || undefined,
      search: searchParams.get('search') || undefined,
      tags: searchParams.get('tags')?.split(',') || undefined,
      min_price: searchParams.get('min_price') ? parseFloat(searchParams.get('min_price')!) : undefined,
      max_price: searchParams.get('max_price') ? parseFloat(searchParams.get('max_price')!) : undefined,
      reseller_tier: searchParams.get('reseller_tier') || undefined,
      territory: searchParams.get('territory') || undefined,
      sort_by: searchParams.get('sort_by') || 'name',
      sort_order: searchParams.get('sort_order') || 'asc',
      include_pricing: searchParams.get('include_pricing') === 'true',
      reseller_id: searchParams.get('reseller_id') || undefined,
      quantity: searchParams.get('quantity') ? parseInt(searchParams.get('quantity')!) : 1,
    }

    // Validate filters
    const validation = ProductCatalogFilterSchema.safeParse(filterParams)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid filter parameters',
          details: validation.error.issues
        },
        { status: 400 }
      )
    }

    const filters = validation.data
    const offset = (filters.page - 1) * filters.limit

    // Build base query with enhanced selection
    let query = supabase
      .from('products')
      .select(`
        *,
        category:product_categories(id, name, description),
        pricing_tiers:product_pricing_tiers(*),
        volume_discounts(*),
        deal_registration_pricing(*),
        territory_pricing(*),
        promotional_pricing(*)
      `)
      .eq('status', filters.status || 'active')
      .range(offset, offset + filters.limit - 1)

    // Apply filters
    if (filters.category_id) {
      query = query.eq('category_id', filters.category_id)
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`)
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags)
    }

    if (filters.min_price !== undefined) {
      query = query.gte('list_price', filters.min_price)
    }

    if (filters.max_price !== undefined) {
      query = query.lte('list_price', filters.max_price)
    }

    // Apply sorting
    const sortOrder = filters.sort_order === 'desc' ? { ascending: false } : { ascending: true }
    query = query.order(filters.sort_by, sortOrder)

    const { data: products, error } = await query
    
    if (error) {
      console.error('Error fetching products:', error)
      return NextResponse.json(
        { error: 'Failed to fetch products', details: error.message },
        { status: 500 }
      )
    }

    // Process products with pricing and availability if requested
    let processedProducts = products || []

    if (filterParams.include_pricing && processedProducts.length > 0) {
      processedProducts = await Promise.all(
        processedProducts.map(async (product) => {
          try {
            // Calculate pricing if context is provided
            const pricingContext = {
              reseller_tier: filters.reseller_tier,
              territory: filters.territory,
              quantity: filterParams.quantity,
              is_deal_registration: false,
              calculation_date: new Date().toISOString(),
            }

            const [pricingResult, availability] = await Promise.all([
              pricingEngine.calculatePrice(product.id, pricingContext),
              pricingEngine.checkProductAvailability(
                product.id,
                filterParams.reseller_id,
                filters.territory,
                filters.reseller_tier
              )
            ])

            return {
              ...product,
              calculated_price: pricingResult,
              availability: availability,
            }
          } catch (pricingError) {
            console.warn(`Pricing calculation failed for product ${product.id}:`, pricingError)
            return {
              ...product,
              calculated_price: null,
              availability: { available: true },
            }
          }
        })
      )
    }

    // Get total count for pagination with same filters
    let countQuery = supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('status', filters.status || 'active')

    if (filters.category_id) {
      countQuery = countQuery.eq('category_id', filters.category_id)
    }

    if (filters.search) {
      countQuery = countQuery.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`)
    }

    if (filters.tags && filters.tags.length > 0) {
      countQuery = countQuery.overlaps('tags', filters.tags)
    }

    if (filters.min_price !== undefined) {
      countQuery = countQuery.gte('list_price', filters.min_price)
    }

    if (filters.max_price !== undefined) {
      countQuery = countQuery.lte('list_price', filters.max_price)
    }

    const { count: totalCount } = await countQuery

    return NextResponse.json({
      data: {
        items: processedProducts,
        total: totalCount || 0,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil((totalCount || 0) / filters.limit),
        filters: filters,
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
