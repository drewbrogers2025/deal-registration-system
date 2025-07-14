import { createServerComponentClient } from './supabase'
import type {
  PricingContext,
  PricingResult
} from './types'

export class PricingEngine {
  private supabase = createServerComponentClient()

  /**
   * Calculate the final price for a product based on context
   */
  async calculatePrice(
    productId: string, 
    context: PricingContext
  ): Promise<PricingResult> {
    // Get product base information
    const { data: product } = await this.supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single()

    if (!product) {
      throw new Error('Product not found')
    }

    const basePrice = product.list_price
    let finalPrice = basePrice
    const discountsApplied: PricingResult['discounts_applied'] = []
    let pricingTier: string | undefined
    let isDealRegistrationEligible = false

    // 1. Apply territory pricing adjustments
    const territoryAdjustment = await this.applyTerritoryPricing(
      productId, 
      context.territory, 
      basePrice
    )
    if (territoryAdjustment !== basePrice) {
      finalPrice = territoryAdjustment
      discountsApplied.push({
        type: 'territory',
        name: `Territory adjustment for ${context.territory}`,
        amount: territoryAdjustment - basePrice,
      })
    }

    // 2. Apply reseller tier pricing
    const tierPricing = await this.applyResellerTierPricing(
      productId,
      context.reseller_tier,
      context.territory,
      finalPrice
    )
    if (tierPricing.price !== finalPrice) {
      finalPrice = tierPricing.price
      pricingTier = tierPricing.tierName
      discountsApplied.push({
        type: 'reseller_tier',
        name: `${context.reseller_tier} tier pricing`,
        amount: tierPricing.price - finalPrice,
      })
    }

    // 3. Apply volume discounts
    const volumeDiscount = await this.applyVolumeDiscount(
      productId,
      context.quantity,
      context.reseller_tier,
      context.territory,
      finalPrice
    )
    if (volumeDiscount.discount > 0) {
      finalPrice -= volumeDiscount.discount
      discountsApplied.push({
        type: 'volume',
        name: `Volume discount for ${context.quantity} units`,
        amount: -volumeDiscount.discount,
        percentage: volumeDiscount.percentage,
      })
    }

    // 4. Apply promotional pricing
    const promotionalDiscount = await this.applyPromotionalPricing(
      productId,
      context.reseller_tier,
      context.territory,
      context.quantity,
      context.calculation_date,
      finalPrice
    )
    if (promotionalDiscount.discount > 0) {
      finalPrice -= promotionalDiscount.discount
      discountsApplied.push({
        type: 'promotional',
        name: promotionalDiscount.promotionName,
        amount: -promotionalDiscount.discount,
        percentage: promotionalDiscount.percentage,
      })
    }

    // 5. Check deal registration pricing eligibility
    if (context.is_deal_registration && context.deal_value) {
      const dealRegPricing = await this.getDealRegistrationPrice(
        productId,
        context.deal_value,
        context.reseller_tier,
        context.territory
      )
      if (dealRegPricing) {
        isDealRegistrationEligible = true
        if (dealRegPricing.price < finalPrice) {
          const savings = finalPrice - dealRegPricing.price
          finalPrice = dealRegPricing.price
          discountsApplied.push({
            type: 'deal_registration',
            name: 'Deal registration pricing',
            amount: -savings,
          })
        }
      }
    }

    return {
      product_id: productId,
      base_price: basePrice,
      final_price: Math.max(0, finalPrice), // Ensure non-negative
      currency: 'GBP',
      discounts_applied: discountsApplied,
      pricing_tier: pricingTier,
      is_deal_registration_eligible: isDealRegistrationEligible,
      territory_adjustment: territoryAdjustment !== basePrice ? territoryAdjustment - basePrice : undefined,
      volume_discount: volumeDiscount.discount > 0 ? volumeDiscount.discount : undefined,
      promotional_discount: promotionalDiscount.discount > 0 ? promotionalDiscount.discount : undefined,
    }
  }

  /**
   * Apply territory-specific pricing adjustments
   */
  private async applyTerritoryPricing(
    productId: string,
    territory: string | undefined,
    basePrice: number
  ): Promise<number> {
    if (!territory) return basePrice

    const { data: territoryPricing } = await this.supabase
      .from('territory_pricing')
      .select('*')
      .eq('product_id', productId)
      .eq('territory', territory)
      .eq('is_active', true)
      .single()

    if (territoryPricing) {
      return basePrice * territoryPricing.price_multiplier
    }

    return basePrice
  }

  /**
   * Apply reseller tier specific pricing
   */
  private async applyResellerTierPricing(
    productId: string,
    resellerTier: string | undefined,
    territory: string | undefined,
    currentPrice: number
  ): Promise<{ price: number; tierName?: string }> {
    if (!resellerTier) return { price: currentPrice }

    const { data: tierPricing } = await this.supabase
      .from('product_pricing_tiers')
      .select('*')
      .eq('product_id', productId)
      .eq('tier_type', 'reseller_tier')
      .eq('reseller_tier', resellerTier)
      .eq('is_active', true)
      .order('price', { ascending: true })
      .limit(1)

    if (tierPricing && tierPricing.length > 0) {
      const tier = tierPricing[0]
      // Check if territory matches (if specified)
      if (!tier.territory || tier.territory === territory) {
        return { 
          price: tier.price, 
          tierName: tier.tier_name 
        }
      }
    }

    return { price: currentPrice }
  }

