-- Deal Registration System Database Schema
-- This file contains the complete database schema for the deal registration system

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create custom types
CREATE TYPE reseller_tier AS ENUM ('gold', 'silver', 'bronze');
CREATE TYPE user_status AS ENUM ('active', 'inactive');
CREATE TYPE deal_status AS ENUM ('pending', 'assigned', 'disputed', 'approved', 'rejected');
CREATE TYPE conflict_type AS ENUM ('duplicate_end_user', 'territory_overlap', 'timing_conflict');
CREATE TYPE resolution_status AS ENUM ('pending', 'resolved', 'dismissed');
CREATE TYPE staff_role AS ENUM ('admin', 'manager', 'staff');
CREATE TYPE product_status AS ENUM ('active', 'discontinued', 'coming_soon');
CREATE TYPE pricing_tier_type AS ENUM ('standard', 'volume', 'deal_registration', 'reseller_tier', 'territory', 'promotional');
CREATE TYPE discount_type AS ENUM ('percentage', 'fixed_amount');

-- Staff Users table (for authentication and role management)
CREATE TABLE staff_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role staff_role DEFAULT 'staff',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Resellers table
CREATE TABLE resellers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    territory TEXT NOT NULL,
    tier reseller_tier DEFAULT 'bronze',
    status user_status DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- End Users table
CREATE TABLE end_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    territory TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product Categories table (hierarchical)
CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES product_categories(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table (enhanced)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    sku TEXT UNIQUE,
    description TEXT,
    category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
    category TEXT NOT NULL, -- Keep for backward compatibility
    list_price DECIMAL(12,2) NOT NULL CHECK (list_price > 0),
    cost_price DECIMAL(12,2),
    status product_status DEFAULT 'active',
    image_url TEXT,
    documentation_url TEXT,
    specifications JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product Pricing Tiers table
CREATE TABLE product_pricing_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    tier_type pricing_tier_type NOT NULL,
    tier_name TEXT NOT NULL,
    price DECIMAL(12,2) NOT NULL CHECK (price >= 0),
    min_quantity INTEGER DEFAULT 1,
    max_quantity INTEGER,
    reseller_tier reseller_tier,
    territory TEXT,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, tier_type, tier_name)
);

-- Volume Discounts table
CREATE TABLE volume_discounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    min_quantity INTEGER NOT NULL CHECK (min_quantity > 0),
    max_quantity INTEGER CHECK (max_quantity IS NULL OR max_quantity >= min_quantity),
    discount_type discount_type NOT NULL,
    discount_value DECIMAL(12,4) NOT NULL CHECK (discount_value >= 0),
    reseller_tier reseller_tier,
    territory TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Deal Registration Pricing table
CREATE TABLE deal_registration_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    deal_registration_price DECIMAL(12,2) NOT NULL CHECK (deal_registration_price >= 0),
    min_deal_value DECIMAL(12,2),
    max_deal_value DECIMAL(12,2),
    reseller_tier reseller_tier,
    territory TEXT,
    requires_approval BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product Availability table
CREATE TABLE product_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    reseller_id UUID REFERENCES resellers(id) ON DELETE CASCADE,
    territory TEXT,
    reseller_tier reseller_tier,
    is_available BOOLEAN DEFAULT true,
    restriction_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Territory Pricing table
CREATE TABLE territory_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    territory TEXT NOT NULL,
    price_multiplier DECIMAL(8,4) DEFAULT 1.0000 CHECK (price_multiplier > 0),
    currency_code TEXT DEFAULT 'GBP',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, territory)
);

-- Promotional Pricing table
CREATE TABLE promotional_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    promotion_name TEXT NOT NULL,
    discount_type discount_type NOT NULL,
    discount_value DECIMAL(12,4) NOT NULL CHECK (discount_value >= 0),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    reseller_tier reseller_tier,
    territory TEXT,
    min_quantity INTEGER DEFAULT 1,
    max_usage_per_reseller INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (end_date > start_date)
);

