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

-- Products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    list_price DECIMAL(12,2) NOT NULL CHECK (list_price > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
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
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
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

-- Sample eligibility rules
INSERT INTO eligibility_rules (name, description, rule_type, conditions) VALUES
    ('Territory Restriction', 'Resellers can only register deals in their assigned territory', 'territory',
     '{"allowed_territories": ["match_reseller_territory"]}'),
    ('Gold Partner Privilege', 'Gold partners can register deals of any size', 'partner_tier',
     '{"min_tier": "gold", "max_deal_value": null}'),
    ('Deal Size Limit', 'Silver and Bronze partners limited to deals under $100k', 'deal_size',
     '{"max_value": 100000, "applies_to_tiers": ["silver", "bronze"]}');
