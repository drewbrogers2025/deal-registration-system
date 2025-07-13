import { createAdminClient } from './supabase'
import { 
  normalizeCompanyName, 
  calculateSimilarity, 
  checkTerritoryOverlap, 
  isDealValueSimilar, 
  isWithinTimeWindow 
} from './utils'
import type { Deal, EndUser, DealConflict, ConflictType } from './types'

export interface ConflictDetectionResult {
  hasConflicts: boolean
  conflicts: DetectedConflict[]
  suggestions: string[]
}

export interface DetectedConflict {
  type: ConflictType
  severity: 'high' | 'medium' | 'low'
  conflictingDeal: Deal & { end_user: EndUser }
  reason: string
  similarity?: number
}

export class ConflictDetectionEngine {
  private supabase = createAdminClient()

  async detectConflicts(
    newDeal: {
      end_user: EndUser
      reseller_id: string
      total_value: number
      submission_date?: string
    }
  ): Promise<ConflictDetectionResult> {
    const conflicts: DetectedConflict[] = []
    const suggestions: string[] = []

    try {
      // Get existing deals for comparison
      const { data: existingDeals, error } = await this.supabase
        .from('deals')
        .select(`
          *,
          end_user:end_users(*),
          reseller:resellers(*)
        `)
        .neq('status', 'rejected')
        .order('created_at', { ascending: false })
        .limit(1000) // Reasonable limit for performance

      if (error) {
        console.error('Error fetching existing deals:', error)
        return { hasConflicts: false, conflicts: [], suggestions: [] }
      }

      if (!existingDeals) {
        return { hasConflicts: false, conflicts: [], suggestions: [] }
      }

      // Check each existing deal for conflicts
      for (const existingDeal of existingDeals) {
        const detectedConflicts = await this.checkDealConflicts(newDeal, existingDeal)
        conflicts.push(...detectedConflicts)
      }

      // Generate suggestions based on conflicts
      if (conflicts.length > 0) {
        suggestions.push(...this.generateSuggestions(conflicts))
      }

      return {
        hasConflicts: conflicts.length > 0,
        conflicts: this.prioritizeConflicts(conflicts),
        suggestions
      }
    } catch (error) {
      console.error('Conflict detection error:', error)
      return { hasConflicts: false, conflicts: [], suggestions: [] }
    }
  }

  private async checkDealConflicts(
    newDeal: {
      end_user: EndUser
      reseller_id: string
      total_value: number
      submission_date?: string
    },
    existingDeal: any
  ): Promise<DetectedConflict[]> {
    const conflicts: DetectedConflict[] = []

    // 1. Duplicate End User Detection
    const endUserConflict = this.checkEndUserConflict(newDeal, existingDeal)
    if (endUserConflict) {
      conflicts.push(endUserConflict)
    }

    // 2. Territory Overlap Detection
    const territoryConflict = this.checkTerritoryConflict(newDeal, existingDeal)
    if (territoryConflict) {
      conflicts.push(territoryConflict)
    }

    // 3. Timing Conflict Detection
    const timingConflict = this.checkTimingConflict(newDeal, existingDeal)
    if (timingConflict) {
      conflicts.push(timingConflict)
    }

    return conflicts
  }

  private checkEndUserConflict(newDeal: any, existingDeal: any): DetectedConflict | null {
    const newCompany = normalizeCompanyName(newDeal.end_user.company_name)
    const existingCompany = normalizeCompanyName(existingDeal.end_user.company_name)
    
    // Calculate similarity
    const similarity = calculateSimilarity(newCompany, existingCompany)
    
    // High similarity threshold for company names
    if (similarity >= 0.85) {
      // Check email similarity for additional confirmation
      const emailSimilarity = calculateSimilarity(
        newDeal.end_user.contact_email.toLowerCase(),
        existingDeal.end_user.contact_email.toLowerCase()
      )

      let severity: 'high' | 'medium' | 'low' = 'medium'
      let reason = `Similar company name: "${newDeal.end_user.company_name}" vs "${existingDeal.end_user.company_name}"`

      // Exact match or very high similarity
      if (similarity >= 0.95 || emailSimilarity >= 0.8) {
        severity = 'high'
        reason = `Potential duplicate: ${reason}`
      }
      // Same reseller submitting for same end user
      else if (newDeal.reseller_id === existingDeal.reseller_id) {
        severity = 'high'
        reason = `Same reseller submitting for same end user: ${reason}`
      }

      return {
        type: 'duplicate_end_user',
        severity,
        conflictingDeal: existingDeal,
        reason,
        similarity
      }
    }

    return null
  }

