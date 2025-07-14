import { z } from 'zod'

// Enums
export const ResellerTier = z.enum(['gold', 'silver', 'bronze'])
export const UserStatus = z.enum(['active', 'inactive'])
export const DealStatus = z.enum(['pending', 'assigned', 'disputed', 'approved', 'rejected'])
export const ConflictType = z.enum(['duplicate_end_user', 'territory_overlap', 'timing_conflict'])
export const ResolutionStatus = z.enum(['pending', 'resolved', 'dismissed'])
export const StaffRole = z.enum(['admin', 'manager', 'staff'])

// New enums for reseller registration system
export const ContactRole = z.enum(['primary', 'sales', 'technical', 'billing', 'executive'])
export const DocumentType = z.enum(['certification', 'agreement', 'license', 'insurance', 'other'])
export const RegistrationStatus = z.enum(['draft', 'submitted', 'under_review', 'approved', 'rejected'])
export const RevenueRange = z.enum(['under_1m', '1m_5m', '5m_25m', '25m_100m', 'over_100m'])

// Enhanced reseller schema with comprehensive company information
export const ResellerSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Company name is required'),
  email: z.string().email('Valid email is required'),
  territory: z.string().min(1, 'Territory is required'),
  tier: ResellerTier,
  status: UserStatus.default('active'),
  // Enhanced company information
  legal_name: z.string().optional(),
  dba: z.string().optional(),
  tax_id: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  phone: z.string().optional(),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  state_province: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  years_in_business: z.number().int().min(0).optional(),
  employee_count: z.number().int().min(1).optional(),
  revenue_range: RevenueRange.optional(),
  registration_status: RegistrationStatus.default('draft'),
  approved_at: z.string().optional(),
  approved_by: z.string().uuid().optional(),
  rejection_reason: z.string().optional(),
  terms_accepted_at: z.string().optional(),
  terms_version: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

