import { NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = createServerComponentClient()
    
    // Get deal counts by status
    const { data: dealCounts, error: dealCountsError } = await supabase
      .from('deals')
      .select('status')
      .then(({ data, error }) => {
        if (error) return { data: null, error }
        
        const counts = {
          total: data?.length || 0,
          pending: data?.filter(d => d.status === 'pending').length || 0,
          assigned: data?.filter(d => d.status === 'assigned').length || 0,
          disputed: data?.filter(d => d.status === 'disputed').length || 0,
          approved: data?.filter(d => d.status === 'approved').length || 0,
          rejected: data?.filter(d => d.status === 'rejected').length || 0
        }
        
        return { data: counts, error: null }
      })
    
    if (dealCountsError) {
      console.error('Error fetching deal counts:', dealCountsError)
      return NextResponse.json(
        { error: 'Failed to fetch deal metrics' },
        { status: 500 }
      )
    }
    
    // Get conflict counts
    const { data: conflictCounts, error: conflictCountsError } = await supabase
      .from('deal_conflicts')
      .select('resolution_status')
      .then(({ data, error }) => {
        if (error) return { data: null, error }
        
        const counts = {
          total: data?.length || 0,
          pending: data?.filter(c => c.resolution_status === 'pending').length || 0,
          resolved: data?.filter(c => c.resolution_status === 'resolved').length || 0,
          dismissed: data?.filter(c => c.resolution_status === 'dismissed').length || 0
        }
        
        return { data: counts, error: null }
      })
    
    if (conflictCountsError) {
      console.error('Error fetching conflict counts:', conflictCountsError)
      return NextResponse.json(
        { error: 'Failed to fetch conflict metrics' },
        { status: 500 }
      )
    }
    
    // Get total deal value
    const { data: totalValueData, error: totalValueError } = await supabase
      .from('deals')
      .select('total_value')
      .not('status', 'eq', 'rejected')
    
    if (totalValueError) {
      console.error('Error fetching total value:', totalValueError)
      return NextResponse.json(
        { error: 'Failed to fetch value metrics' },
        { status: 500 }
      )
    }
    
    const totalValue = totalValueData?.reduce((sum, deal) => sum + Number(deal.total_value), 0) || 0
    
    // Get average resolution time (simplified calculation)
    const { data: resolvedConflicts, error: resolutionTimeError } = await supabase
      .from('deal_conflicts')
      .select('created_at, updated_at')
      .eq('resolution_status', 'resolved')
      .limit(100) // Sample for performance
    
    let avgResolutionTime = 0
    if (!resolutionTimeError && resolvedConflicts && resolvedConflicts.length > 0) {
      const totalResolutionTime = resolvedConflicts.reduce((sum, conflict) => {
        const created = new Date(conflict.created_at)
        const resolved = new Date(conflict.updated_at)
        const diffDays = (resolved.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
        return sum + diffDays
      }, 0)
      
      avgResolutionTime = totalResolutionTime / resolvedConflicts.length
    }
    
    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { data: recentDeals } = await supabase
      .from('deals')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
    
    const recentDealsCount = recentDeals?.length || 0
    
    // Calculate growth percentage (simplified)
    const growthPercentage = Math.floor(Math.random() * 20) + 5 // Mock data for now
    
    const metrics = {
      deals: {
        total: dealCounts?.total || 0,
        pending: dealCounts?.pending || 0,
        assigned: dealCounts?.assigned || 0,
        disputed: dealCounts?.disputed || 0,
        approved: dealCounts?.approved || 0,
        rejected: dealCounts?.rejected || 0,
        recent: recentDealsCount,
        growth: growthPercentage
      },
      conflicts: {
        total: conflictCounts?.total || 0,
        pending: conflictCounts?.pending || 0,
        resolved: conflictCounts?.resolved || 0,
        dismissed: conflictCounts?.dismissed || 0,
        avgResolutionTime: Math.round(avgResolutionTime * 10) / 10
      },
      financial: {
        totalValue,
        avgDealValue: dealCounts?.total ? totalValue / dealCounts.total : 0,
        growth: growthPercentage
      },
      activity: {
        recentDeals: recentDealsCount,
        activeConflicts: conflictCounts?.pending || 0,
        assignmentsPending: dealCounts?.pending || 0
      }
    }
    
    return NextResponse.json({
      data: metrics,
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
