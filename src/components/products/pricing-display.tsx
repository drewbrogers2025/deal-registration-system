'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { PricingResult } from '@/lib/types'
import { TrendingDown, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react'

interface PricingDisplayProps {
  pricing: PricingResult
  availability?: { available: boolean; reason?: string }
  showDetails?: boolean
  className?: string
}

export function PricingDisplay({ 
  pricing, 
  availability, 
  showDetails = false, 
  className = '' 
}: PricingDisplayProps) {
  const hasDiscounts = pricing.discounts_applied.length > 0
  const totalSavings = pricing.base_price - pricing.final_price
  const savingsPercentage = pricing.base_price > 0 
    ? ((totalSavings / pricing.base_price) * 100).toFixed(1)
    : '0'

  return (
    <Card className={`${className}`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Main Price Display */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-green-600">
                  {formatCurrency(pricing.final_price)}
                </span>
                {hasDiscounts && (
                  <Badge variant="secondary" className="text-xs">
                    <TrendingDown className="w-3 h-3 mr-1" />
                    {savingsPercentage}% off
                  </Badge>
                )}
              </div>
              
              {hasDiscounts && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="line-through">
                    {formatCurrency(pricing.base_price)}
                  </span>
                  <span className="text-green-600 font-medium">
                    Save {formatCurrency(totalSavings)}
                  </span>
                </div>
              )}
            </div>

            {/* Availability Status */}
            <div className="text-right">
              {availability && (
                <div className="flex items-center gap-1">
                  {availability.available ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-600">Available</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-red-600">Restricted</span>
                    </>
                  )}
                </div>
              )}
              
              {pricing.pricing_tier && (
                <Badge variant="outline" className="mt-1">
                  {pricing.pricing_tier}
                </Badge>
              )}
            </div>
          </div>

          {/* Deal Registration Eligibility */}
          {pricing.is_deal_registration_eligible && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-md">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-700 font-medium">
                Deal Registration Pricing Available
              </span>
            </div>
          )}

          {/* Availability Restriction Reason */}
          {availability && !availability.available && availability.reason && (
            <div className="flex items-center gap-2 p-2 bg-red-50 rounded-md">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-700">
                {availability.reason}
              </span>
            </div>
          )}

          {/* Detailed Discounts */}
          {showDetails && hasDiscounts && (
            <div className="space-y-2 pt-2 border-t">
              <h4 className="text-sm font-medium text-gray-700">Applied Discounts:</h4>
              <div className="space-y-1">
                {pricing.discounts_applied.map((discount, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">{discount.name}</span>
                    <div className="flex items-center gap-2">
                      {discount.percentage && (
                        <Badge variant="secondary" className="text-xs">
                          {discount.percentage}%
                        </Badge>
                      )}
                      <span className={discount.amount < 0 ? 'text-green-600' : 'text-red-600'}>
                        {discount.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(discount.amount))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Currency Info */}
          <div className="text-xs text-gray-500 text-right">
            Prices in {pricing.currency}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface VolumeDiscountCalculatorProps {
  productId: string
  basePrice: number
  onQuantityChange?: (quantity: number, totalPrice: number) => void
  className?: string
}

export function VolumeDiscountCalculator({ 
  productId, 
  basePrice, 
  onQuantityChange,
  className = '' 
}: VolumeDiscountCalculatorProps) {
  // This would typically fetch volume discount tiers and calculate pricing
  // For now, showing a simplified version
  const volumeTiers = [
    { min: 1, max: 4, discount: 0, label: 'Standard' },
    { min: 5, max: 9, discount: 5, label: '5+ Units' },
    { min: 10, max: 24, discount: 10, label: '10+ Units' },
    { min: 25, max: null, discount: 15, label: '25+ Units' },
  ]

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Volume Pricing</h4>
        <div className="space-y-2">
          {volumeTiers.map((tier, index) => {
            const discountedPrice = basePrice * (1 - tier.discount / 100)
            const rangeText = tier.max 
              ? `${tier.min}-${tier.max} units`
              : `${tier.min}+ units`
            
            return (
              <div key={index} className="flex justify-between items-center text-sm">
                <div>
                  <span className="font-medium">{tier.label}</span>
                  <span className="text-gray-500 ml-2">({rangeText})</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatCurrency(discountedPrice)}</div>
                  {tier.discount > 0 && (
                    <div className="text-green-600 text-xs">
                      {tier.discount}% off
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

interface PricingTierBadgeProps {
  tier: string
  className?: string
}

export function PricingTierBadge({ tier, className = '' }: PricingTierBadgeProps) {
  const getTierColor = (tierName: string) => {
    const lowerTier = tierName.toLowerCase()
    if (lowerTier.includes('gold') || lowerTier.includes('premium')) {
      return 'bg-yellow-100 text-yellow-800'
    }
    if (lowerTier.includes('silver')) {
      return 'bg-gray-100 text-gray-800'
    }
    if (lowerTier.includes('bronze')) {
      return 'bg-orange-100 text-orange-800'
    }
    if (lowerTier.includes('deal') || lowerTier.includes('registration')) {
      return 'bg-blue-100 text-blue-800'
    }
    return 'bg-green-100 text-green-800'
  }

  return (
    <Badge className={`${getTierColor(tier)} ${className}`}>
      {tier}
    </Badge>
  )
}