-- Deals table
CREATE TABLE deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reseller_id UUID NOT NULL REFERENCES resellers(id) ON DELETE CASCADE,
    end_user_id UUID NOT NULL REFERENCES end_users(id) ON DELETE CASCADE,
    assigned_reseller_id UUID REFERENCES resellers(id) ON DELETE SET NULL,
    status deal_status DEFAULT 'pending',
    total_value DECIMAL(12,2) NOT NULL CHECK (total_value > 0),
    submission_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assignment_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Deal Products table (line items)
CREATE TABLE deal_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price DECIMAL(12,2) NOT NULL CHECK (price > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(deal_id, product_id)
);

-- Deal Conflicts table
CREATE TABLE deal_conflicts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    competing_deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    conflict_type conflict_type NOT NULL,
    resolution_status resolution_status DEFAULT 'pending',
    assigned_to_staff UUID REFERENCES staff_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (deal_id != competing_deal_id)
);

-- Assignment History table (audit trail)
CREATE TABLE assignment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    old_reseller_id UUID REFERENCES resellers(id) ON DELETE SET NULL,
    new_reseller_id UUID REFERENCES resellers(id) ON DELETE SET NULL,
    assigned_by UUID REFERENCES staff_users(id) ON DELETE SET NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Eligibility Rules table (configurable business rules)
CREATE TABLE eligibility_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    rule_type TEXT NOT NULL, -- 'territory', 'product', 'deal_size', 'partner_tier'
    conditions JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_resellers_territory ON resellers(territory);
CREATE INDEX idx_resellers_tier ON resellers(tier);
CREATE INDEX idx_resellers_status ON resellers(status);

CREATE INDEX idx_end_users_company_name ON end_users(company_name);
CREATE INDEX idx_end_users_territory ON end_users(territory);
CREATE INDEX idx_end_users_contact_email ON end_users(contact_email);

-- Product category indexes
CREATE INDEX idx_product_categories_parent_id ON product_categories(parent_id);
CREATE INDEX idx_product_categories_name ON product_categories(name);
CREATE INDEX idx_product_categories_is_active ON product_categories(is_active);

-- Product indexes
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_sku ON products(sku);

-- Product pricing tier indexes
CREATE INDEX idx_product_pricing_tiers_product_id ON product_pricing_tiers(product_id);
CREATE INDEX idx_product_pricing_tiers_tier_type ON product_pricing_tiers(tier_type);
CREATE INDEX idx_product_pricing_tiers_reseller_tier ON product_pricing_tiers(reseller_tier);
CREATE INDEX idx_product_pricing_tiers_territory ON product_pricing_tiers(territory);
CREATE INDEX idx_product_pricing_tiers_active ON product_pricing_tiers(is_active);

-- Volume discount indexes
CREATE INDEX idx_volume_discounts_product_id ON volume_discounts(product_id);
CREATE INDEX idx_volume_discounts_quantity ON volume_discounts(min_quantity, max_quantity);
CREATE INDEX idx_volume_discounts_reseller_tier ON volume_discounts(reseller_tier);
CREATE INDEX idx_volume_discounts_active ON volume_discounts(is_active);

-- Deal registration pricing indexes
CREATE INDEX idx_deal_registration_pricing_product_id ON deal_registration_pricing(product_id);
CREATE INDEX idx_deal_registration_pricing_reseller_tier ON deal_registration_pricing(reseller_tier);
CREATE INDEX idx_deal_registration_pricing_territory ON deal_registration_pricing(territory);
CREATE INDEX idx_deal_registration_pricing_active ON deal_registration_pricing(is_active);

-- Product availability indexes
CREATE INDEX idx_product_availability_product_id ON product_availability(product_id);
CREATE INDEX idx_product_availability_reseller_id ON product_availability(reseller_id);
CREATE INDEX idx_product_availability_territory ON product_availability(territory);
CREATE INDEX idx_product_availability_reseller_tier ON product_availability(reseller_tier);

