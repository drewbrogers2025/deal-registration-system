import { NextRequest, NextResponse } from 'next/server'
import { PricingContextSchema } from '@/lib/types'
import { pricingEngine } from '@/lib/pricing'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request body
    const validation = PricingContextSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid pricing context', 
          details: validation.error.issues 
        },
        { status: 400 }
      )
    }

    const { product_ids, ...context } = body

    if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
      return NextResponse.json(
        { error: 'product_ids array is required' },
        { status: 400 }
      )
    }

    // Calculate pricing for all requested products
    const pricingResults = await Promise.allSettled(
      product_ids.map(async (productId: string) => {
        const [pricing, availability] = await Promise.all([
          pricingEngine.calculatePrice(productId, context),
          pricingEngine.checkProductAvailability(
            productId,
            context.reseller_id,
            context.territory,
            context.reseller_tier
          )
        ])

        return {
          product_id: productId,
          pricing,
          availability,
        }
      })
    )

    // Process results
    const successfulResults: Array<{
      product_id: string
      pricing: any
      availability: any
    }> = []
    const errors: Array<{
      product_id: string
      error: string
    }> = []

    pricingResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successfulResults.push(result.value)
      } else {
        errors.push({
          product_id: product_ids[index],
          error: result.reason?.message || 'Unknown error'
        })
      }
    })

    return NextResponse.json({
      data: {
        pricing_results: successfulResults,
        errors: errors.length > 0 ? errors : undefined,
      },
      success: true,
      error: null
    })

  } catch (error) {
    console.error('Unexpected error in pricing calculation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint for single product pricing
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const productId = searchParams.get('product_id')
    if (!productId) {
      return NextResponse.json(
        { error: 'product_id parameter is required' },
        { status: 400 }
      )
    }

    // Parse pricing context from query parameters
    const context = {
      reseller_id: searchParams.get('reseller_id') || undefined,
      reseller_tier: searchParams.get('reseller_tier') || undefined,
      territory: searchParams.get('territory') || undefined,
      quantity: parseInt(searchParams.get('quantity') || '1'),
      deal_value: searchParams.get('deal_value') ? parseFloat(searchParams.get('deal_value')!) : undefined,
      is_deal_registration: searchParams.get('is_deal_registration') === 'true',
      calculation_date: searchParams.get('calculation_date') || new Date().toISOString(),
    }

    // Validate context
    const validation = PricingContextSchema.safeParse(context)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid pricing context', 
          details: validation.error.issues 
        },
        { status: 400 }
      )
    }

    const validatedContext = validation.data

    // Calculate pricing and check availability
    const [pricing, availability] = await Promise.all([
      pricingEngine.calculatePrice(productId, validatedContext),
      pricingEngine.checkProductAvailability(
        productId,
        validatedContext.reseller_id,
        validatedContext.territory,
        validatedContext.reseller_tier
      )
    ])

    return NextResponse.json({
      data: {
        product_id: productId,
        pricing,
        availability,
        context: validatedContext,
      },
      success: true,
      error: null
    })

  } catch (error) {
    console.error('Unexpected error in pricing calculation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
