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

export const ProductSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Product name is required'),
  category: z.string().min(1, 'Category is required'),
  list_price: z.number().positive('Price must be positive'),
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

// Type exports
export type Reseller = z.infer<typeof ResellerSchema>
export type EndUser = z.infer<typeof EndUserSchema>
export type Product = z.infer<typeof ProductSchema>
export type Deal = z.infer<typeof DealSchema>
export type DealProduct = z.infer<typeof DealProductSchema>
export type DealConflict = z.infer<typeof DealConflictSchema>
export type StaffUser = z.infer<typeof StaffUserSchema>
export type CreateDeal = z.infer<typeof CreateDealSchema>
export type AssignDeal = z.infer<typeof AssignDealSchema>

// Extended types with relationships
export type DealWithRelations = Deal & {
  reseller: Reseller
  end_user: EndUser
  assigned_reseller?: Reseller | null
  products: (DealProduct & { product: Product })[]
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