-- Territory pricing indexes
CREATE INDEX idx_territory_pricing_product_id ON territory_pricing(product_id);
CREATE INDEX idx_territory_pricing_territory ON territory_pricing(territory);
CREATE INDEX idx_territory_pricing_active ON territory_pricing(is_active);

-- Promotional pricing indexes
CREATE INDEX idx_promotional_pricing_product_id ON promotional_pricing(product_id);
CREATE INDEX idx_promotional_pricing_dates ON promotional_pricing(start_date, end_date);
CREATE INDEX idx_promotional_pricing_reseller_tier ON promotional_pricing(reseller_tier);
CREATE INDEX idx_promotional_pricing_territory ON promotional_pricing(territory);
CREATE INDEX idx_promotional_pricing_active ON promotional_pricing(is_active);

CREATE INDEX idx_deals_reseller_id ON deals(reseller_id);
CREATE INDEX idx_deals_end_user_id ON deals(end_user_id);
CREATE INDEX idx_deals_assigned_reseller_id ON deals(assigned_reseller_id);
CREATE INDEX idx_deals_status ON deals(status);
CREATE INDEX idx_deals_submission_date ON deals(submission_date);
CREATE INDEX idx_deals_total_value ON deals(total_value);

CREATE INDEX idx_deal_products_deal_id ON deal_products(deal_id);
CREATE INDEX idx_deal_products_product_id ON deal_products(product_id);

CREATE INDEX idx_deal_conflicts_deal_id ON deal_conflicts(deal_id);
CREATE INDEX idx_deal_conflicts_competing_deal_id ON deal_conflicts(competing_deal_id);
CREATE INDEX idx_deal_conflicts_resolution_status ON deal_conflicts(resolution_status);
CREATE INDEX idx_deal_conflicts_conflict_type ON deal_conflicts(conflict_type);

-- Full-text search indexes
CREATE INDEX idx_resellers_name_gin ON resellers USING gin(name gin_trgm_ops);
CREATE INDEX idx_end_users_company_name_gin ON end_users USING gin(company_name gin_trgm_ops);
CREATE INDEX idx_products_name_gin ON products USING gin(name gin_trgm_ops);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_staff_users_updated_at BEFORE UPDATE ON staff_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_resellers_updated_at BEFORE UPDATE ON resellers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_end_users_updated_at BEFORE UPDATE ON end_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_categories_updated_at BEFORE UPDATE ON product_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_pricing_tiers_updated_at BEFORE UPDATE ON product_pricing_tiers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_volume_discounts_updated_at BEFORE UPDATE ON volume_discounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_deal_registration_pricing_updated_at BEFORE UPDATE ON deal_registration_pricing FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_availability_updated_at BEFORE UPDATE ON product_availability FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_territory_pricing_updated_at BEFORE UPDATE ON territory_pricing FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_promotional_pricing_updated_at BEFORE UPDATE ON promotional_pricing FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON deals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_deal_conflicts_updated_at BEFORE UPDATE ON deal_conflicts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_eligibility_rules_updated_at BEFORE UPDATE ON eligibility_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate deal total value from products
CREATE OR REPLACE FUNCTION calculate_deal_total(deal_uuid UUID)
RETURNS DECIMAL AS $$
DECLARE
    total DECIMAL(12,2);
BEGIN
    SELECT COALESCE(SUM(quantity * price), 0)
    INTO total
    FROM deal_products
    WHERE deal_id = deal_uuid;
    
    RETURN total;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update deal total_value when products change
