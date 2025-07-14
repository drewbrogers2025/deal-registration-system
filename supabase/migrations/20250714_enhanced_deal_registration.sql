-- Enhanced Deal Registration System Integration
-- This migration enhances the deal registration system to integrate with the new reseller system

-- Create new enums for enhanced deal management
CREATE TYPE deal_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE deal_source AS ENUM ('inbound', 'outbound', 'referral', 'partner', 'marketing', 'event');
CREATE TYPE opportunity_stage AS ENUM ('lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost');
CREATE TYPE deal_complexity AS ENUM ('simple', 'moderate', 'complex', 'enterprise');

-- Enhance the deals table with comprehensive deal information
ALTER TABLE deals ADD COLUMN IF NOT EXISTS deal_name TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS deal_description TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS deal_priority deal_priority DEFAULT 'medium';
ALTER TABLE deals ADD COLUMN IF NOT EXISTS deal_source deal_source DEFAULT 'inbound';
ALTER TABLE deals ADD COLUMN IF NOT EXISTS opportunity_stage opportunity_stage DEFAULT 'lead';
ALTER TABLE deals ADD COLUMN IF NOT EXISTS deal_complexity deal_complexity DEFAULT 'simple';
ALTER TABLE deals ADD COLUMN IF NOT EXISTS expected_close_date DATE;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS probability INTEGER CHECK (probability >= 0 AND probability <= 100);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS competitor_info TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS special_requirements TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS customer_budget DECIMAL(15,2);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2) CHECK (discount_percentage >= 0 AND discount_percentage <= 100);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) CHECK (commission_rate >= 0 AND commission_rate <= 100);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS lead_source TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS campaign_id TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS sales_stage_updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS last_activity_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS next_follow_up_date TIMESTAMP WITH TIME ZONE;

-- Create deal stages history table for tracking progression
CREATE TABLE deal_stage_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    from_stage opportunity_stage,
    to_stage opportunity_stage NOT NULL,
    changed_by UUID REFERENCES staff_users(id),
    change_reason TEXT,
    stage_duration_days INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create deal activities table for comprehensive activity tracking
CREATE TABLE deal_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL, -- call, email, meeting, demo, proposal, etc.
    activity_subject TEXT,
    activity_description TEXT,
    activity_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration_minutes INTEGER,
    outcome TEXT, -- positive, negative, neutral, follow_up_required
    next_action TEXT,
    next_action_date TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES staff_users(id),
    contact_id UUID REFERENCES reseller_contacts(id),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create deal attachments table for file management
CREATE TABLE deal_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    attachment_type TEXT, -- proposal, contract, presentation, technical_spec, etc.
    description TEXT,
    uploaded_by UUID REFERENCES staff_users(id),
    is_customer_visible BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create deal competitors table for competitive analysis
CREATE TABLE deal_competitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    competitor_name TEXT NOT NULL,
    competitor_product TEXT,
    competitor_price DECIMAL(15,2),
    competitive_advantage TEXT,
    competitive_weakness TEXT,
    win_probability_impact INTEGER CHECK (win_probability_impact >= -50 AND win_probability_impact <= 50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create deal team members table for internal collaboration
CREATE TABLE deal_team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    staff_user_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- primary_sales, sales_engineer, manager, support, etc.
    is_primary BOOLEAN DEFAULT FALSE,
    responsibilities TEXT,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    added_by UUID REFERENCES staff_users(id),
    UNIQUE(deal_id, staff_user_id)
);

-- Create deal forecasting table for sales forecasting
CREATE TABLE deal_forecasting (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    forecast_period DATE NOT NULL, -- Monthly forecasting periods
    forecasted_value DECIMAL(15,2) NOT NULL,
    forecasted_close_date DATE,
    confidence_level INTEGER CHECK (confidence_level >= 0 AND confidence_level <= 100),
    forecast_category TEXT, -- commit, best_case, pipeline, omitted
    forecast_notes TEXT,
    created_by UUID REFERENCES staff_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(deal_id, forecast_period)
);

-- Create deal notifications table for automated alerts
CREATE TABLE deal_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL, -- stage_change, overdue, high_value, etc.
    recipient_id UUID REFERENCES staff_users(id),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    action_required BOOLEAN DEFAULT FALSE,
    action_url TEXT,
    scheduled_for TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance optimization
CREATE INDEX idx_deals_reseller_id ON deals(reseller_id);
CREATE INDEX idx_deals_assigned_reseller_id ON deals(assigned_reseller_id);
CREATE INDEX idx_deals_opportunity_stage ON deals(opportunity_stage);
CREATE INDEX idx_deals_expected_close_date ON deals(expected_close_date);
CREATE INDEX idx_deals_deal_priority ON deals(deal_priority);
CREATE INDEX idx_deals_deal_source ON deals(deal_source);
CREATE INDEX idx_deals_last_activity_date ON deals(last_activity_date);

CREATE INDEX idx_deal_stage_history_deal_id ON deal_stage_history(deal_id);
CREATE INDEX idx_deal_stage_history_created_at ON deal_stage_history(created_at);

CREATE INDEX idx_deal_activities_deal_id ON deal_activities(deal_id);
CREATE INDEX idx_deal_activities_activity_date ON deal_activities(activity_date);
CREATE INDEX idx_deal_activities_activity_type ON deal_activities(activity_type);
CREATE INDEX idx_deal_activities_created_by ON deal_activities(created_by);

