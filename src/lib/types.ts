import { z } from 'zod'

// Enums
export const ResellerTier = z.enum(['gold', 'silver', 'bronze'])
export const UserStatus = z.enum(['active', 'inactive'])
export const DealStatus = z.enum(['pending', 'assigned', 'disputed', 'approved', 'rejected'])
export const DealSubstatus = z.enum([
  'draft', 'submitted', 'under_review', 'validation_pending', 'conflict_review',
  'approval_pending', 'manager_review', 'admin_review', 'approved_conditional',
  'rejected_validation', 'rejected_conflict', 'rejected_approval', 'appeal_pending'
])
export const ConflictType = z.enum(['duplicate_end_user', 'territory_overlap', 'timing_conflict'])
export const ResolutionStatus = z.enum(['pending', 'resolved', 'dismissed'])
export const StaffRole = z.enum(['admin', 'manager', 'staff'])
export const ApprovalAction = z.enum(['approve', 'reject', 'request_changes', 'escalate'])
export const NotificationType = z.enum(['deal_submitted', 'approval_required', 'deal_approved', 'deal_rejected', 'conflict_detected', 'comment_added', 'document_uploaded'])
export const NotificationStatus = z.enum(['unread', 'read', 'archived'])

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
  substatus: DealSubstatus.default('submitted'),
  priority: z.number().int().min(1).max(5).default(1),
  total_value: z.number().positive('Total value must be positive'),
  expected_close_date: z.string().optional(),
  deal_description: z.string().optional(),
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

// New workflow schemas
export const DealDraftSchema = z.object({
  id: z.string().uuid().optional(),
  reseller_id: z.string().uuid(),
  draft_data: z.record(z.any()),
  step_completed: z.number().int().min(1).default(1),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export const ApprovalWorkflowSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Workflow name is required'),
  description: z.string().optional(),
  conditions: z.record(z.any()),
  steps: z.array(z.record(z.any())),
  is_active: z.boolean().default(true),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export const DealApprovalSchema = z.object({
  id: z.string().uuid().optional(),
  deal_id: z.string().uuid(),
  workflow_id: z.string().uuid(),
  step_number: z.number().int().positive(),
  approver_id: z.string().uuid().nullable().optional(),
  action: ApprovalAction.optional(),
  comments: z.string().optional(),
  approved_at: z.string().nullable().optional(),
  created_at: z.string().optional(),
})

export const DealStatusHistorySchema = z.object({
  id: z.string().uuid().optional(),
  deal_id: z.string().uuid(),
  old_status: DealStatus.optional(),
  new_status: DealStatus,
  old_substatus: DealSubstatus.optional(),
  new_substatus: DealSubstatus.optional(),
  changed_by: z.string().uuid().nullable().optional(),
  reason: z.string().optional(),
  created_at: z.string().optional(),
})

export const DealCommentSchema = z.object({
  id: z.string().uuid().optional(),
  deal_id: z.string().uuid(),
  author_id: z.string().uuid().nullable().optional(),
  content: z.string().min(1, 'Comment content is required'),
  is_internal: z.boolean().default(false),
  parent_comment_id: z.string().uuid().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export const DealDocumentSchema = z.object({
  id: z.string().uuid().optional(),
  deal_id: z.string().uuid(),
  filename: z.string().min(1, 'Filename is required'),
  file_path: z.string().min(1, 'File path is required'),
  file_size: z.number().int().positive().optional(),
  mime_type: z.string().optional(),
  uploaded_by: z.string().uuid().nullable().optional(),
  is_required: z.boolean().default(false),
  document_type: z.string().optional(),
  created_at: z.string().optional(),
})

export const NotificationSchema = z.object({
  id: z.string().uuid().optional(),
  recipient_id: z.string().uuid(),
  type: NotificationType,
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  status: NotificationStatus.default('unread'),
  related_deal_id: z.string().uuid().nullable().optional(),
  action_url: z.string().optional(),
  created_at: z.string().optional(),
  read_at: z.string().nullable().optional(),
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
  priority: z.number().int().min(1).max(5).default(1),
  expected_close_date: z.string().optional(),
  deal_description: z.string().optional(),
})

// Multi-step deal form schemas
export const DealStep1Schema = z.object({
  reseller_id: z.string().uuid('Please select a reseller'),
  priority: z.number().int().min(1).max(5).default(1),
  expected_close_date: z.string().optional(),
  deal_description: z.string().optional(),
})

export const DealStep2Schema = z.object({
  end_user: z.object({
    id: z.string().uuid().optional(),
    company_name: z.string().min(1, 'Company name is required'),
    contact_name: z.string().min(1, 'Contact name is required'),
    contact_email: z.string().email('Valid email is required'),
    territory: z.string().min(1, 'Territory is required'),
  }),
})

export const DealStep3Schema = z.object({
  products: z.array(z.object({
    product_id: z.string().uuid('Please select a product'),
    quantity: z.number().int().positive('Quantity must be positive'),
    price: z.number().positive('Price must be positive'),
  })).min(1, 'At least one product is required'),
})

export const DealStep4Schema = z.object({
  documents: z.array(z.object({
    filename: z.string(),
    file_path: z.string(),
    document_type: z.string(),
    is_required: z.boolean().default(false),
  })).optional(),
  additional_notes: z.string().optional(),
})

export const SaveDraftSchema = z.object({
  reseller_id: z.string().uuid(),
  step_completed: z.number().int().min(1).max(4),
  draft_data: z.record(z.any()),
})

export const ApprovalActionSchema = z.object({
  deal_id: z.string().uuid(),
  action: ApprovalAction,
  comments: z.string().optional(),
  escalate_to: z.string().uuid().optional(),
})

export const CreateCommentSchema = z.object({
  deal_id: z.string().uuid(),
  content: z.string().min(1, 'Comment content is required'),
  is_internal: z.boolean().default(false),
  parent_comment_id: z.string().uuid().optional(),
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

// New workflow type exports
export type DealDraft = z.infer<typeof DealDraftSchema>
export type ApprovalWorkflow = z.infer<typeof ApprovalWorkflowSchema>
export type DealApproval = z.infer<typeof DealApprovalSchema>
export type DealStatusHistory = z.infer<typeof DealStatusHistorySchema>
export type DealComment = z.infer<typeof DealCommentSchema>
export type DealDocument = z.infer<typeof DealDocumentSchema>
export type Notification = z.infer<typeof NotificationSchema>

// Form type exports
export type DealStep1 = z.infer<typeof DealStep1Schema>
export type DealStep2 = z.infer<typeof DealStep2Schema>
export type DealStep3 = z.infer<typeof DealStep3Schema>
export type DealStep4 = z.infer<typeof DealStep4Schema>
export type SaveDraft = z.infer<typeof SaveDraftSchema>
export type ApprovalActionType = z.infer<typeof ApprovalActionSchema>
export type CreateComment = z.infer<typeof CreateCommentSchema>

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
