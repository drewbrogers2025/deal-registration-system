import { z } from 'zod'

// Enums
export const ResellerTier = z.enum(['gold', 'silver', 'bronze'])
export const UserStatus = z.enum(['active', 'inactive'])
export const DealStatus = z.enum(['pending', 'assigned', 'disputed', 'approved', 'rejected'])
export const ConflictType = z.enum(['duplicate_end_user', 'territory_overlap', 'timing_conflict'])
export const ResolutionStatus = z.enum(['pending', 'resolved', 'dismissed'])
export const StaffRole = z.enum(['admin', 'manager', 'staff'])

// Base schemas
export const ResellerSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Reseller name is required'),
  email: z.string().email('Valid email is required'),
  territory: z.string().min(1, 'Territory is required'),
  tier: ResellerTier,
  status: UserStatus.default('active'),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export const EndUserSchema = z.object({
  id: z.string().uuid().optional(),
  company_name: z.string().min(1, 'Company name is required'),
  contact_name: z.string().min(1, 'Contact name is required'),
  contact_email: z.string().email('Valid email is required'),
  territory: z.string().min(1, 'Territory is required'),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

// Enhanced product and pricing schemas
export const ProductStatus = z.enum(['active', 'discontinued', 'coming_soon'])
export const PricingTierType = z.enum(['standard', 'volume', 'deal_registration', 'reseller_tier', 'territory', 'promotional'])
export const DiscountType = z.enum(['percentage', 'fixed_amount'])

export const ProductCategorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
  parent_id: z.string().uuid().nullable().optional(),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export const ProductSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().optional(),
  description: z.string().optional(),
  category_id: z.string().uuid().nullable().optional(),
  category: z.string().min(1, 'Category is required'), // Keep for backward compatibility
  list_price: z.number().positive('Price must be positive'),
  cost_price: z.number().positive().optional(),
  status: ProductStatus.default('active'),
  image_url: z.string().url().optional(),
  documentation_url: z.string().url().optional(),
  specifications: z.record(z.any()).default({}),
  tags: z.array(z.string()).default([]),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export const ProductPricingTierSchema = z.object({
  id: z.string().uuid().optional(),
  product_id: z.string().uuid(),
  tier_type: PricingTierType,
  tier_name: z.string().min(1, 'Tier name is required'),
  price: z.number().nonnegative('Price must be non-negative'),
  min_quantity: z.number().int().positive().default(1),
  max_quantity: z.number().int().positive().optional(),
  reseller_tier: ResellerTier.optional(),
  territory: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  is_active: z.boolean().default(true),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export const VolumeDiscountSchema = z.object({
  id: z.string().uuid().optional(),
  product_id: z.string().uuid(),
  min_quantity: z.number().int().positive('Minimum quantity must be positive'),
  max_quantity: z.number().int().positive().optional(),
  discount_type: DiscountType,
  discount_value: z.number().nonnegative('Discount value must be non-negative'),
  reseller_tier: ResellerTier.optional(),
  territory: z.string().optional(),
  is_active: z.boolean().default(true),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export const DealRegistrationPricingSchema = z.object({
  id: z.string().uuid().optional(),
  product_id: z.string().uuid(),
  deal_registration_price: z.number().nonnegative('Price must be non-negative'),
  min_deal_value: z.number().positive().optional(),
  max_deal_value: z.number().positive().optional(),
  reseller_tier: ResellerTier.optional(),
  territory: z.string().optional(),
  requires_approval: z.boolean().default(false),
  is_active: z.boolean().default(true),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export const ProductAvailabilitySchema = z.object({
  id: z.string().uuid().optional(),
  product_id: z.string().uuid(),
  reseller_id: z.string().uuid().optional(),
  territory: z.string().optional(),
  reseller_tier: ResellerTier.optional(),
  is_available: z.boolean().default(true),
  restriction_reason: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export const TerritoryPricingSchema = z.object({
  id: z.string().uuid().optional(),
  product_id: z.string().uuid(),
  territory: z.string().min(1, 'Territory is required'),
  price_multiplier: z.number().positive('Price multiplier must be positive').default(1.0),
  currency_code: z.string().length(3, 'Currency code must be 3 characters').default('GBP'),
  is_active: z.boolean().default(true),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export const PromotionalPricingSchema = z.object({
  id: z.string().uuid().optional(),
  product_id: z.string().uuid(),
  promotion_name: z.string().min(1, 'Promotion name is required'),
  discount_type: DiscountType,
  discount_value: z.number().nonnegative('Discount value must be non-negative'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  reseller_tier: ResellerTier.optional(),
  territory: z.string().optional(),
  min_quantity: z.number().int().positive().default(1),
  max_usage_per_reseller: z.number().int().positive().optional(),
  is_active: z.boolean().default(true),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export const DealProductSchema = z.object({
  id: z.string().uuid().optional(),
  deal_id: z.string().uuid().optional(),
  product_id: z.string().uuid(),
  quantity: z.number().int().positive('Quantity must be positive'),
  price: z.number().positive('Price must be positive'),
  created_at: z.string().optional(),
})

export const DealSchema = z.object({
  id: z.string().uuid().optional(),
  reseller_id: z.string().uuid(),
  end_user_id: z.string().uuid(),
  assigned_reseller_id: z.string().uuid().nullable().optional(),
  status: DealStatus.default('pending'),
  total_value: z.number().positive('Total value must be positive'),
  submission_date: z.string().optional(),
  assignment_date: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export const DealConflictSchema = z.object({
  id: z.string().uuid().optional(),
  deal_id: z.string().uuid(),
  competing_deal_id: z.string().uuid(),
  conflict_type: ConflictType,
  resolution_status: ResolutionStatus.default('pending'),
  assigned_to_staff: z.string().uuid().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export const StaffUserSchema = z.object({
  id: z.string().uuid().optional(),
  email: z.string().email('Valid email is required'),
  name: z.string().min(1, 'Name is required'),
  role: StaffRole.default('staff'),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

// Form schemas for creating/updating
export const CreateDealSchema = z.object({
  reseller_id: z.string().uuid('Please select a reseller'),
  end_user: z.object({
    id: z.string().uuid().optional(),
    company_name: z.string().min(1, 'Company name is required'),
    contact_name: z.string().min(1, 'Contact name is required'),
    contact_email: z.string().email('Valid email is required'),
    territory: z.string().min(1, 'Territory is required'),
  }),
  products: z.array(z.object({
    product_id: z.string().uuid('Please select a product'),
    quantity: z.number().int().positive('Quantity must be positive'),
    price: z.number().positive('Price must be positive'),
  })).min(1, 'At least one product is required'),
})

export const AssignDealSchema = z.object({
  deal_id: z.string().uuid(),
  assigned_reseller_id: z.string().uuid(),
  reason: z.string().optional(),
})

// Pricing calculation types
export const PricingContextSchema = z.object({
  reseller_id: z.string().uuid().optional(),
  reseller_tier: ResellerTier.optional(),
  territory: z.string().optional(),
  quantity: z.number().int().positive().default(1),
  deal_value: z.number().positive().optional(),
  is_deal_registration: z.boolean().default(false),
  calculation_date: z.string().optional(),
})

export const PricingResultSchema = z.object({
  product_id: z.string().uuid(),
  base_price: z.number(),
  final_price: z.number(),
  currency: z.string().default('GBP'),
  discounts_applied: z.array(z.object({
    type: z.string(),
    name: z.string(),
    amount: z.number(),
    percentage: z.number().optional(),
  })),
  pricing_tier: z.string().optional(),
  is_deal_registration_eligible: z.boolean().default(false),
  territory_adjustment: z.number().optional(),
  volume_discount: z.number().optional(),
  promotional_discount: z.number().optional(),
})

export const ProductCatalogFilterSchema = z.object({
  category_id: z.string().uuid().optional(),
  status: ProductStatus.optional(),
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
  min_price: z.number().nonnegative().optional(),
  max_price: z.number().positive().optional(),
  reseller_tier: ResellerTier.optional(),
  territory: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sort_by: z.enum(['name', 'price', 'category', 'created_at']).default('name'),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
})

// Type exports
export type Reseller = z.infer<typeof ResellerSchema>
export type EndUser = z.infer<typeof EndUserSchema>
export type ProductCategory = z.infer<typeof ProductCategorySchema>
export type Product = z.infer<typeof ProductSchema>
export type ProductPricingTier = z.infer<typeof ProductPricingTierSchema>
export type VolumeDiscount = z.infer<typeof VolumeDiscountSchema>
export type DealRegistrationPricing = z.infer<typeof DealRegistrationPricingSchema>
export type ProductAvailability = z.infer<typeof ProductAvailabilitySchema>
export type TerritoryPricing = z.infer<typeof TerritoryPricingSchema>
export type PromotionalPricing = z.infer<typeof PromotionalPricingSchema>
export type Deal = z.infer<typeof DealSchema>
export type DealProduct = z.infer<typeof DealProductSchema>
export type DealConflict = z.infer<typeof DealConflictSchema>
export type StaffUser = z.infer<typeof StaffUserSchema>
export type CreateDeal = z.infer<typeof CreateDealSchema>
export type AssignDeal = z.infer<typeof AssignDealSchema>
export type PricingContext = z.infer<typeof PricingContextSchema>
export type PricingResult = z.infer<typeof PricingResultSchema>
export type ProductCatalogFilter = z.infer<typeof ProductCatalogFilterSchema>

// Extended types with relationships
export type ProductCategoryWithChildren = ProductCategory & {
  children?: ProductCategory[]
  parent?: ProductCategory | null
  product_count?: number
}

export type ProductWithRelations = Product & {
  category?: ProductCategory | null
  pricing_tiers?: ProductPricingTier[]
  volume_discounts?: VolumeDiscount[]
  deal_registration_pricing?: DealRegistrationPricing[]
  availability?: ProductAvailability[]
  territory_pricing?: TerritoryPricing[]
  promotional_pricing?: PromotionalPricing[]
  calculated_price?: PricingResult
}

export type DealWithRelations = Deal & {
  reseller: Reseller
  end_user: EndUser
  assigned_reseller?: Reseller | null
  products: (DealProduct & { product: ProductWithRelations })[]
  conflicts: (DealConflict & { competing_deal: Deal })[]
}

export type ConflictWithRelations = DealConflict & {
  deal: DealWithRelations
  competing_deal: DealWithRelations
  assigned_staff?: StaffUser | null
}

// API Response types
export type ApiResponse<T> = {
  data: T | null
  error: string | null
  success: boolean
}

export type PaginatedResponse<T> = ApiResponse<{
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}>

// Filter and search types
export type DealFilters = {
  status?: string[]
  reseller_id?: string
  territory?: string
  date_from?: string
  date_to?: string
  has_conflicts?: boolean
}

export type ConflictFilters = {
  resolution_status?: string[]
  conflict_type?: string[]
  assigned_to_staff?: string
}

// Dashboard metrics
export type DashboardMetrics = {
  total_deals: number
  pending_deals: number
  disputed_deals: number
  assigned_deals: number
  total_conflicts: number
  pending_conflicts: number
  total_value: number
  avg_resolution_time: number
}
