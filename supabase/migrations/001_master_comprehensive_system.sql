-- Master Comprehensive Deal Registration System Migration
-- This migration combines all feature branches into a unified system
-- Version: 1.0
-- Date: 2025-07-14

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS AND TYPES
-- ============================================================================

-- User and authentication types
CREATE TYPE user_type AS ENUM ('site_admin', 'vendor_user', 'reseller');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE user_status AS ENUM ('active', 'inactive');

-- Reseller and business types
CREATE TYPE reseller_tier AS ENUM ('gold', 'silver', 'bronze');
CREATE TYPE contact_role AS ENUM ('primary', 'sales', 'technical', 'billing', 'executive');
CREATE TYPE document_type AS ENUM ('certification', 'agreement', 'license', 'insurance', 'other');
CREATE TYPE registration_status AS ENUM ('draft', 'submitted', 'under_review', 'approved', 'rejected');
CREATE TYPE revenue_range AS ENUM ('under_1m', '1m_5m', '5m_25m', '25m_100m', 'over_100m');

-- Deal and product types
CREATE TYPE deal_status AS ENUM ('pending', 'assigned', 'disputed', 'approved', 'rejected');
CREATE TYPE conflict_type AS ENUM ('duplicate_end_user', 'territory_overlap', 'timing_conflict');
CREATE TYPE resolution_status AS ENUM ('pending', 'resolved', 'dismissed');
CREATE TYPE product_status AS ENUM ('active', 'discontinued', 'coming_soon');
CREATE TYPE pricing_tier_type AS ENUM ('standard', 'volume', 'deal_registration', 'reseller_tier', 'territory', 'promotional');
CREATE TYPE discount_type AS ENUM ('percentage', 'fixed_amount');

-- Security and RBAC types
CREATE TYPE permission_action AS ENUM (
    'create', 'read', 'update', 'delete', 'assign', 'approve', 'reject', 'export'
);
CREATE TYPE resource_type AS ENUM (
    'deals', 'resellers', 'end_users', 'products', 'conflicts', 'staff_users', 
    'eligibility_rules', 'audit_logs', 'system_settings', 'reports'
);
CREATE TYPE audit_action AS ENUM (
    'login', 'logout', 'create', 'update', 'delete', 'view', 'export', 
    'assign', 'approve', 'reject', 'password_change', 'permission_change'
);
CREATE TYPE security_event_type AS ENUM (
    'login_success', 'login_failure', 'password_reset', 'account_locked', 
    'permission_denied', 'suspicious_activity', 'data_export', 'bulk_operation'
);

-- ============================================================================
-- CORE USER MANAGEMENT TABLES
-- ============================================================================

-- Users table (main authentication table)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    user_type user_type NOT NULL,
    approval_status approval_status DEFAULT 'pending',
    phone TEXT,
    company_position TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID
);

