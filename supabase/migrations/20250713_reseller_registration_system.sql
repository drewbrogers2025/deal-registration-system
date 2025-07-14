-- Enhanced Reseller Registration & Company Profile System
-- Migration to add comprehensive reseller management capabilities

-- Create new enums
CREATE TYPE contact_role AS ENUM ('primary', 'sales', 'technical', 'billing', 'executive');
CREATE TYPE document_type AS ENUM ('certification', 'agreement', 'license', 'insurance', 'other');
CREATE TYPE registration_status AS ENUM ('draft', 'submitted', 'under_review', 'approved', 'rejected');
CREATE TYPE revenue_range AS ENUM ('under_1m', '1m_5m', '5m_25m', '25m_100m', 'over_100m');

-- Extend resellers table with comprehensive company information
ALTER TABLE resellers ADD COLUMN IF NOT EXISTS legal_name TEXT;
ALTER TABLE resellers ADD COLUMN IF NOT EXISTS dba TEXT;
ALTER TABLE resellers ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE resellers ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE resellers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE resellers ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE resellers ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE resellers ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE resellers ADD COLUMN IF NOT EXISTS state_province TEXT;
ALTER TABLE resellers ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE resellers ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE resellers ADD COLUMN IF NOT EXISTS years_in_business INTEGER;
ALTER TABLE resellers ADD COLUMN IF NOT EXISTS employee_count INTEGER;
ALTER TABLE resellers ADD COLUMN IF NOT EXISTS revenue_range revenue_range;
ALTER TABLE resellers ADD COLUMN IF NOT EXISTS registration_status registration_status DEFAULT 'draft';
ALTER TABLE resellers ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE resellers ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES staff_users(id);
ALTER TABLE resellers ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE resellers ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE resellers ADD COLUMN IF NOT EXISTS terms_version TEXT;

-- Reseller contacts table for multiple contacts per company
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

-- Company documents table for certifications, agreements, etc.
CREATE TABLE company_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reseller_id UUID NOT NULL REFERENCES resellers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    document_type document_type NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    version INTEGER DEFAULT 1,
    is_current BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    uploaded_by UUID REFERENCES reseller_contacts(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reseller territories table for multiple territory assignments
CREATE TABLE reseller_territories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reseller_id UUID NOT NULL REFERENCES resellers(id) ON DELETE CASCADE,
    territory_name TEXT NOT NULL,
    territory_type TEXT DEFAULT 'geographic', -- geographic, vertical, product
    is_primary BOOLEAN DEFAULT FALSE,
    effective_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    effective_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Company metrics table for performance tracking
CREATE TABLE company_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reseller_id UUID NOT NULL REFERENCES resellers(id) ON DELETE CASCADE,
    metric_period DATE NOT NULL, -- Monthly periods
    deals_registered INTEGER DEFAULT 0,
    deals_won INTEGER DEFAULT 0,
    total_deal_value DECIMAL(15,2) DEFAULT 0,
    average_deal_size DECIMAL(15,2) DEFAULT 0,
    win_rate DECIMAL(5,2) DEFAULT 0, -- Percentage
    time_to_close_avg INTEGER DEFAULT 0, -- Days
    customer_satisfaction DECIMAL(3,2), -- 1-5 scale
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(reseller_id, metric_period)
);