CREATE OR REPLACE FUNCTION update_deal_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE deals 
    SET total_value = calculate_deal_total(COALESCE(NEW.deal_id, OLD.deal_id))
    WHERE id = COALESCE(NEW.deal_id, OLD.deal_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_deal_total_on_products_change
    AFTER INSERT OR UPDATE OR DELETE ON deal_products
    FOR EACH ROW EXECUTE FUNCTION update_deal_total();

-- Function to detect potential conflicts
CREATE OR REPLACE FUNCTION detect_deal_conflicts(new_deal_id UUID)
RETURNS TABLE(
    conflicting_deal_id UUID,
    conflict_type_detected conflict_type,
    similarity_score DECIMAL
) AS $$
BEGIN
    -- Detect duplicate end user conflicts
    RETURN QUERY
    SELECT 
        d.id as conflicting_deal_id,
        'duplicate_end_user'::conflict_type as conflict_type_detected,
        similarity(eu1.company_name, eu2.company_name) as similarity_score
    FROM deals d
    JOIN end_users eu1 ON d.end_user_id = eu1.id
    JOIN deals new_deal ON new_deal.id = new_deal_id
    JOIN end_users eu2 ON new_deal.end_user_id = eu2.id
    WHERE d.id != new_deal_id
    AND d.status NOT IN ('rejected')
    AND similarity(eu1.company_name, eu2.company_name) > 0.7
    AND d.submission_date > (new_deal.submission_date - INTERVAL '90 days');
    
    -- Detect territory overlap conflicts
    RETURN QUERY
    SELECT 
        d.id as conflicting_deal_id,
        'territory_overlap'::conflict_type as conflict_type_detected,
        0.8::DECIMAL as similarity_score
    FROM deals d
    JOIN end_users eu1 ON d.end_user_id = eu1.id
    JOIN resellers r1 ON d.reseller_id = r1.id
    JOIN deals new_deal ON new_deal.id = new_deal_id
    JOIN end_users eu2 ON new_deal.end_user_id = eu2.id
    JOIN resellers r2 ON new_deal.reseller_id = r2.id
    WHERE d.id != new_deal_id
    AND d.status NOT IN ('rejected')
    AND r1.id != r2.id
    AND (eu1.territory = eu2.territory OR r1.territory = r2.territory)
    AND similarity(eu1.company_name, eu2.company_name) > 0.5;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE resellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE end_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE volume_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_registration_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE territory_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotional_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE eligibility_rules ENABLE ROW LEVEL SECURITY;

-- Staff users policies (only authenticated staff can access)
CREATE POLICY "Staff can view all staff users" ON staff_users
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage staff users" ON staff_users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM staff_users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Resellers policies (staff can view/manage all)
CREATE POLICY "Staff can view all resellers" ON resellers
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage resellers" ON resellers
    FOR ALL USING (auth.role() = 'authenticated');

-- End users policies (staff can view/manage all)
CREATE POLICY "Staff can view all end users" ON end_users
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage end users" ON end_users
    FOR ALL USING (auth.role() = 'authenticated');

-- Products policies (staff can view/manage all)
CREATE POLICY "Staff can view all products" ON products
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Managers and admins can manage products" ON products
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM staff_users
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Product categories policies
CREATE POLICY "Staff can view all product categories" ON product_categories
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Managers and admins can manage product categories" ON product_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM staff_users
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Product pricing tiers policies
CREATE POLICY "Staff can view all pricing tiers" ON product_pricing_tiers
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Managers and admins can manage pricing tiers" ON product_pricing_tiers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM staff_users
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Volume discounts policies
CREATE POLICY "Staff can view all volume discounts" ON volume_discounts
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Managers and admins can manage volume discounts" ON volume_discounts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM staff_users
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Deal registration pricing policies
CREATE POLICY "Staff can view all deal registration pricing" ON deal_registration_pricing
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Managers and admins can manage deal registration pricing" ON deal_registration_pricing
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM staff_users
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Product availability policies
CREATE POLICY "Staff can view all product availability" ON product_availability
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Managers and admins can manage product availability" ON product_availability
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM staff_users
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Territory pricing policies
CREATE POLICY "Staff can view all territory pricing" ON territory_pricing
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Managers and admins can manage territory pricing" ON territory_pricing
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM staff_users
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Promotional pricing policies
CREATE POLICY "Staff can view all promotional pricing" ON promotional_pricing
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Managers and admins can manage promotional pricing" ON promotional_pricing
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM staff_users
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Deals policies (staff can view/manage all)
CREATE POLICY "Staff can view all deals" ON deals
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage deals" ON deals
    FOR ALL USING (auth.role() = 'authenticated');

-- Deal products policies (follow deal permissions)
CREATE POLICY "Staff can view all deal products" ON deal_products
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage deal products" ON deal_products
    FOR ALL USING (auth.role() = 'authenticated');

-- Deal conflicts policies (staff can view/manage all)
CREATE POLICY "Staff can view all conflicts" ON deal_conflicts
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage conflicts" ON deal_conflicts
    FOR ALL USING (auth.role() = 'authenticated');

-- Assignment history policies (read-only for audit)
CREATE POLICY "Staff can view assignment history" ON assignment_history
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can create assignment history" ON assignment_history
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Eligibility rules policies (admin/manager only)
CREATE POLICY "Staff can view eligibility rules" ON eligibility_rules
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Managers and admins can manage eligibility rules" ON eligibility_rules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM staff_users
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Sample data for testing
INSERT INTO staff_users (email, name, role) VALUES
    ('admin@company.com', 'System Admin', 'admin'),
    ('manager@company.com', 'Deal Manager', 'manager'),
    ('staff@company.com', 'Deal Staff', 'staff');

INSERT INTO products (name, category, list_price) VALUES
    ('Enterprise Software License', 'Software', 50000.00),
    ('Professional Services', 'Services', 25000.00),
    ('Support Package', 'Support', 10000.00),
    ('Training Program', 'Training', 15000.00),
    ('Hardware Solution', 'Hardware', 75000.00);

INSERT INTO resellers (name, email, territory, tier) VALUES
    ('TechPartner Solutions', 'contact@techpartner.com', 'Northeast US', 'gold'),
    ('Channel Pro', 'sales@channelpro.com', 'Southeast US', 'silver'),
    ('Regional Partners', 'info@regionalpartners.com', 'West Coast', 'gold'),
    ('Enterprise Solutions', 'deals@enterprisesol.com', 'Midwest US', 'bronze'),
    ('Global Systems', 'partners@globalsys.com', 'International', 'gold');

INSERT INTO end_users (company_name, contact_name, contact_email, territory) VALUES
    ('Acme Corporation', 'John Smith', 'john.smith@acme.com', 'Northeast US'),
    ('Global Tech Inc', 'Sarah Johnson', 'sarah.j@globaltech.com', 'West Coast'),
    ('StartupTech', 'Mike Chen', 'mike@startuptech.com', 'Southeast US'),
    ('Enterprise Corp', 'Lisa Brown', 'lisa.brown@enterprise.com', 'Midwest US'),
    ('Innovation Labs', 'David Wilson', 'david@innovationlabs.com', 'International');

-- Sample product categories
INSERT INTO product_categories (name, description, sort_order) VALUES
    ('Software', 'Software products and licenses', 1),
    ('Hardware', 'Physical hardware products', 2),
    ('Services', 'Professional and consulting services', 3),
    ('Support', 'Support and maintenance packages', 4),
    ('Training', 'Training and certification programs', 5);

-- Insert subcategories
INSERT INTO product_categories (name, description, parent_id, sort_order) VALUES
    ('Enterprise Software', 'Large-scale enterprise software solutions',
     (SELECT id FROM product_categories WHERE name = 'Software'), 1),
    ('Cloud Software', 'Cloud-based software solutions',
     (SELECT id FROM product_categories WHERE name = 'Software'), 2),
    ('Servers', 'Server hardware and equipment',
     (SELECT id FROM product_categories WHERE name = 'Hardware'), 1),
    ('Networking', 'Network equipment and infrastructure',
     (SELECT id FROM product_categories WHERE name = 'Hardware'), 2);

-- Update products with enhanced information
UPDATE products SET
    sku = 'ESL-001',
    description = 'Comprehensive enterprise software license with full feature access',
    category_id = (SELECT id FROM product_categories WHERE name = 'Enterprise Software'),
    cost_price = 30000.00,
    specifications = '{"users": "unlimited", "deployment": "on-premise", "support": "24/7"}'
WHERE name = 'Enterprise Software License';

UPDATE products SET
    sku = 'PS-001',
    description = 'Professional consulting and implementation services',
    category_id = (SELECT id FROM product_categories WHERE name = 'Services'),
    cost_price = 15000.00,
    specifications = '{"duration": "3 months", "team_size": "5 consultants", "deliverables": "implementation"}'
WHERE name = 'Professional Services';

UPDATE products SET
    sku = 'SUP-001',
    description = 'Premium support package with priority response',
    category_id = (SELECT id FROM product_categories WHERE name = 'Support'),
    cost_price = 6000.00,
    specifications = '{"response_time": "4 hours", "coverage": "24/7", "channels": ["phone", "email", "chat"]}'
WHERE name = 'Support Package';

-- Sample volume discounts
INSERT INTO volume_discounts (product_id, min_quantity, max_quantity, discount_type, discount_value, reseller_tier) VALUES
    ((SELECT id FROM products WHERE sku = 'ESL-001'), 5, 9, 'percentage', 5.0000, NULL),
    ((SELECT id FROM products WHERE sku = 'ESL-001'), 10, 24, 'percentage', 10.0000, NULL),
    ((SELECT id FROM products WHERE sku = 'ESL-001'), 25, NULL, 'percentage', 15.0000, NULL),
    ((SELECT id FROM products WHERE sku = 'PS-001'), 3, 5, 'percentage', 8.0000, 'gold'),
    ((SELECT id FROM products WHERE sku = 'SUP-001'), 10, NULL, 'fixed_amount', 1000.0000, NULL);

-- Sample deal registration pricing
INSERT INTO deal_registration_pricing (product_id, deal_registration_price, min_deal_value, reseller_tier) VALUES
    ((SELECT id FROM products WHERE sku = 'ESL-001'), 40000.00, 100000.00, 'gold'),
    ((SELECT id FROM products WHERE sku = 'ESL-001'), 42000.00, 50000.00, 'silver'),
    ((SELECT id FROM products WHERE sku = 'PS-001'), 20000.00, 50000.00, 'gold'),
    ((SELECT id FROM products WHERE sku = 'SUP-001'), 8000.00, 25000.00, NULL);

-- Sample territory pricing
INSERT INTO territory_pricing (product_id, territory, price_multiplier, currency_code) VALUES
    ((SELECT id FROM products WHERE sku = 'ESL-001'), 'International', 1.2000, 'USD'),
    ((SELECT id FROM products WHERE sku = 'ESL-001'), 'West Coast', 1.1000, 'GBP'),
    ((SELECT id FROM products WHERE sku = 'PS-001'), 'International', 1.3000, 'USD');

-- Sample promotional pricing
INSERT INTO promotional_pricing (product_id, promotion_name, discount_type, discount_value, start_date, end_date, reseller_tier) VALUES
    ((SELECT id FROM products WHERE sku = 'ESL-001'), 'Q4 Enterprise Push', 'percentage', 12.0000,
     '2024-10-01'::timestamp, '2024-12-31'::timestamp, 'gold'),
    ((SELECT id FROM products WHERE sku = 'SUP-001'), 'Support Bundle Promo', 'fixed_amount', 2000.0000,
     '2024-11-01'::timestamp, '2024-11-30'::timestamp, NULL);

-- Sample eligibility rules
INSERT INTO eligibility_rules (name, description, rule_type, conditions) VALUES
    ('Territory Restriction', 'Resellers can only register deals in their assigned territory', 'territory',
     '{"allowed_territories": ["match_reseller_territory"]}'),
    ('Gold Partner Privilege', 'Gold partners can register deals of any size', 'partner_tier',
     '{"min_tier": "gold", "max_deal_value": null}'),
    ('Deal Size Limit', 'Silver and Bronze partners limited to deals under $100k', 'deal_size',
     '{"max_value": 100000, "applies_to_tiers": ["silver", "bronze"]}');