// Reseller contact schema
export const ResellerContactSchema = z.object({
  id: z.string().uuid().optional(),
  reseller_id: z.string().uuid(),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  role: ContactRole,
  title: z.string().optional(),
  department: z.string().optional(),
  is_primary: z.boolean().default(false),
  can_register_deals: z.boolean().default(false),
  can_view_reports: z.boolean().default(false),
  can_manage_contacts: z.boolean().default(false),
  last_login_at: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

// Company document schema
export const CompanyDocumentSchema = z.object({
  id: z.string().uuid().optional(),
  reseller_id: z.string().uuid(),
  name: z.string().min(1, 'Document name is required'),
  description: z.string().optional(),
  document_type: DocumentType,
  file_path: z.string().min(1, 'File path is required'),
  file_size: z.number().int().min(0).optional(),
  mime_type: z.string().optional(),
  version: z.number().int().min(1).default(1),
  is_current: z.boolean().default(true),
  expires_at: z.string().optional(),
  uploaded_by: z.string().uuid().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

// Reseller territory schema
export const ResellerTerritorySchema = z.object({
  id: z.string().uuid().optional(),
  reseller_id: z.string().uuid(),
  territory_name: z.string().min(1, 'Territory name is required'),
  territory_type: z.string().default('geographic'),
  is_primary: z.boolean().default(false),
  effective_from: z.string().optional(),
  effective_until: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

// Company metrics schema
export const CompanyMetricsSchema = z.object({
  id: z.string().uuid().optional(),
  reseller_id: z.string().uuid(),
  metric_period: z.string(), // Date string
  deals_registered: z.number().int().min(0).default(0),
  deals_won: z.number().int().min(0).default(0),
  total_deal_value: z.number().min(0).default(0),
  average_deal_size: z.number().min(0).default(0),
  win_rate: z.number().min(0).max(100).default(0),
  time_to_close_avg: z.number().int().min(0).default(0),
  customer_satisfaction: z.number().min(1).max(5).optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

// Contact activity schema
export const ContactActivitySchema = z.object({
  id: z.string().uuid().optional(),
  contact_id: z.string().uuid(),
  activity_type: z.string().min(1, 'Activity type is required'),
  subject: z.string().optional(),
  description: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  created_by: z.string().uuid().optional(),
  created_at: z.string().optional(),
})

// Multi-step registration form schemas
export const RegistrationStep1Schema = z.object({
  legal_name: z.string().min(1, 'Legal company name is required'),
  dba: z.string().optional(),
  tax_id: z.string().min(1, 'Tax ID is required'),
  website: z.string().url('Valid website URL is required').optional().or(z.literal('')),
  phone: z.string().min(1, 'Phone number is required'),
})

export const RegistrationStep2Schema = z.object({
  address_line1: z.string().min(1, 'Address is required'),
  address_line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state_province: z.string().min(1, 'State/Province is required'),
  postal_code: z.string().min(1, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),
})

export const RegistrationStep3Schema = z.object({
  years_in_business: z.number().int().min(0, 'Years in business must be 0 or greater'),
  employee_count: z.number().int().min(1, 'Employee count must be at least 1'),
  revenue_range: RevenueRange,
})

export const RegistrationStep4Schema = z.object({
  territories: z.array(z.object({
    territory_name: z.string().min(1, 'Territory name is required'),
    territory_type: z.string().default('geographic'),
    is_primary: z.boolean().default(false),
  })).min(1, 'At least one territory is required'),
})

export const RegistrationStep5Schema = z.object({
  contacts: z.array(ResellerContactSchema.omit({
    id: true,
    reseller_id: true,
    created_at: true,
    updated_at: true,
    last_login_at: true
  })).min(1, 'At least one contact is required'),
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
export type ResellerContact = z.infer<typeof ResellerContactSchema>
export type CompanyDocument = z.infer<typeof CompanyDocumentSchema>
export type ResellerTerritory = z.infer<typeof ResellerTerritorySchema>
export type CompanyMetrics = z.infer<typeof CompanyMetricsSchema>
export type ContactActivity = z.infer<typeof ContactActivitySchema>
export type RegistrationStep1 = z.infer<typeof RegistrationStep1Schema>
export type RegistrationStep2 = z.infer<typeof RegistrationStep2Schema>
export type RegistrationStep3 = z.infer<typeof RegistrationStep3Schema>
export type RegistrationStep4 = z.infer<typeof RegistrationStep4Schema>
export type RegistrationStep5 = z.infer<typeof RegistrationStep5Schema>
export type EndUser = z.infer<typeof EndUserSchema>
export type Product = z.infer<typeof ProductSchema>
export type Deal = z.infer<typeof DealSchema>
export type DealProduct = z.infer<typeof DealProductSchema>
export type DealConflict = z.infer<typeof DealConflictSchema>
export type StaffUser = z.infer<typeof StaffUserSchema>
export type CreateDeal = z.infer<typeof CreateDealSchema>
export type AssignDeal = z.infer<typeof AssignDealSchema>

// Extended types with relationships
export type ResellerWithRelations = Reseller & {
  contacts: ResellerContact[]
  territories: ResellerTerritory[]
  documents: CompanyDocument[]
  metrics: CompanyMetrics[]
  primary_contact?: ResellerContact | null
  primary_territory?: ResellerTerritory | null
}

export type ResellerContactWithActivity = ResellerContact & {
  activities: ContactActivity[]
  reseller: Reseller
}

export type CompanyDocumentWithUploader = CompanyDocument & {
  uploader?: ResellerContact | null
  reseller: Reseller
}

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

// Multi-step registration form data
export type RegistrationFormData = {
  step1: RegistrationStep1
  step2: RegistrationStep2
  step3: RegistrationStep3
  step4: RegistrationStep4
  step5: RegistrationStep5
  terms_accepted: boolean
  terms_version: string
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