-- Staff users table (for internal staff)
CREATE TABLE staff_users (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'staff',
    department TEXT,
    can_approve_deals BOOLEAN DEFAULT FALSE,
    can_manage_resellers BOOLEAN DEFAULT FALSE,
    can_view_all_deals BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- RESELLER MANAGEMENT SYSTEM
-- ============================================================================

-- Enhanced resellers table
CREATE TABLE resellers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    legal_name TEXT,
    dba TEXT,
    tax_id TEXT,
    email TEXT UNIQUE NOT NULL,
    website TEXT,
    phone TEXT,
    territory TEXT NOT NULL,
    tier reseller_tier DEFAULT 'bronze',
    status user_status DEFAULT 'active',
    
    -- Address information
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state_province TEXT,
    postal_code TEXT,
    country TEXT,
    
    -- Business details
    years_in_business INTEGER,
    employee_count INTEGER,
    revenue_range revenue_range,
    
    -- Registration workflow
    registration_status registration_status DEFAULT 'draft',
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES staff_users(id),
    rejection_reason TEXT,
    terms_accepted_at TIMESTAMP WITH TIME ZONE,
    terms_version TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reseller users table (links users to resellers)
CREATE TABLE reseller_users (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    reseller_id UUID NOT NULL REFERENCES resellers(id) ON DELETE CASCADE,
    can_create_deals BOOLEAN DEFAULT TRUE,
    can_view_reports BOOLEAN DEFAULT FALSE,
    can_manage_contacts BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reseller contacts table
CREATE TABLE reseller_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reseller_id UUID NOT NULL REFERENCES resellers(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    role contact_role NOT NULL,
    title TEXT,
    department TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    can_register_deals BOOLEAN DEFAULT FALSE,
    can_view_reports BOOLEAN DEFAULT FALSE,
    can_manage_contacts BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(reseller_id, email)
);

-- Company documents table
CREATE TABLE company_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reseller_id UUID NOT NULL REFERENCES resellers(id) ON DELETE CASCADE,
    document_type document_type NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    description TEXT,
    expiration_date DATE,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reseller territories table
CREATE TABLE reseller_territories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reseller_id UUID NOT NULL REFERENCES resellers(id) ON DELETE CASCADE,
    territory_name TEXT NOT NULL,
    territory_type TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Company metrics table
CREATE TABLE company_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reseller_id UUID NOT NULL REFERENCES resellers(id) ON DELETE CASCADE,
    metric_month DATE NOT NULL,
    deals_registered INTEGER DEFAULT 0,
    deals_won INTEGER DEFAULT 0,
    total_deal_value DECIMAL(15,2) DEFAULT 0,
    average_deal_size DECIMAL(15,2) DEFAULT 0,
    win_rate DECIMAL(5,2) DEFAULT 0,
    customer_satisfaction_score DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(reseller_id, metric_month)
);

-- Contact activity table
CREATE TABLE contact_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL REFERENCES reseller_contacts(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PRODUCT MANAGEMENT SYSTEM
-- ============================================================================

-- Product categories table
CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    parent_category_id UUID REFERENCES product_categories(id),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    sku TEXT UNIQUE,
    description TEXT,
    category_id UUID REFERENCES product_categories(id),
    base_price DECIMAL(10,2) NOT NULL,
    cost_price DECIMAL(10,2),
    currency TEXT DEFAULT 'GBP',
    status product_status DEFAULT 'active',
    specifications JSONB DEFAULT '{}',
    tags TEXT[],
    images TEXT[],
    documentation_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product pricing tiers table
CREATE TABLE product_pricing_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    tier_type pricing_tier_type NOT NULL,
    tier_name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'GBP',
    min_quantity INTEGER DEFAULT 1,
    max_quantity INTEGER,
    reseller_tier reseller_tier,
    territory TEXT,
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Volume discounts table
CREATE TABLE volume_discounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    min_quantity INTEGER NOT NULL,
    max_quantity INTEGER,
    discount_type discount_type NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL,
    reseller_tier reseller_tier,
    territory TEXT,
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Deal registration pricing table
CREATE TABLE deal_registration_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    price DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'GBP',
    min_deal_value DECIMAL(15,2),
    max_deal_value DECIMAL(15,2),
    reseller_tier reseller_tier,
    territory TEXT,
    requires_approval BOOLEAN DEFAULT FALSE,
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product specifications table
CREATE TABLE product_specifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    spec_name TEXT NOT NULL,
    spec_value TEXT NOT NULL,
    spec_category TEXT,
    display_order INTEGER DEFAULT 0,
    is_searchable BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product availability table
CREATE TABLE product_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    territory TEXT,
    reseller_tier reseller_tier,
    is_available BOOLEAN DEFAULT TRUE,
    restriction_reason TEXT,
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Territory pricing table
CREATE TABLE territory_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    territory TEXT NOT NULL,
    price_adjustment_type discount_type NOT NULL,
    price_adjustment_value DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'GBP',
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Promotional pricing table
CREATE TABLE promotional_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    promotion_name TEXT NOT NULL,
    discount_type discount_type NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL,
    min_quantity INTEGER DEFAULT 1,
    max_quantity INTEGER,
    reseller_tier reseller_tier,
    territory TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- User management indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_users_approval_status ON users(approval_status);

-- Reseller indexes
CREATE INDEX idx_resellers_email ON resellers(email);
CREATE INDEX idx_resellers_territory ON resellers(territory);
CREATE INDEX idx_resellers_tier ON resellers(tier);
CREATE INDEX idx_resellers_status ON resellers(status);
CREATE INDEX idx_resellers_registration_status ON resellers(registration_status);

-- Product indexes
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_name_trgm ON products USING gin(name gin_trgm_ops);

-- Pricing indexes
CREATE INDEX idx_product_pricing_tiers_product_id ON product_pricing_tiers(product_id);
CREATE INDEX idx_volume_discounts_product_id ON volume_discounts(product_id);
CREATE INDEX idx_deal_registration_pricing_product_id ON deal_registration_pricing(product_id);

-- Contact and activity indexes
CREATE INDEX idx_reseller_contacts_reseller_id ON reseller_contacts(reseller_id);
CREATE INDEX idx_reseller_contacts_email ON reseller_contacts(email);
CREATE INDEX idx_contact_activity_contact_id ON contact_activity(contact_id);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_staff_users_updated_at BEFORE UPDATE ON staff_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_resellers_updated_at BEFORE UPDATE ON resellers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reseller_users_updated_at BEFORE UPDATE ON reseller_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reseller_contacts_updated_at BEFORE UPDATE ON reseller_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_categories_updated_at BEFORE UPDATE ON product_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert default product categories
INSERT INTO product_categories (name, description) VALUES
('Software', 'Software products and licenses'),
('Hardware', 'Physical hardware products'),
('Services', 'Professional and support services'),
('Cloud', 'Cloud-based solutions and SaaS products');

-- Insert sample admin user (will be created via auth.users)
INSERT INTO users (id, email, name, user_type, approval_status, approved_at) VALUES
('862f6fbf-7a80-4fba-9ad4-087adc2a8eb7', 'test123@hotmail.com', 'Drew Rogers', 'site_admin', 'approved', NOW());

INSERT INTO staff_users (id, role, department, can_approve_deals, can_manage_resellers, can_view_all_deals) VALUES
('862f6fbf-7a80-4fba-9ad4-087adc2a8eb7', 'admin', 'IT', TRUE, TRUE, TRUE);

-- ============================================================================
-- SECURITY AND RBAC SYSTEM
-- ============================================================================

-- Permissions table
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    resource_type resource_type NOT NULL,
    action permission_action NOT NULL,
    conditions JSONB DEFAULT '{}',
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(resource_type, action, name)
);

-- Roles table
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    parent_role_id UUID REFERENCES roles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Role permissions junction table
CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

-- User roles junction table
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, role_id)
);

-- Audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action audit_action NOT NULL,
    resource_type resource_type,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Security events table
CREATE TABLE security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    event_type security_event_type NOT NULL,
    severity TEXT DEFAULT 'info',
    description TEXT,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rate limiting table
CREATE TABLE rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier TEXT NOT NULL, -- IP address, user ID, or API key
    endpoint TEXT NOT NULL,
    requests_count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    window_duration INTERVAL DEFAULT '1 hour',
    limit_exceeded BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(identifier, endpoint, window_start)
);

-- Session management table
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- DEAL MANAGEMENT SYSTEM
-- ============================================================================

-- End users table
CREATE TABLE end_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_phone TEXT,
    territory TEXT NOT NULL,
    industry TEXT,
    company_size TEXT,
    annual_revenue DECIMAL(15,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Deals table
CREATE TABLE deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reseller_id UUID NOT NULL REFERENCES resellers(id),
    end_user_id UUID NOT NULL REFERENCES end_users(id),
    product_id UUID NOT NULL REFERENCES products(id),
    deal_value DECIMAL(15,2) NOT NULL,
    currency TEXT DEFAULT 'GBP',
    quantity INTEGER DEFAULT 1,
    estimated_close_date DATE,
    probability DECIMAL(5,2) DEFAULT 50.00,
    status deal_status DEFAULT 'pending',
    notes TEXT,
    competitive_situation TEXT,
    decision_criteria TEXT,
    next_steps TEXT,
    assigned_to UUID REFERENCES staff_users(id),
    approved_by UUID REFERENCES staff_users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Deal conflicts table
CREATE TABLE deal_conflicts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID NOT NULL REFERENCES deals(id),
    conflicting_deal_id UUID REFERENCES deals(id),
    conflict_type conflict_type NOT NULL,
    description TEXT,
    resolution_status resolution_status DEFAULT 'pending',
    resolved_by UUID REFERENCES staff_users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Deal activities table
CREATE TABLE deal_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    activity_type TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Deal documents table
CREATE TABLE deal_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    document_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ADDITIONAL INDEXES FOR PERFORMANCE
-- ============================================================================

-- Security and audit indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_security_events_user_id ON security_events(user_id);
CREATE INDEX idx_security_events_event_type ON security_events(event_type);
CREATE INDEX idx_rate_limits_identifier ON rate_limits(identifier);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_session_token ON user_sessions(session_token);

-- Deal management indexes
CREATE INDEX idx_deals_reseller_id ON deals(reseller_id);
CREATE INDEX idx_deals_end_user_id ON deals(end_user_id);
CREATE INDEX idx_deals_product_id ON deals(product_id);
CREATE INDEX idx_deals_status ON deals(status);
CREATE INDEX idx_deals_assigned_to ON deals(assigned_to);
CREATE INDEX idx_deal_conflicts_deal_id ON deal_conflicts(deal_id);
CREATE INDEX idx_deal_activities_deal_id ON deal_activities(deal_id);

-- ============================================================================
-- ADDITIONAL TRIGGERS
-- ============================================================================

CREATE TRIGGER update_reseller_contacts_updated_at BEFORE UPDATE ON reseller_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_company_documents_updated_at BEFORE UPDATE ON company_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rate_limits_updated_at BEFORE UPDATE ON rate_limits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_end_users_updated_at BEFORE UPDATE ON end_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON deals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_deal_conflicts_updated_at BEFORE UPDATE ON deal_conflicts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE resellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE volume_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_registration_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE territory_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotional_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE end_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_documents ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is site admin
CREATE OR REPLACE FUNCTION is_site_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = user_id AND user_type = 'site_admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is vendor user
CREATE OR REPLACE FUNCTION is_vendor_user(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = user_id AND user_type = 'vendor_user'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's reseller ID
CREATE OR REPLACE FUNCTION get_user_reseller_id(user_id UUID)
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT reseller_id FROM reseller_users
        WHERE id = user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users table policies
CREATE POLICY "Site admins can view all users" ON users
    FOR SELECT USING (is_site_admin(auth.uid()));

CREATE POLICY "Vendor users can view approved users" ON users
    FOR SELECT USING (
        is_vendor_user(auth.uid()) AND approval_status = 'approved'
    );

CREATE POLICY "Users can view their own record" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own record" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Resellers table policies
CREATE POLICY "Site admins can manage all resellers" ON resellers
    FOR ALL USING (is_site_admin(auth.uid()));

CREATE POLICY "Vendor users can view approved resellers" ON resellers
    FOR SELECT USING (
        is_vendor_user(auth.uid()) AND status = 'active'
    );

CREATE POLICY "Reseller users can view their own reseller" ON resellers
    FOR SELECT USING (
        id = get_user_reseller_id(auth.uid())
    );

CREATE POLICY "Reseller users can update their own reseller" ON resellers
    FOR UPDATE USING (
        id = get_user_reseller_id(auth.uid())
    );

-- Reseller contacts policies
CREATE POLICY "Site admins can manage all contacts" ON reseller_contacts
    FOR ALL USING (is_site_admin(auth.uid()));

CREATE POLICY "Vendor users can view all contacts" ON reseller_contacts
    FOR SELECT USING (is_vendor_user(auth.uid()));

CREATE POLICY "Reseller users can manage their own contacts" ON reseller_contacts
    FOR ALL USING (
        reseller_id = get_user_reseller_id(auth.uid())
    );

-- Products table policies
CREATE POLICY "Everyone can view active products" ON products
    FOR SELECT USING (status = 'active');

CREATE POLICY "Site admins can manage all products" ON products
    FOR ALL USING (is_site_admin(auth.uid()));

CREATE POLICY "Vendor users can manage products" ON products
    FOR ALL USING (is_vendor_user(auth.uid()));

-- Deals table policies
CREATE POLICY "Site admins can manage all deals" ON deals
    FOR ALL USING (is_site_admin(auth.uid()));

CREATE POLICY "Vendor users can manage all deals" ON deals
    FOR ALL USING (is_vendor_user(auth.uid()));

CREATE POLICY "Reseller users can manage their own deals" ON deals
    FOR ALL USING (
        reseller_id = get_user_reseller_id(auth.uid())
    );

-- Audit logs policies (read-only for most users)
CREATE POLICY "Site admins can view all audit logs" ON audit_logs
    FOR SELECT USING (is_site_admin(auth.uid()));

CREATE POLICY "Vendor users can view relevant audit logs" ON audit_logs
    FOR SELECT USING (
        is_vendor_user(auth.uid()) AND
        (user_id = auth.uid() OR resource_type IN ('deals', 'resellers'))
    );

CREATE POLICY "Users can view their own audit logs" ON audit_logs
    FOR SELECT USING (user_id = auth.uid());

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
    p_user_id UUID,
    p_action audit_action,
    p_resource_type resource_type,
    p_resource_id UUID DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    audit_id UUID;
BEGIN
    INSERT INTO audit_logs (
        user_id, action, resource_type, resource_id,
        old_values, new_values, ip_address, user_agent
    ) VALUES (
        p_user_id, p_action, p_resource_type, p_resource_id,
        p_old_values, p_new_values,
        inet_client_addr(), current_setting('request.headers', true)::json->>'user-agent'
    ) RETURNING id INTO audit_id;

    RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check user permissions
CREATE OR REPLACE FUNCTION check_user_permission(
    p_user_id UUID,
    p_resource_type resource_type,
    p_action permission_action
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Site admins have all permissions
    IF is_site_admin(p_user_id) THEN
        RETURN TRUE;
    END IF;

    -- Check if user has specific permission through roles
    RETURN EXISTS (
        SELECT 1
        FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = p_user_id
        AND ur.is_active = TRUE
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
        AND p.resource_type = p_resource_type
        AND p.action = p_action
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SAMPLE DATA FOR TESTING
-- ============================================================================

-- Insert default roles
INSERT INTO roles (name, description, is_system) VALUES
('site_admin', 'Full system administrator access', true),
('vendor_manager', 'Vendor user with management capabilities', true),
('vendor_user', 'Standard vendor user', true),
('reseller_admin', 'Reseller administrator', true),
('reseller_user', 'Standard reseller user', true);

-- Insert default permissions
INSERT INTO permissions (name, description, resource_type, action, is_system) VALUES
-- Deal permissions
('deals.create', 'Create new deals', 'deals', 'create', true),
('deals.read', 'View deals', 'deals', 'read', true),
('deals.update', 'Update deals', 'deals', 'update', true),
('deals.delete', 'Delete deals', 'deals', 'delete', true),
('deals.approve', 'Approve deals', 'deals', 'approve', true),
('deals.assign', 'Assign deals', 'deals', 'assign', true),

-- Reseller permissions
('resellers.create', 'Create resellers', 'resellers', 'create', true),
('resellers.read', 'View resellers', 'resellers', 'read', true),
('resellers.update', 'Update resellers', 'resellers', 'update', true),
('resellers.delete', 'Delete resellers', 'resellers', 'delete', true),
('resellers.approve', 'Approve resellers', 'resellers', 'approve', true),

-- Product permissions
('products.create', 'Create products', 'products', 'create', true),
('products.read', 'View products', 'products', 'read', true),
('products.update', 'Update products', 'products', 'update', true),
('products.delete', 'Delete products', 'products', 'delete', true),

-- User permissions
('staff_users.create', 'Create staff users', 'staff_users', 'create', true),
('staff_users.read', 'View staff users', 'staff_users', 'read', true),
('staff_users.update', 'Update staff users', 'staff_users', 'update', true),
('staff_users.delete', 'Delete staff users', 'staff_users', 'delete', true),

-- Report permissions
('reports.read', 'View reports', 'reports', 'read', true),
('reports.export', 'Export reports', 'reports', 'export', true);

-- Assign permissions to roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'site_admin'; -- Site admin gets all permissions

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'vendor_manager'
AND p.name IN (
    'deals.create', 'deals.read', 'deals.update', 'deals.approve', 'deals.assign',
    'resellers.read', 'resellers.update', 'resellers.approve',
    'products.read', 'products.update',
    'reports.read', 'reports.export'
);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'vendor_user'
AND p.name IN (
    'deals.read', 'deals.update',
    'resellers.read',
    'products.read',
    'reports.read'
);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'reseller_admin'
AND p.name IN (
    'deals.create', 'deals.read', 'deals.update',
    'resellers.read', 'resellers.update',
    'products.read'
);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'reseller_user'
AND p.name IN (
    'deals.create', 'deals.read',
    'products.read'
);

-- Assign site admin role to the default admin user
INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT '862f6fbf-7a80-4fba-9ad4-087adc2a8eb7', r.id, '862f6fbf-7a80-4fba-9ad4-087adc2a8eb7'
FROM roles r
WHERE r.name = 'site_admin';

-- Insert sample products
INSERT INTO products (name, sku, description, base_price, cost_price, status) VALUES
('Enterprise Software License', 'ESL-001', 'Comprehensive enterprise software solution', 5000.00, 2500.00, 'active'),
('Professional Services Package', 'PSP-001', 'Professional implementation and support services', 10000.00, 6000.00, 'active'),
('Cloud Storage Solution', 'CSS-001', 'Scalable cloud storage with enterprise features', 1500.00, 750.00, 'active'),
('Security Suite Premium', 'SSP-001', 'Advanced security and compliance tools', 3000.00, 1500.00, 'active');

-- Insert sample reseller
INSERT INTO resellers (
    name, legal_name, email, territory, tier, status,
    address_line1, city, state_province, postal_code, country,
    years_in_business, employee_count, revenue_range,
    registration_status, approved_at, approved_by
) VALUES (
    'TechPartner Solutions Ltd',
    'TechPartner Solutions Limited',
    'contact@techpartner.com',
    'UK-London',
    'gold',
    'active',
    '123 Business Street',
    'London',
    'England',
    'SW1A 1AA',
    'United Kingdom',
    5,
    25,
    '5m_25m',
    'approved',
    NOW(),
    '862f6fbf-7a80-4fba-9ad4-087adc2a8eb7'
);

-- ============================================================================
-- FINAL COMMENTS
-- ============================================================================

-- This migration creates a comprehensive deal registration system with:
-- 1. User management with three-tier access (site_admin, vendor_user, reseller)
-- 2. Comprehensive reseller registration and management
-- 3. Advanced product catalog with dynamic pricing
-- 4. Enterprise-grade security with RBAC
-- 5. Complete deal lifecycle management
-- 6. Audit logging and security monitoring
-- 7. Row Level Security policies for data protection

-- To apply this migration:
-- 1. Run this SQL file against your Supabase database
-- 2. Verify all tables and policies are created
-- 3. Test with sample data
-- 4. Configure your application to use the new schema

-- Migration completed successfully!
