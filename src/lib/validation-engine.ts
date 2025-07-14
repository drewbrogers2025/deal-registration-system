import { createAdminClient } from './supabase'
import type { CreateDeal, Reseller, Product, Deal, EndUser } from './types'
import { calculateSimilarity, normalizeCompanyName, checkTerritoryOverlap } from './utils'

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  field: string
  code: string
  message: string
  severity: 'error' | 'warning'
}

export interface ValidationWarning {
  field: string
  code: string
  message: string
  suggestion?: string
}

export interface BusinessRule {
  id: string
  name: string
  type: 'territory' | 'product' | 'deal_size' | 'partner_tier' | 'pricing' | 'documentation'
  conditions: Record<string, any>
  is_active: boolean
}

export class ValidationEngine {
  private supabase = createAdminClient()

  async validateDeal(dealData: CreateDeal): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    try {
      // 1. Territory validation
      const territoryValidation = await this.validateTerritory(dealData)
      errors.push(...territoryValidation.errors)
      warnings.push(...territoryValidation.warnings)

      // 2. Product eligibility validation
      const productValidation = await this.validateProductEligibility(dealData)
      errors.push(...productValidation.errors)
      warnings.push(...productValidation.warnings)

      // 3. Pricing validation
      const pricingValidation = await this.validatePricing(dealData)
      errors.push(...pricingValidation.errors)
      warnings.push(...pricingValidation.warnings)

      // 4. Deal size validation
      const dealSizeValidation = await this.validateDealSize(dealData)
      errors.push(...dealSizeValidation.errors)
      warnings.push(...dealSizeValidation.warnings)

      // 5. Duplicate detection with fuzzy matching
      const duplicateValidation = await this.validateDuplicates(dealData)
      errors.push(...duplicateValidation.errors)
      warnings.push(...duplicateValidation.warnings)

      // 6. Required documentation validation
      const documentationValidation = await this.validateDocumentation(dealData)
      errors.push(...documentationValidation.errors)
      warnings.push(...documentationValidation.warnings)

      return {
        isValid: errors.filter(e => e.severity === 'error').length === 0,
        errors,
        warnings
      }
    } catch (error) {
      console.error('Validation engine error:', error)
      return {
        isValid: false,
        errors: [{
          field: 'general',
          code: 'VALIDATION_ERROR',
          message: 'An error occurred during validation',
          severity: 'error'
        }],
        warnings: []
      }
    }
  }

  private async validateTerritory(dealData: CreateDeal): Promise<{ errors: ValidationError[], warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    try {
      // Get reseller details
      const { data: reseller, error } = await this.supabase
        .from('resellers')
        .select('*')
        .eq('id', dealData.reseller_id)
        .single()

      if (error || !reseller) {
        errors.push({
          field: 'reseller_id',
          code: 'RESELLER_NOT_FOUND',
          message: 'Selected reseller not found',
          severity: 'error'
        })
        return { errors, warnings }
      }

      // Check if end user territory matches reseller territory
      const territoryMatch = checkTerritoryOverlap(
        dealData.end_user.territory,
        reseller.territory
      )

      if (!territoryMatch) {
        // Check business rules for territory restrictions
        const { data: rules } = await this.supabase
          .from('eligibility_rules')
          .select('*')
          .eq('rule_type', 'territory')
          .eq('is_active', true)

        const hasStrictTerritoryRule = rules?.some(rule => 
          rule.conditions.allowed_territories?.includes('match_reseller_territory')
        )

        if (hasStrictTerritoryRule) {
          errors.push({
            field: 'end_user.territory',
            code: 'TERRITORY_MISMATCH',
            message: `End user territory "${dealData.end_user.territory}" does not match reseller territory "${reseller.territory}"`,
            severity: 'error'
          })
        } else {
          warnings.push({
            field: 'end_user.territory',
            code: 'TERRITORY_WARNING',
            message: `End user territory "${dealData.end_user.territory}" does not match reseller territory "${reseller.territory}"`,
            suggestion: 'Consider verifying territory assignment'
          })
        }
      }

      return { errors, warnings }
    } catch (error) {
      console.error('Territory validation error:', error)
      errors.push({
        field: 'territory',
        code: 'TERRITORY_VALIDATION_ERROR',
        message: 'Error validating territory',
        severity: 'error'
      })
      return { errors, warnings }
    }
  }

  private async validateProductEligibility(dealData: CreateDeal): Promise<{ errors: ValidationError[], warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    try {
      // Get reseller details for tier checking
      const { data: reseller } = await this.supabase
        .from('resellers')
        .select('tier')
        .eq('id', dealData.reseller_id)
        .single()

      if (!reseller) {
        return { errors, warnings }
      }

      // Validate each product
      for (const [index, productItem] of dealData.products.entries()) {
        const { data: product } = await this.supabase
          .from('products')
          .select('*')
          .eq('id', productItem.product_id)
          .single()

        if (!product) {
          errors.push({
            field: `products.${index}.product_id`,
            code: 'PRODUCT_NOT_FOUND',
            message: `Product not found`,
            severity: 'error'
          })
          continue
        }

        // Check product eligibility rules based on reseller tier
        const { data: rules } = await this.supabase
          .from('eligibility_rules')
          .select('*')
          .eq('rule_type', 'product')
          .eq('is_active', true)

        // Example: Bronze partners might not be eligible for certain products
        const restrictedForTier = rules?.some(rule => 
          rule.conditions.restricted_tiers?.includes(reseller.tier) &&
          rule.conditions.restricted_products?.includes(product.id)
        )

        if (restrictedForTier) {
          errors.push({
            field: `products.${index}.product_id`,
            code: 'PRODUCT_NOT_ELIGIBLE',
            message: `Product "${product.name}" is not available for ${reseller.tier} tier partners`,
            severity: 'error'
          })
        }
      }

      return { errors, warnings }
    } catch (error) {
      console.error('Product eligibility validation error:', error)
      errors.push({
        field: 'products',
        code: 'PRODUCT_VALIDATION_ERROR',
        message: 'Error validating product eligibility',
        severity: 'error'
      })
      return { errors, warnings }
    }
  }

  private async validatePricing(dealData: CreateDeal): Promise<{ errors: ValidationError[], warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    try {
      // Get reseller details for tier-based pricing validation
      const { data: reseller } = await this.supabase
        .from('resellers')
        .select('tier')
        .eq('id', dealData.reseller_id)
        .single()

      if (!reseller) {
        return { errors, warnings }
      }

      // Validate pricing for each product
      for (const [index, productItem] of dealData.products.entries()) {
        const { data: product } = await this.supabase
          .from('products')
          .select('*')
          .eq('id', productItem.product_id)
          .single()

        if (!product) {
          continue
        }

        // Calculate minimum allowed price based on tier
        const tierDiscounts = {
          'gold': 0.3,    // 30% max discount
          'silver': 0.2,  // 20% max discount
          'bronze': 0.1   // 10% max discount
        }

        const maxDiscount = tierDiscounts[reseller.tier as keyof typeof tierDiscounts] || 0
        const minAllowedPrice = product.list_price * (1 - maxDiscount)

        if (productItem.price < minAllowedPrice) {
          errors.push({
            field: `products.${index}.price`,
            code: 'PRICE_BELOW_MINIMUM',
            message: `Price $${productItem.price} is below minimum allowed price $${minAllowedPrice.toFixed(2)} for ${reseller.tier} tier`,
            severity: 'error'
          })
        }

        // Warning for prices significantly below list price
        if (productItem.price < product.list_price * 0.8) {
          warnings.push({
            field: `products.${index}.price`,
            code: 'SIGNIFICANT_DISCOUNT',
            message: `Price represents a ${((1 - productItem.price / product.list_price) * 100).toFixed(1)}% discount from list price`,
            suggestion: 'Consider reviewing discount approval requirements'
          })
        }
      }

      return { errors, warnings }
    } catch (error) {
      console.error('Pricing validation error:', error)
      errors.push({
        field: 'pricing',
        code: 'PRICING_VALIDATION_ERROR',
        message: 'Error validating pricing',
        severity: 'error'
      })
      return { errors, warnings }
    }
  }

  private async validateDealSize(dealData: CreateDeal): Promise<{ errors: ValidationError[], warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    try {
      const totalValue = dealData.products.reduce(
        (sum, product) => sum + (product.quantity * product.price), 
        0
      )

      // Get reseller details
      const { data: reseller } = await this.supabase
        .from('resellers')
        .select('tier')
        .eq('id', dealData.reseller_id)
        .single()

      if (!reseller) {
        return { errors, warnings }
      }

      // Get deal size rules
      const { data: rules } = await this.supabase
        .from('eligibility_rules')
        .select('*')
        .eq('rule_type', 'deal_size')
        .eq('is_active', true)

      // Check maximum deal size for tier
      const maxValueRule = rules?.find(rule => 
        rule.conditions.applies_to_tiers?.includes(reseller.tier) &&
        rule.conditions.max_value
      )

      if (maxValueRule && totalValue > maxValueRule.conditions.max_value) {
        errors.push({
          field: 'total_value',
          code: 'DEAL_SIZE_EXCEEDED',
          message: `Deal value $${totalValue.toLocaleString()} exceeds maximum allowed $${maxValueRule.conditions.max_value.toLocaleString()} for ${reseller.tier} tier partners`,
          severity: 'error'
        })
      }

      // Warning for high-value deals that might need special approval
      if (totalValue > 100000) {
        warnings.push({
          field: 'total_value',
          code: 'HIGH_VALUE_DEAL',
          message: `High-value deal ($${totalValue.toLocaleString()}) may require additional approval steps`,
          suggestion: 'Ensure all required documentation is provided'
        })
      }

      return { errors, warnings }
    } catch (error) {
      console.error('Deal size validation error:', error)
      errors.push({
        field: 'deal_size',
        code: 'DEAL_SIZE_VALIDATION_ERROR',
        message: 'Error validating deal size',
        severity: 'error'
      })
      return { errors, warnings }
    }
  }

  private async validateDuplicates(dealData: CreateDeal): Promise<{ errors: ValidationError[], warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    try {
      // Enhanced fuzzy matching for duplicate detection
      const { data: existingDeals } = await this.supabase
        .from('deals')
        .select(`
          *,
          end_user:end_users(*),
          reseller:resellers(*)
        `)
        .neq('status', 'rejected')
        .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()) // Last 90 days

      if (!existingDeals) {
        return { errors, warnings }
      }

      const normalizedNewCompany = normalizeCompanyName(dealData.end_user.company_name)
      
      for (const existingDeal of existingDeals) {
        const normalizedExistingCompany = normalizeCompanyName(existingDeal.end_user.company_name)
        const similarity = calculateSimilarity(normalizedNewCompany, normalizedExistingCompany)

        // High similarity threshold for potential duplicates
        if (similarity > 0.85) {
          const isSameReseller = existingDeal.reseller_id === dealData.reseller_id
          const totalValue = dealData.products.reduce((sum, p) => sum + (p.quantity * p.price), 0)
          const valueDifference = Math.abs(totalValue - existingDeal.total_value) / Math.max(totalValue, existingDeal.total_value)

          if (isSameReseller && valueDifference < 0.2) {
            errors.push({
              field: 'end_user.company_name',
              code: 'POTENTIAL_DUPLICATE',
              message: `Potential duplicate deal found for "${existingDeal.end_user.company_name}" (${(similarity * 100).toFixed(1)}% match)`,
              severity: 'error'
            })
          } else if (similarity > 0.95) {
            warnings.push({
              field: 'end_user.company_name',
              code: 'SIMILAR_COMPANY',
              message: `Very similar company name found: "${existingDeal.end_user.company_name}" (${(similarity * 100).toFixed(1)}% match)`,
              suggestion: 'Verify this is not a duplicate registration'
            })
          }
        }
      }

      return { errors, warnings }
    } catch (error) {
      console.error('Duplicate validation error:', error)
      warnings.push({
        field: 'duplicates',
        code: 'DUPLICATE_CHECK_ERROR',
        message: 'Could not check for duplicates',
        suggestion: 'Manual verification recommended'
      })
      return { errors, warnings }
    }
  }

  private async validateDocumentation(dealData: CreateDeal): Promise<{ errors: ValidationError[], warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    try {
      const totalValue = dealData.products.reduce(
        (sum, product) => sum + (product.quantity * product.price), 
        0
      )

      // Required documentation based on deal value
      const requiredDocs: string[] = []
      
      if (totalValue > 50000) {
        requiredDocs.push('quote', 'technical_specification')
      }
      
      if (totalValue > 100000) {
        requiredDocs.push('contract', 'financial_verification')
      }

      // For now, just add warnings since we don't have document upload in the basic form
      if (requiredDocs.length > 0) {
        warnings.push({
          field: 'documentation',
          code: 'DOCUMENTATION_REQUIRED',
          message: `This deal requires the following documentation: ${requiredDocs.join(', ')}`,
          suggestion: 'Ensure all required documents are prepared for upload'
        })
      }

      return { errors, warnings }
    } catch (error) {
      console.error('Documentation validation error:', error)
      return { errors, warnings }
    }
  }
}
