import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'
import { ProductPricingTierSchema } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerComponentClient()
    const { searchParams } = new URL(request.url)
    
    const productId = searchParams.get('product_id')
    const tierType = searchParams.get('tier_type')
    const resellerTier = searchParams.get('reseller_tier')
    const territory = searchParams.get('territory')
    const activeOnly = searchParams.get('active_only') !== 'false'

    let query = supabase
      .from('product_pricing_tiers')
      .select(`
        *,
        product:products(id, name, sku)
      `)
      .order('tier_type', { ascending: true })
      .order('tier_name', { ascending: true })

    if (productId) {
      query = query.eq('product_id', productId)
    }

    if (tierType) {
      query = query.eq('tier_type', tierType)
    }

    if (resellerTier) {
      query = query.eq('reseller_tier', resellerTier)
    }

    if (territory) {
      query = query.eq('territory', territory)
    }

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data: pricingTiers, error } = await query

    if (error) {
      console.error('Error fetching pricing tiers:', error)
      return NextResponse.json(
        { error: 'Failed to fetch pricing tiers', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: {
        items: pricingTiers || [],
        total: pricingTiers?.length || 0
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
    const validation = ProductPricingTierSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data', 
          details: validation.error.issues 
        },
        { status: 400 }
      )
    }

    const tierData = validation.data

    // Check if product exists
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id')
      .eq('id', tierData.product_id)
      .single()

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 400 }
      )
    }

    // Check for duplicate tier
    const { data: existingTier } = await supabase
      .from('product_pricing_tiers')
      .select('id')
      .eq('product_id', tierData.product_id)
      .eq('tier_type', tierData.tier_type)
      .eq('tier_name', tierData.tier_name)
      .single()

    if (existingTier) {
      return NextResponse.json(
        { error: 'Pricing tier with this name already exists for this product' },
        { status: 400 }
      )
    }

    const { data: insertedTier, error } = await supabase
      .from('product_pricing_tiers')
      .insert(tierData)
      .select(`
        *,
        product:products(id, name, sku)
      `)
      .single()

    if (error) {
      console.error('Error creating pricing tier:', error)
      return NextResponse.json(
        { error: 'Failed to create pricing tier', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: insertedTier,
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