-- Contact activity table for tracking communications
CREATE TABLE contact_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL REFERENCES reseller_contacts(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL, -- email, call, meeting, login, etc.
    subject TEXT,
    description TEXT,
    metadata JSONB, -- Additional structured data
    created_by UUID REFERENCES staff_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_reseller_contacts_reseller_id ON reseller_contacts(reseller_id);
CREATE INDEX idx_reseller_contacts_email ON reseller_contacts(email);
CREATE INDEX idx_reseller_contacts_role ON reseller_contacts(role);
CREATE INDEX idx_reseller_contacts_primary ON reseller_contacts(reseller_id, is_primary) WHERE is_primary = TRUE;

CREATE INDEX idx_company_documents_reseller_id ON company_documents(reseller_id);
CREATE INDEX idx_company_documents_type ON company_documents(document_type);
CREATE INDEX idx_company_documents_current ON company_documents(reseller_id, is_current) WHERE is_current = TRUE;

CREATE INDEX idx_reseller_territories_reseller_id ON reseller_territories(reseller_id);
CREATE INDEX idx_reseller_territories_name ON reseller_territories(territory_name);
CREATE INDEX idx_reseller_territories_primary ON reseller_territories(reseller_id, is_primary) WHERE is_primary = TRUE;

CREATE INDEX idx_company_metrics_reseller_id ON company_metrics(reseller_id);
CREATE INDEX idx_company_metrics_period ON company_metrics(metric_period);

CREATE INDEX idx_contact_activity_contact_id ON contact_activity(contact_id);
CREATE INDEX idx_contact_activity_type ON contact_activity(activity_type);
CREATE INDEX idx_contact_activity_created_at ON contact_activity(created_at);

-- Add indexes for new reseller fields
CREATE INDEX idx_resellers_legal_name ON resellers(legal_name);
CREATE INDEX idx_resellers_registration_status ON resellers(registration_status);
CREATE INDEX idx_resellers_country ON resellers(country);

-- Add updated_at triggers for new tables
CREATE TRIGGER update_reseller_contacts_updated_at 
    BEFORE UPDATE ON reseller_contacts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_documents_updated_at 
    BEFORE UPDATE ON company_documents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reseller_territories_updated_at 
    BEFORE UPDATE ON reseller_territories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_metrics_updated_at 
    BEFORE UPDATE ON company_metrics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Constraints to ensure data integrity
ALTER TABLE reseller_contacts ADD CONSTRAINT check_one_primary_per_reseller 
    EXCLUDE (reseller_id WITH =) WHERE (is_primary = TRUE);

ALTER TABLE reseller_territories ADD CONSTRAINT check_one_primary_territory_per_reseller 
    EXCLUDE (reseller_id WITH =) WHERE (is_primary = TRUE);

-- Ensure at least one primary contact per approved reseller
CREATE OR REPLACE FUNCTION ensure_primary_contact() RETURNS TRIGGER AS $$
BEGIN
    -- When a reseller is approved, ensure they have a primary contact
    IF NEW.registration_status = 'approved' AND OLD.registration_status != 'approved' THEN
        IF NOT EXISTS (
            SELECT 1 FROM reseller_contacts 
            WHERE reseller_id = NEW.id AND is_primary = TRUE
        ) THEN
            RAISE EXCEPTION 'Reseller must have a primary contact before approval';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_primary_contact_trigger
    BEFORE UPDATE ON resellers
    FOR EACH ROW EXECUTE FUNCTION ensure_primary_contact();

-- Enable Row Level Security on new tables
ALTER TABLE reseller_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reseller_contacts
CREATE POLICY "Staff can view all reseller contacts" ON reseller_contacts
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage all reseller contacts" ON reseller_contacts
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Resellers can view their own contacts" ON reseller_contacts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM reseller_contacts rc
            WHERE rc.reseller_id = reseller_contacts.reseller_id
            AND rc.email = auth.jwt() ->> 'email'
            AND rc.can_manage_contacts = TRUE
        )
    );

-- RLS Policies for company_documents
CREATE POLICY "Staff can view all company documents" ON company_documents
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage all company documents" ON company_documents
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Resellers can view their own documents" ON company_documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM reseller_contacts rc
            WHERE rc.reseller_id = company_documents.reseller_id
            AND rc.email = auth.jwt() ->> 'email'
        )
    );

-- RLS Policies for reseller_territories
CREATE POLICY "Staff can view all reseller territories" ON reseller_territories
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage all reseller territories" ON reseller_territories
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Resellers can view their own territories" ON reseller_territories
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM reseller_contacts rc
            WHERE rc.reseller_id = reseller_territories.reseller_id
            AND rc.email = auth.jwt() ->> 'email'
        )
    );

-- RLS Policies for company_metrics
CREATE POLICY "Staff can view all company metrics" ON company_metrics
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage all company metrics" ON company_metrics
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Resellers can view their own metrics" ON company_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM reseller_contacts rc
            WHERE rc.reseller_id = company_metrics.reseller_id
            AND rc.email = auth.jwt() ->> 'email'
            AND rc.can_view_reports = TRUE
        )
    );

-- RLS Policies for contact_activity
CREATE POLICY "Staff can view all contact activity" ON contact_activity
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage all contact activity" ON contact_activity
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Contacts can view their own activity" ON contact_activity
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM reseller_contacts rc
            WHERE rc.id = contact_activity.contact_id
            AND rc.email = auth.jwt() ->> 'email'
        )
    );
