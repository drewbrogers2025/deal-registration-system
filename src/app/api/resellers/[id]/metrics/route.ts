import { createServerComponentClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { CompanyMetricsSchema } from '@/lib/types'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerComponentClient()
    const resellerId = params.id
    const { searchParams } = new URL(request.url)
    
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const limit = parseInt(searchParams.get('limit') || '12') // Default to 12 months

    let query = supabase
      .from('company_metrics')
      .select(`
        *,
        reseller:resellers(name, email)
      `)
      .eq('reseller_id', resellerId)
      .order('metric_period', { ascending: false })

    if (startDate) {
      query = query.gte('metric_period', startDate)
    }

    if (endDate) {
      query = query.lte('metric_period', endDate)
    }

    if (!startDate && !endDate) {
      query = query.limit(limit)
    }

    const { data: metrics, error } = await query

    if (error) {
      console.error('Error fetching company metrics:', error)
      return NextResponse.json(
        { error: 'Failed to fetch metrics', details: error.message },
        { status: 500 }
      )
    }

    // Calculate summary statistics
    const summary = metrics.reduce((acc, metric) => {
      acc.totalDealsRegistered += metric.deals_registered
      acc.totalDealsWon += metric.deals_won
      acc.totalDealValue += metric.total_deal_value
      acc.periods += 1
      return acc
    }, {
      totalDealsRegistered: 0,
      totalDealsWon: 0,
      totalDealValue: 0,
      periods: 0
    })

    const avgWinRate = metrics.length > 0 
      ? metrics.reduce((sum, m) => sum + m.win_rate, 0) / metrics.length 
      : 0

    const avgDealSize = summary.totalDealsWon > 0 
      ? summary.totalDealValue / summary.totalDealsWon 
      : 0

    const avgTimeToClose = metrics.length > 0 
      ? metrics.reduce((sum, m) => sum + m.time_to_close_avg, 0) / metrics.length 
      : 0

    return NextResponse.json({ 
      data: {
        metrics,
        summary: {
          ...summary,
          avgWinRate: Math.round(avgWinRate * 100) / 100,
          avgDealSize: Math.round(avgDealSize * 100) / 100,
          avgTimeToClose: Math.round(avgTimeToClose)
        }
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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerComponentClient()
    const resellerId = params.id
    const body = await request.json()

    // Add reseller_id to the body
    const metricsData = { ...body, reseller_id: resellerId }

    // Validate request body
    const validation = CompanyMetricsSchema.safeParse(metricsData)
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

    // Check if metrics for this period already exist
    const { data: existingMetrics } = await supabase
      .from('company_metrics')
      .select('id')
      .eq('reseller_id', resellerId)
      .eq('metric_period', validatedData.metric_period)
      .single()

    if (existingMetrics) {
      return NextResponse.json(
        { error: 'Metrics for this period already exist. Use PUT to update.' },
        { status: 409 }
      )
    }

    const { data: insertedMetrics, error } = await supabase
      .from('company_metrics')
      .insert(validatedData)
      .select(`
        *,
        reseller:resellers(name, email)
      `)
      .single()

    if (error) {
      console.error('Error creating company metrics:', error)
      return NextResponse.json(
        { error: 'Failed to create metrics', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      data: insertedMetrics, 
      success: true 
    }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerComponentClient()
    const resellerId = params.id
    const body = await request.json()
    const { metricsId, metric_period, ...updateData } = body

    if (!metricsId && !metric_period) {
      return NextResponse.json(
        { error: 'Either metricsId or metric_period is required' },
        { status: 400 }
      )
    }

    // Validate update data
    const validation = CompanyMetricsSchema.partial().safeParse(updateData)
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

    let query = supabase
      .from('company_metrics')
      .update(validatedData)
      .eq('reseller_id', resellerId)

    if (metricsId) {
      query = query.eq('id', metricsId)
    } else {
      query = query.eq('metric_period', metric_period)
    }

    const { data: updatedMetrics, error } = await query
      .select(`
        *,
        reseller:resellers(name, email)
      `)
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return NextResponse.json(
          { error: 'Metrics record not found' },
          { status: 404 }
        )
      }
      console.error('Error updating company metrics:', error)
      return NextResponse.json(
        { error: 'Failed to update metrics', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      data: updatedMetrics, 
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