  /**
   * Apply volume-based discounts
   */
  private async applyVolumeDiscount(
    productId: string,
    quantity: number,
    resellerTier: string | undefined,
    territory: string | undefined,
    currentPrice: number
  ): Promise<{ discount: number; percentage?: number }> {
    const { data: volumeDiscounts } = await this.supabase
      .from('volume_discounts')
      .select('*')
      .eq('product_id', productId)
      .eq('is_active', true)
      .lte('min_quantity', quantity)
      .or(`max_quantity.is.null,max_quantity.gte.${quantity}`)
      .order('min_quantity', { ascending: false })

    if (!volumeDiscounts || volumeDiscounts.length === 0) {
      return { discount: 0 }
    }

    // Find the best applicable discount
    let bestDiscount = { discount: 0, percentage: undefined }
    
    for (const discount of volumeDiscounts) {
      // Check if reseller tier matches (if specified)
      if (discount.reseller_tier && discount.reseller_tier !== resellerTier) {
        continue
      }
      
      // Check if territory matches (if specified)
      if (discount.territory && discount.territory !== territory) {
        continue
      }

      const discountAmount = discount.discount_type === 'percentage'
        ? (currentPrice * quantity * discount.discount_value) / 100
        : discount.discount_value * quantity

      if (discountAmount > bestDiscount.discount) {
        bestDiscount = {
          discount: discountAmount,
          percentage: discount.discount_type === 'percentage' ? discount.discount_value : undefined
        }
      }
    }

    return bestDiscount
  }

  /**
   * Apply promotional pricing
   */
  private async applyPromotionalPricing(
    productId: string,
    resellerTier: string | undefined,
    territory: string | undefined,
    quantity: number,
    calculationDate: string | undefined,
    currentPrice: number
  ): Promise<{ discount: number; percentage?: number; promotionName: string }> {
    const now = calculationDate ? new Date(calculationDate) : new Date()
    
    const { data: promotions } = await this.supabase
      .from('promotional_pricing')
      .select('*')
      .eq('product_id', productId)
      .eq('is_active', true)
      .lte('start_date', now.toISOString())
      .gte('end_date', now.toISOString())
      .lte('min_quantity', quantity)

    if (!promotions || promotions.length === 0) {
      return { discount: 0, promotionName: '' }
    }

    let bestPromotion = { discount: 0, percentage: undefined, promotionName: '' }

    for (const promo of promotions) {
      // Check if reseller tier matches (if specified)
      if (promo.reseller_tier && promo.reseller_tier !== resellerTier) {
        continue
      }
      
      // Check if territory matches (if specified)
      if (promo.territory && promo.territory !== territory) {
        continue
      }

      const discountAmount = promo.discount_type === 'percentage'
        ? (currentPrice * quantity * promo.discount_value) / 100
        : promo.discount_value * quantity

      if (discountAmount > bestPromotion.discount) {
        bestPromotion = {
          discount: discountAmount,
          percentage: promo.discount_type === 'percentage' ? promo.discount_value : undefined,
          promotionName: promo.promotion_name
        }
      }
    }

    return bestPromotion
  }

  /**
   * Get deal registration pricing if eligible
   */
  private async getDealRegistrationPrice(
    productId: string,
    dealValue: number,
    resellerTier: string | undefined,
    territory: string | undefined
  ): Promise<{ price: number } | null> {
    const { data: dealRegPricing } = await this.supabase
      .from('deal_registration_pricing')
      .select('*')
      .eq('product_id', productId)
      .eq('is_active', true)
      .or(`min_deal_value.is.null,min_deal_value.lte.${dealValue}`)
      .or(`max_deal_value.is.null,max_deal_value.gte.${dealValue}`)

    if (!dealRegPricing || dealRegPricing.length === 0) {
      return null
    }

    // Find the best applicable deal registration price
    for (const pricing of dealRegPricing) {
      // Check if reseller tier matches (if specified)
      if (pricing.reseller_tier && pricing.reseller_tier !== resellerTier) {
        continue
      }
      
      // Check if territory matches (if specified)
      if (pricing.territory && pricing.territory !== territory) {
        continue
      }

      return { price: pricing.deal_registration_price }
    }

    return null
  }

  /**
   * Check if a product is available for a specific reseller/territory
   */
  async checkProductAvailability(
    productId: string,
    resellerId?: string,
    territory?: string,
    resellerTier?: string
  ): Promise<{ available: boolean; reason?: string }> {
    const { data: availability } = await this.supabase
      .from('product_availability')
      .select('*')
      .eq('product_id', productId)
      .or(`reseller_id.is.null,reseller_id.eq.${resellerId || 'null'}`)
      .or(`territory.is.null,territory.eq.${territory || 'null'}`)
      .or(`reseller_tier.is.null,reseller_tier.eq.${resellerTier || 'null'}`)

    if (!availability || availability.length === 0) {
      return { available: true }
    }

    // Check for any restrictions
    for (const avail of availability) {
      if (!avail.is_available) {
        return { 
          available: false, 
          reason: avail.restriction_reason || 'Product not available for this reseller/territory' 
        }
      }
    }

    return { available: true }
  }
}

// Export singleton instance
export const pricingEngine = new PricingEngine()