CREATE INDEX idx_deal_attachments_deal_id ON deal_attachments(deal_id);
CREATE INDEX idx_deal_attachments_attachment_type ON deal_attachments(attachment_type);

CREATE INDEX idx_deal_competitors_deal_id ON deal_competitors(deal_id);

CREATE INDEX idx_deal_team_members_deal_id ON deal_team_members(deal_id);
CREATE INDEX idx_deal_team_members_staff_user_id ON deal_team_members(staff_user_id);
CREATE INDEX idx_deal_team_members_primary ON deal_team_members(deal_id, is_primary) WHERE is_primary = TRUE;

CREATE INDEX idx_deal_forecasting_deal_id ON deal_forecasting(deal_id);
CREATE INDEX idx_deal_forecasting_period ON deal_forecasting(forecast_period);

CREATE INDEX idx_deal_notifications_deal_id ON deal_notifications(deal_id);
CREATE INDEX idx_deal_notifications_recipient ON deal_notifications(recipient_id);
CREATE INDEX idx_deal_notifications_unread ON deal_notifications(recipient_id, is_read) WHERE is_read = FALSE;

-- Add updated_at triggers for new tables
CREATE TRIGGER update_deal_attachments_updated_at 
    BEFORE UPDATE ON deal_attachments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deal_competitors_updated_at 
    BEFORE UPDATE ON deal_competitors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically update deal stage history
CREATE OR REPLACE FUNCTION track_deal_stage_changes() RETURNS TRIGGER AS $$
BEGIN
    -- Only track if opportunity_stage actually changed
    IF OLD.opportunity_stage IS DISTINCT FROM NEW.opportunity_stage THEN
        INSERT INTO deal_stage_history (
            deal_id,
            from_stage,
            to_stage,
            changed_by,
            stage_duration_days
        ) VALUES (
            NEW.id,
            OLD.opportunity_stage,
            NEW.opportunity_stage,
            NEW.updated_by, -- Assuming we add this field to deals table
            CASE 
                WHEN OLD.sales_stage_updated_at IS NOT NULL 
                THEN EXTRACT(DAYS FROM NOW() - OLD.sales_stage_updated_at)::INTEGER
                ELSE NULL
            END
        );
        
        -- Update the stage timestamp
        NEW.sales_stage_updated_at = NOW();
    END IF;
    
    -- Update last activity date
    NEW.last_activity_date = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_deal_stage_changes_trigger
    BEFORE UPDATE ON deals
    FOR EACH ROW EXECUTE FUNCTION track_deal_stage_changes();

-- Create function to ensure only one primary team member per deal
CREATE OR REPLACE FUNCTION ensure_single_primary_team_member() RETURNS TRIGGER AS $$
BEGIN
    -- If setting as primary, unset other primary members
    IF NEW.is_primary = TRUE THEN
        UPDATE deal_team_members 
        SET is_primary = FALSE 
        WHERE deal_id = NEW.deal_id 
        AND id != COALESCE(NEW.id, uuid_generate_v4())
        AND is_primary = TRUE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_primary_team_member_trigger
    BEFORE INSERT OR UPDATE ON deal_team_members
    FOR EACH ROW EXECUTE FUNCTION ensure_single_primary_team_member();

-- Enable Row Level Security on new tables
ALTER TABLE deal_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_forecasting ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for deal_stage_history
CREATE POLICY "Staff can view all deal stage history" ON deal_stage_history
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage deal stage history" ON deal_stage_history
    FOR ALL USING (auth.role() = 'authenticated');

-- RLS Policies for deal_activities
CREATE POLICY "Staff can view all deal activities" ON deal_activities
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage deal activities" ON deal_activities
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Resellers can view their deal activities" ON deal_activities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM deals d
            JOIN reseller_contacts rc ON rc.reseller_id = d.reseller_id
            WHERE d.id = deal_activities.deal_id
            AND rc.email = auth.jwt() ->> 'email'
        )
    );

-- RLS Policies for deal_attachments
CREATE POLICY "Staff can view all deal attachments" ON deal_attachments
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage deal attachments" ON deal_attachments
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Resellers can view customer-visible attachments" ON deal_attachments
    FOR SELECT USING (
        is_customer_visible = TRUE AND
        EXISTS (
            SELECT 1 FROM deals d
            JOIN reseller_contacts rc ON rc.reseller_id = d.reseller_id
            WHERE d.id = deal_attachments.deal_id
            AND rc.email = auth.jwt() ->> 'email'
        )
    );

-- RLS Policies for deal_competitors
CREATE POLICY "Staff can view all deal competitors" ON deal_competitors
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage deal competitors" ON deal_competitors
    FOR ALL USING (auth.role() = 'authenticated');

-- RLS Policies for deal_team_members
CREATE POLICY "Staff can view all deal team members" ON deal_team_members
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage deal team members" ON deal_team_members
    FOR ALL USING (auth.role() = 'authenticated');

-- RLS Policies for deal_forecasting
CREATE POLICY "Staff can view all deal forecasting" ON deal_forecasting
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage deal forecasting" ON deal_forecasting
    FOR ALL USING (auth.role() = 'authenticated');

-- RLS Policies for deal_notifications
CREATE POLICY "Staff can view their notifications" ON deal_notifications
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        recipient_id = auth.uid()
    );

CREATE POLICY "Staff can manage their notifications" ON deal_notifications
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND
        recipient_id = auth.uid()
    );

CREATE POLICY "System can create notifications" ON deal_notifications
    FOR INSERT USING (auth.role() = 'authenticated');
