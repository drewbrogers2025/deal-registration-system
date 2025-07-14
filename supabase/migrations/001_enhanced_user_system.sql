-- Migration: Enhanced User Role System & Authentication
-- This migration updates the existing system to support three-tier user roles
-- Run this migration on existing databases to upgrade to the new user system

-- Add new enum types
CREATE TYPE user_type AS ENUM ('site_admin', 'vendor_user', 'reseller');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Update existing user_status enum to include 'pending'
ALTER TYPE user_status ADD VALUE 'pending';

-- Create new users table (unified user management)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    user_type user_type NOT NULL,
    approval_status approval_status DEFAULT 'pending',
    phone TEXT,
    company_position TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES auth.users(id)
);

-- Create reseller_users table (linking auth users to reseller profiles)
CREATE TABLE reseller_users (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    reseller_id UUID REFERENCES resellers(id) ON DELETE CASCADE,
    can_create_deals BOOLEAN DEFAULT true,
    can_view_all_reseller_deals BOOLEAN DEFAULT false,
    territory_access TEXT[], -- Array of territories this user can access
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(id, reseller_id)
);

-- Update staff_users table to reference new users table
ALTER TABLE staff_users DROP CONSTRAINT IF EXISTS staff_users_pkey;
ALTER TABLE staff_users ADD COLUMN temp_id UUID;

-- Add new columns to staff_users
ALTER TABLE staff_users ADD COLUMN department TEXT;
ALTER TABLE staff_users ADD COLUMN permissions JSONB DEFAULT '{}';

-- Update resellers table with additional profile fields
ALTER TABLE resellers ADD COLUMN company_address TEXT;
ALTER TABLE resellers ADD COLUMN company_phone TEXT;
ALTER TABLE resellers ADD COLUMN website TEXT;
ALTER TABLE resellers ADD COLUMN business_license TEXT;
ALTER TABLE resellers ADD COLUMN tax_id TEXT;
ALTER TABLE resellers ADD COLUMN primary_contact_name TEXT;
ALTER TABLE resellers ADD COLUMN primary_contact_email TEXT;
ALTER TABLE resellers ADD COLUMN primary_contact_phone TEXT;

-- Enable RLS on new tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_users ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Staff can view all staff users" ON staff_users;
DROP POLICY IF EXISTS "Admins can manage staff users" ON staff_users;
DROP POLICY IF EXISTS "Staff can view all resellers" ON resellers;
DROP POLICY IF EXISTS "Staff can manage resellers" ON resellers;
DROP POLICY IF EXISTS "Staff can view all end users" ON end_users;
DROP POLICY IF EXISTS "Staff can manage end users" ON end_users;
DROP POLICY IF EXISTS "Staff can view all products" ON products;
DROP POLICY IF EXISTS "Managers and admins can manage products" ON products;
DROP POLICY IF EXISTS "Staff can view all deals" ON deals;
DROP POLICY IF EXISTS "Staff can manage deals" ON deals;

-- Create new RLS policies for users table
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Site admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() 
            AND u.user_type = 'site_admin' 
            AND u.approval_status = 'approved'
        )
    );

CREATE POLICY "Site admins can manage all users" ON users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() 
            AND u.user_type = 'site_admin' 
            AND u.approval_status = 'approved'
        )
    );

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Create new RLS policies for staff_users table
CREATE POLICY "Staff can view staff data" ON staff_users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() 
            AND u.user_type IN ('site_admin', 'vendor_user')
            AND u.approval_status = 'approved'
        )
    );

CREATE POLICY "Site admins can manage staff users" ON staff_users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() 
            AND u.user_type = 'site_admin' 
            AND u.approval_status = 'approved'
        )
    );

-- Create RLS policies for reseller_users table
CREATE POLICY "Reseller users can view their own data" ON reseller_users
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Site admins and vendor users can view reseller users" ON reseller_users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() 
            AND u.user_type IN ('site_admin', 'vendor_user')
            AND u.approval_status = 'approved'
        )
    );

CREATE POLICY "Site admins and vendor users can manage reseller users" ON reseller_users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() 
            AND u.user_type IN ('site_admin', 'vendor_user')
            AND u.approval_status = 'approved'
        )
    );

-- Update resellers policies
CREATE POLICY "Resellers can view their own company" ON resellers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM reseller_users ru
            WHERE ru.reseller_id = resellers.id 
            AND ru.id = auth.uid()
        )
    );

CREATE POLICY "Staff can view all resellers" ON resellers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() 
            AND u.user_type IN ('site_admin', 'vendor_user')
            AND u.approval_status = 'approved'
        )
    );

CREATE POLICY "Staff can manage resellers" ON resellers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() 
            AND u.user_type IN ('site_admin', 'vendor_user')
            AND u.approval_status = 'approved'
        )
    );

-- Update end_users policies
CREATE POLICY "Staff can view all end users" ON end_users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() 
            AND u.user_type IN ('site_admin', 'vendor_user')
            AND u.approval_status = 'approved'
        )
    );

CREATE POLICY "Staff can manage end users" ON end_users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() 
            AND u.user_type IN ('site_admin', 'vendor_user')
            AND u.approval_status = 'approved'
        )
    );

-- Update products policies
CREATE POLICY "All authenticated users can view products" ON products
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() 
            AND u.approval_status = 'approved'
        )
    );

CREATE POLICY "Staff can manage products" ON products
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN staff_users su ON u.id = su.id
            WHERE u.id = auth.uid() 
            AND u.user_type IN ('site_admin', 'vendor_user')
            AND u.approval_status = 'approved'
            AND su.role IN ('admin', 'manager')
        )
    );

-- Update deals policies with three-tier access control
CREATE POLICY "Staff can view all deals" ON deals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() 
            AND u.user_type IN ('site_admin', 'vendor_user')
            AND u.approval_status = 'approved'
        )
    );

CREATE POLICY "Resellers can view their own deals" ON deals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM reseller_users ru
            WHERE ru.id = auth.uid() 
            AND ru.reseller_id = deals.reseller_id
        )
    );

CREATE POLICY "Staff can manage deals" ON deals
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() 
            AND u.user_type IN ('site_admin', 'vendor_user')
            AND u.approval_status = 'approved'
        )
    );

CREATE POLICY "Resellers can create deals" ON deals
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM reseller_users ru
            WHERE ru.id = auth.uid() 
            AND ru.reseller_id = deals.reseller_id
            AND ru.can_create_deals = true
        )
    );

CREATE POLICY "Resellers can update their own deals" ON deals
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM reseller_users ru
            WHERE ru.id = auth.uid() 
            AND ru.reseller_id = deals.reseller_id
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM reseller_users ru
            WHERE ru.id = auth.uid() 
            AND ru.reseller_id = deals.reseller_id
        )
    );

-- Create indexes for performance
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_users_approval_status ON users(approval_status);
CREATE INDEX idx_reseller_users_reseller_id ON reseller_users(reseller_id);
CREATE INDEX idx_staff_users_role ON staff_users(role);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reseller_users_updated_at BEFORE UPDATE ON reseller_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_users_updated_at BEFORE UPDATE ON staff_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
