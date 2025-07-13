// Mock data for development when Supabase is not configured

export const mockResellers = [
  {
    id: '1',
    name: 'TechPartner Solutions',
    email: 'contact@techpartner.com',
    territory: 'Northeast US',
    tier: 'gold',
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'Channel Pro',
    email: 'sales@channelpro.com',
    territory: 'Southeast US',
    tier: 'silver',
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '3',
    name: 'Regional Partners',
    email: 'info@regionalpartners.com',
    territory: 'West Coast',
    tier: 'gold',
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
]

export const mockProducts = [
  {
    id: '1',
    name: 'Enterprise Software License',
    category: 'Software',
    list_price: 50000,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'Professional Services',
    category: 'Services',
    list_price: 25000,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '3',
    name: 'Support Package',
    category: 'Support',
    list_price: 10000,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
]

export const mockDeals = [
  {
    id: '1',
    reseller_id: '1',
    end_user_id: '1',
    assigned_reseller_id: null,
    status: 'pending',
    total_value: 75000,
    submission_date: '2024-01-15T00:00:00Z',
    assignment_date: null,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
    reseller: mockResellers[0],
    end_user: {
      id: '1',
      company_name: 'Acme Corporation',
      contact_name: 'John Smith',
      contact_email: 'john.smith@acme.com',
      territory: 'Northeast US',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    assigned_reseller: null,
    products: [
      {
        id: '1',
        deal_id: '1',
        product_id: '1',
        quantity: 1,
        price: 50000,
        created_at: '2024-01-15T00:00:00Z',
        product: mockProducts[0]
      },
      {
        id: '2',
        deal_id: '1',
        product_id: '2',
        quantity: 1,
        price: 25000,
        created_at: '2024-01-15T00:00:00Z',
        product: mockProducts[1]
      }
    ],
    conflicts: []
  },
  {
    id: '2',
    reseller_id: '2',
    end_user_id: '2',
    assigned_reseller_id: null,
    status: 'disputed',
    total_value: 60000,
    submission_date: '2024-01-14T00:00:00Z',
    assignment_date: null,
    created_at: '2024-01-14T00:00:00Z',
    updated_at: '2024-01-14T00:00:00Z',
    reseller: mockResellers[1],
    end_user: {
      id: '2',
      company_name: 'Global Tech Inc',
      contact_name: 'Sarah Johnson',
      contact_email: 'sarah.j@globaltech.com',
      territory: 'West Coast',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    assigned_reseller: null,
    products: [
      {
        id: '3',
        deal_id: '2',
        product_id: '1',
        quantity: 1,
        price: 50000,
        created_at: '2024-01-14T00:00:00Z',
        product: mockProducts[0]
      }
    ],
    conflicts: [
      {
        id: '1',
        deal_id: '2',
        competing_deal_id: '1',
        conflict_type: 'territory_overlap',
        resolution_status: 'pending',
        assigned_to_staff: null,
        created_at: '2024-01-14T00:00:00Z',
        updated_at: '2024-01-14T00:00:00Z'
      }
    ]
  }
]

export const mockConflicts = [
  {
    id: '1',
    deal_id: '2',
    competing_deal_id: '1',
    conflict_type: 'territory_overlap',
    resolution_status: 'pending',
    assigned_to_staff: null,
    created_at: '2024-01-14T00:00:00Z',
    updated_at: '2024-01-14T00:00:00Z',
    deal: mockDeals[1],
    competing_deal: mockDeals[0],
    assigned_staff: null
  }
]

export const mockMetrics = {
  deals: {
    total: 156,
    pending: 23,
    assigned: 89,
    disputed: 8,
    approved: 32,
    rejected: 4,
    recent: 12,
    growth: 15
  },
  conflicts: {
    total: 8,
    pending: 3,
    resolved: 4,
    dismissed: 1,
    avgResolutionTime: 2.3
  },
  financial: {
    totalValue: 2450000,
    avgDealValue: 15705,
    growth: 12
  },
  activity: {
    recentDeals: 12,
    activeConflicts: 3,
    assignmentsPending: 23
  }
}