  private checkTerritoryConflict(newDeal: any, existingDeal: any): DetectedConflict | null {
    // Skip if same reseller
    if (newDeal.reseller_id === existingDeal.reseller_id) {
      return null
    }

    const hasOverlap = checkTerritoryOverlap(
      newDeal.end_user.territory,
      existingDeal.end_user.territory
    )

    if (hasOverlap) {
      // Check if it's the same end user (higher severity)
      const companysimilarity = calculateSimilarity(
        normalizeCompanyName(newDeal.end_user.company_name),
        normalizeCompanyName(existingDeal.end_user.company_name)
      )

      const severity: 'high' | 'medium' | 'low' = companysimilarity >= 0.7 ? 'high' : 'medium'

      return {
        type: 'territory_overlap',
        severity,
        conflictingDeal: existingDeal,
        reason: `Territory overlap: "${newDeal.end_user.territory}" overlaps with "${existingDeal.end_user.territory}"`
      }
    }

    return null
  }

  private checkTimingConflict(newDeal: any, existingDeal: any): DetectedConflict | null {
    const newDate = newDeal.submission_date || new Date().toISOString()
    const existingDate = existingDeal.submission_date || existingDeal.created_at

    // Check if within time window (default 90 days)
    if (!isWithinTimeWindow(newDate, existingDate, 90)) {
      return null
    }

    // Check if similar deal value and same end user
    const companysimilarity = calculateSimilarity(
      normalizeCompanyName(newDeal.end_user.company_name),
      normalizeCompanyName(existingDeal.end_user.company_name)
    )

    const valueSimilarity = isDealValueSimilar(newDeal.total_value, existingDeal.total_value, 0.2)

    if (companysimilarity >= 0.7 && valueSimilarity) {
      const daysDiff = Math.abs(
        (new Date(newDate).getTime() - new Date(existingDate).getTime()) / (1000 * 60 * 60 * 24)
      )

      let severity: 'high' | 'medium' | 'low' = 'low'
      if (daysDiff <= 7) severity = 'high'
      else if (daysDiff <= 30) severity = 'medium'

      return {
        type: 'timing_conflict',
        severity,
        conflictingDeal: existingDeal,
        reason: `Similar deal submitted ${Math.round(daysDiff)} days ago for similar end user and value`
      }
    }

    return null
  }

  private prioritizeConflicts(conflicts: DetectedConflict[]): DetectedConflict[] {
    return conflicts.sort((a, b) => {
      // Sort by severity first
      const severityOrder = { high: 3, medium: 2, low: 1 }
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity]
      if (severityDiff !== 0) return severityDiff

      // Then by conflict type priority
      const typeOrder = { duplicate_end_user: 3, territory_overlap: 2, timing_conflict: 1 }
      const typeDiff = typeOrder[b.type] - typeOrder[a.type]
      if (typeDiff !== 0) return typeDiff

      // Finally by similarity if available
      const aSim = a.similarity || 0
      const bSim = b.similarity || 0
      return bSim - aSim
    })
  }

  private generateSuggestions(conflicts: DetectedConflict[]): string[] {
    const suggestions: string[] = []

    const highSeverityConflicts = conflicts.filter(c => c.severity === 'high')
    const duplicateConflicts = conflicts.filter(c => c.type === 'duplicate_end_user')
    const territoryConflicts = conflicts.filter(c => c.type === 'territory_overlap')

    if (highSeverityConflicts.length > 0) {
      suggestions.push('⚠️ High-priority conflicts detected - requires immediate review')
    }

    if (duplicateConflicts.length > 0) {
      suggestions.push('🔍 Verify if this is a duplicate submission for the same end user')
      suggestions.push('📞 Contact the reseller to confirm deal details')
    }

    if (territoryConflicts.length > 0) {
      suggestions.push('🗺️ Review territory assignments and partner agreements')
      suggestions.push('⚖️ Consider first-come-first-served or partner tier priority')
    }

    if (conflicts.length > 2) {
      suggestions.push('📋 Multiple conflicts detected - consider escalating to management')
    }

    return suggestions
  }

  async createConflictRecords(dealId: string, conflicts: DetectedConflict[]): Promise<void> {
    if (conflicts.length === 0) return

    const conflictRecords = conflicts.map(conflict => ({
      deal_id: dealId,
      competing_deal_id: conflict.conflictingDeal.id,
      conflict_type: conflict.type,
      resolution_status: 'pending' as const,
    }))

    const { error } = await this.supabase
      .from('deal_conflicts')
      .insert(conflictRecords)

    if (error) {
      console.error('Error creating conflict records:', error)
      throw error
    }
  }
}
