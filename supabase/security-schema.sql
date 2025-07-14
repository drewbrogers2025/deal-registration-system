-- Enhanced Security Schema for Deal Registration System
-- This file extends the base schema with comprehensive RBAC and security features

-- Enable additional extensions for security
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enhanced user types and permissions
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

-- Roles table (enhanced from staff_role enum)
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
    granted_by UUID REFERENCES staff_users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    conditions JSONB DEFAULT '{}',
    UNIQUE(role_id, permission_id)
);

-- User roles table (many-to-many relationship)
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES staff_users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, role_id)
);

-- API keys table for system integrations
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    key_hash TEXT UNIQUE NOT NULL,
    key_prefix TEXT NOT NULL,
    user_id UUID REFERENCES staff_users(id),
    permissions JSONB DEFAULT '[]',
    rate_limit INTEGER DEFAULT 1000,
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES staff_users(id),
    action audit_action NOT NULL,
    resource_type resource_type,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Security events table
CREATE TABLE security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type security_event_type NOT NULL,
    user_id UUID REFERENCES staff_users(id),
    ip_address INET,
    user_agent TEXT,
    details JSONB DEFAULT '{}',
    severity INTEGER DEFAULT 1, -- 1=low, 2=medium, 3=high, 4=critical
    resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES staff_users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User sessions table for enhanced session management
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rate limiting table
CREATE TABLE rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier TEXT NOT NULL, -- IP, user_id, or API key
    endpoint TEXT NOT NULL,
    requests_count INTEGER DEFAULT 0,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    blocked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(identifier, endpoint)
);

-- Data retention policies table
CREATE TABLE data_retention_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL,
    retention_days INTEGER NOT NULL,
    archive_before_delete BOOLEAN DEFAULT true,
    conditions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add security-related columns to existing tables
ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;
ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;
ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS last_login_ip INET;

-- Add encrypted fields for sensitive data
ALTER TABLE resellers ADD COLUMN IF NOT EXISTS encrypted_data JSONB;
ALTER TABLE end_users ADD COLUMN IF NOT EXISTS encrypted_data JSONB;

-- Create indexes for performance
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_security_events_user_id ON security_events(user_id);
CREATE INDEX idx_security_events_created_at ON security_events(created_at);
CREATE INDEX idx_security_events_type ON security_events(event_type);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_rate_limits_identifier ON rate_limits(identifier, endpoint);
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);

-- Enable RLS on new tables
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_retention_policies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for new tables

-- Permissions policies (admin only for management)
CREATE POLICY "Admins can manage permissions" ON permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM staff_users su
            JOIN user_roles ur ON su.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            WHERE su.id = auth.uid() AND r.name = 'admin' AND ur.is_active = true
        )
    );

CREATE POLICY "All staff can view permissions" ON permissions
    FOR SELECT USING (auth.role() = 'authenticated');

-- Roles policies
CREATE POLICY "Admins can manage roles" ON roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM staff_users su
            JOIN user_roles ur ON su.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            WHERE su.id = auth.uid() AND r.name = 'admin' AND ur.is_active = true
        )
    );

CREATE POLICY "All staff can view roles" ON roles
    FOR SELECT USING (auth.role() = 'authenticated');

-- Role permissions policies
CREATE POLICY "Admins can manage role permissions" ON role_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM staff_users su
            JOIN user_roles ur ON su.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            WHERE su.id = auth.uid() AND r.name = 'admin' AND ur.is_active = true
        )
    );

CREATE POLICY "All staff can view role permissions" ON role_permissions
    FOR SELECT USING (auth.role() = 'authenticated');

-- User roles policies
CREATE POLICY "Admins can manage user roles" ON user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM staff_users su
            JOIN user_roles ur ON su.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            WHERE su.id = auth.uid() AND r.name = 'admin' AND ur.is_active = true
        )
    );

CREATE POLICY "Users can view their own roles" ON user_roles
    FOR SELECT USING (user_id = auth.uid() OR auth.role() = 'authenticated');

-- API keys policies
CREATE POLICY "Admins can manage API keys" ON api_keys
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM staff_users su
            JOIN user_roles ur ON su.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            WHERE su.id = auth.uid() AND r.name = 'admin' AND ur.is_active = true
        )
    );

CREATE POLICY "Users can view their own API keys" ON api_keys
    FOR SELECT USING (user_id = auth.uid());

-- Audit logs policies (read-only for most users)
CREATE POLICY "Admins can view all audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM staff_users su
            JOIN user_roles ur ON su.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            WHERE su.id = auth.uid() AND r.name = 'admin' AND ur.is_active = true
        )
    );

CREATE POLICY "Users can view their own audit logs" ON audit_logs
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

-- Security events policies
CREATE POLICY "Admins can manage security events" ON security_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM staff_users su
            JOIN user_roles ur ON su.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            WHERE su.id = auth.uid() AND r.name = 'admin' AND ur.is_active = true
        )
    );

-- User sessions policies
CREATE POLICY "Users can view their own sessions" ON user_sessions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own sessions" ON user_sessions
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can manage sessions" ON user_sessions
    FOR ALL WITH CHECK (true);

-- Rate limits policies (system managed)
CREATE POLICY "Admins can view rate limits" ON rate_limits
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM staff_users su
            JOIN user_roles ur ON su.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            WHERE su.id = auth.uid() AND r.name = 'admin' AND ur.is_active = true
        )
    );

CREATE POLICY "System can manage rate limits" ON rate_limits
    FOR ALL WITH CHECK (true);

-- Data retention policies
CREATE POLICY "Admins can manage retention policies" ON data_retention_policies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM staff_users su
            JOIN user_roles ur ON su.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            WHERE su.id = auth.uid() AND r.name = 'admin' AND ur.is_active = true
        )
    );

-- Functions for RBAC and security

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION has_permission(
    user_id UUID,
    resource resource_type,
    action permission_action,
    resource_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    has_perm BOOLEAN := false;
BEGIN
    -- Check if user has the permission through their roles
    SELECT EXISTS (
        SELECT 1
        FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = $1
        AND ur.is_active = true
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
        AND p.resource_type = $2
        AND p.action = $3
    ) INTO has_perm;

    RETURN has_perm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
    p_user_id UUID,
    p_action audit_action,
    p_resource_type resource_type DEFAULT NULL,
    p_resource_id UUID DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL,
    p_success BOOLEAN DEFAULT true,
    p_error_message TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO audit_logs (
        user_id, action, resource_type, resource_id, old_values, new_values,
        ip_address, user_agent, session_id, success, error_message, metadata
    ) VALUES (
        p_user_id, p_action, p_resource_type, p_resource_id, p_old_values, p_new_values,
        p_ip_address, p_user_agent, p_session_id, p_success, p_error_message, p_metadata
    ) RETURNING id INTO log_id;

    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
    p_event_type security_event_type,
    p_user_id UUID DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_details JSONB DEFAULT '{}',
    p_severity INTEGER DEFAULT 1
) RETURNS UUID AS $$
DECLARE
    event_id UUID;
BEGIN
    INSERT INTO security_events (
        event_type, user_id, ip_address, user_agent, details, severity
    ) VALUES (
        p_event_type, p_user_id, p_ip_address, p_user_agent, p_details, p_severity
    ) RETURNING id INTO event_id;

    RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check rate limits
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_identifier TEXT,
    p_endpoint TEXT,
    p_limit INTEGER DEFAULT 100,
    p_window_minutes INTEGER DEFAULT 60
) RETURNS BOOLEAN AS $$
DECLARE
    current_count INTEGER;
    window_start TIMESTAMP WITH TIME ZONE;
BEGIN
    window_start := NOW() - INTERVAL '1 minute' * p_window_minutes;

    -- Get or create rate limit record
    INSERT INTO rate_limits (identifier, endpoint, requests_count, window_start)
    VALUES (p_identifier, p_endpoint, 1, NOW())
    ON CONFLICT (identifier, endpoint) DO UPDATE SET
        requests_count = CASE
            WHEN rate_limits.window_start < window_start THEN 1
            ELSE rate_limits.requests_count + 1
        END,
        window_start = CASE
            WHEN rate_limits.window_start < window_start THEN NOW()
            ELSE rate_limits.window_start
        END,
        updated_at = NOW()
    RETURNING requests_count INTO current_count;

    RETURN current_count <= p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to encrypt sensitive data
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(data TEXT, key_id TEXT DEFAULT 'default')
RETURNS TEXT AS $$
BEGIN
    -- Simple encryption using pgcrypto
    -- In production, use proper key management
    RETURN encode(encrypt(data::bytea, key_id, 'aes'), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt sensitive data
CREATE OR REPLACE FUNCTION decrypt_sensitive_data(encrypted_data TEXT, key_id TEXT DEFAULT 'default')
RETURNS TEXT AS $$
BEGIN
    -- Simple decryption using pgcrypto
    RETURN convert_from(decrypt(decode(encrypted_data, 'base64'), key_id, 'aes'), 'UTF8');
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Initial data for RBAC system

-- Insert system roles
INSERT INTO roles (name, description, is_system) VALUES
    ('admin', 'System Administrator with full access', true),
    ('manager', 'Deal Manager with elevated permissions', true),
    ('staff', 'Regular staff member with basic permissions', true),
    ('viewer', 'Read-only access to most resources', true),
    ('api_user', 'API access for integrations', true);

-- Insert comprehensive permissions
INSERT INTO permissions (name, description, resource_type, action, is_system) VALUES
    -- Deal permissions
    ('deals.create', 'Create new deals', 'deals', 'create', true),
    ('deals.read', 'View deals', 'deals', 'read', true),
    ('deals.update', 'Update deal information', 'deals', 'update', true),
    ('deals.delete', 'Delete deals', 'deals', 'delete', true),
    ('deals.assign', 'Assign deals to resellers', 'deals', 'assign', true),
    ('deals.approve', 'Approve deals', 'deals', 'approve', true),
    ('deals.reject', 'Reject deals', 'deals', 'reject', true),
    ('deals.export', 'Export deal data', 'deals', 'export', true),

    -- Reseller permissions
    ('resellers.create', 'Create new resellers', 'resellers', 'create', true),
    ('resellers.read', 'View resellers', 'resellers', 'read', true),
    ('resellers.update', 'Update reseller information', 'resellers', 'update', true),
    ('resellers.delete', 'Delete resellers', 'resellers', 'delete', true),
    ('resellers.export', 'Export reseller data', 'resellers', 'export', true),

    -- End user permissions
    ('end_users.create', 'Create new end users', 'end_users', 'create', true),
    ('end_users.read', 'View end users', 'end_users', 'read', true),
    ('end_users.update', 'Update end user information', 'end_users', 'update', true),
    ('end_users.delete', 'Delete end users', 'end_users', 'delete', true),
    ('end_users.export', 'Export end user data', 'end_users', 'export', true),

    -- Product permissions
    ('products.create', 'Create new products', 'products', 'create', true),
    ('products.read', 'View products', 'products', 'read', true),
    ('products.update', 'Update product information', 'products', 'update', true),
    ('products.delete', 'Delete products', 'products', 'delete', true),
    ('products.export', 'Export product data', 'products', 'export', true),

    -- Conflict permissions
    ('conflicts.create', 'Create conflict records', 'conflicts', 'create', true),
    ('conflicts.read', 'View conflicts', 'conflicts', 'read', true),
    ('conflicts.update', 'Update conflict information', 'conflicts', 'update', true),
    ('conflicts.delete', 'Delete conflicts', 'conflicts', 'delete', true),
    ('conflicts.assign', 'Assign conflicts to staff', 'conflicts', 'assign', true),
    ('conflicts.export', 'Export conflict data', 'conflicts', 'export', true),

    -- Staff user permissions
    ('staff_users.create', 'Create new staff users', 'staff_users', 'create', true),
    ('staff_users.read', 'View staff users', 'staff_users', 'read', true),
    ('staff_users.update', 'Update staff user information', 'staff_users', 'update', true),
    ('staff_users.delete', 'Delete staff users', 'staff_users', 'delete', true),
    ('staff_users.export', 'Export staff user data', 'staff_users', 'export', true),

    -- Eligibility rules permissions
    ('eligibility_rules.create', 'Create eligibility rules', 'eligibility_rules', 'create', true),
    ('eligibility_rules.read', 'View eligibility rules', 'eligibility_rules', 'read', true),
    ('eligibility_rules.update', 'Update eligibility rules', 'eligibility_rules', 'update', true),
    ('eligibility_rules.delete', 'Delete eligibility rules', 'eligibility_rules', 'delete', true),
    ('eligibility_rules.export', 'Export eligibility rules', 'eligibility_rules', 'export', true),

    -- Audit log permissions
    ('audit_logs.read', 'View audit logs', 'audit_logs', 'read', true),
    ('audit_logs.export', 'Export audit logs', 'audit_logs', 'export', true),

    -- System settings permissions
    ('system_settings.read', 'View system settings', 'system_settings', 'read', true),
    ('system_settings.update', 'Update system settings', 'system_settings', 'update', true),

    -- Reports permissions
    ('reports.read', 'View reports', 'reports', 'read', true),
    ('reports.create', 'Create custom reports', 'reports', 'create', true),
    ('reports.export', 'Export reports', 'reports', 'export', true);

-- Assign permissions to roles

-- Admin role gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin';

-- Manager role permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'manager'
AND p.name IN (
    'deals.create', 'deals.read', 'deals.update', 'deals.assign', 'deals.approve', 'deals.reject', 'deals.export',
    'resellers.create', 'resellers.read', 'resellers.update', 'resellers.export',
    'end_users.create', 'end_users.read', 'end_users.update', 'end_users.export',
    'products.create', 'products.read', 'products.update', 'products.export',
    'conflicts.create', 'conflicts.read', 'conflicts.update', 'conflicts.assign', 'conflicts.export',
    'staff_users.read', 'staff_users.export',
    'eligibility_rules.create', 'eligibility_rules.read', 'eligibility_rules.update', 'eligibility_rules.export',
    'audit_logs.read', 'audit_logs.export',
    'reports.read', 'reports.create', 'reports.export'
);

-- Staff role permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'staff'
AND p.name IN (
    'deals.create', 'deals.read', 'deals.update', 'deals.export',
    'resellers.read', 'resellers.export',
    'end_users.create', 'end_users.read', 'end_users.update', 'end_users.export',
    'products.read', 'products.export',
    'conflicts.read', 'conflicts.update', 'conflicts.export',
    'eligibility_rules.read',
    'reports.read', 'reports.export'
);

-- Viewer role permissions (read-only)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'viewer'
AND p.name IN (
    'deals.read', 'resellers.read', 'end_users.read', 'products.read',
    'conflicts.read', 'eligibility_rules.read', 'reports.read'
);

-- API user role permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'api_user'
AND p.name IN (
    'deals.create', 'deals.read', 'deals.update',
    'resellers.read', 'end_users.create', 'end_users.read', 'end_users.update',
    'products.read', 'conflicts.read'
);

-- Assign roles to existing staff users
INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT su.id, r.id, su.id
FROM staff_users su, roles r
WHERE (su.role = 'admin' AND r.name = 'admin')
   OR (su.role = 'manager' AND r.name = 'manager')
   OR (su.role = 'staff' AND r.name = 'staff');

-- Insert default data retention policies
INSERT INTO data_retention_policies (table_name, retention_days, archive_before_delete, conditions) VALUES
    ('audit_logs', 2555, true, '{"severity": {"$lte": 2}}'), -- 7 years for low/medium severity
    ('audit_logs', 3650, true, '{"severity": {"$gt": 2}}'), -- 10 years for high/critical severity
    ('security_events', 1095, true, '{"resolved": true}'), -- 3 years for resolved events
    ('security_events', 2555, true, '{"resolved": false}'), -- 7 years for unresolved events
    ('user_sessions', 90, false, '{}'), -- 3 months for sessions
    ('rate_limits', 30, false, '{}'), -- 1 month for rate limits
    ('deals', 2555, true, '{"status": "rejected"}'), -- 7 years for rejected deals
    ('deals', 3650, true, '{"status": {"$ne": "rejected"}}'); -- 10 years for other deals

-- Create triggers for automatic audit logging
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM log_audit_event(
            auth.uid(),
            'create',
            TG_TABLE_NAME::resource_type,
            NEW.id,
            NULL,
            to_jsonb(NEW),
            inet_client_addr(),
            current_setting('request.headers', true)::json->>'user-agent'
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM log_audit_event(
            auth.uid(),
            'update',
            TG_TABLE_NAME::resource_type,
            NEW.id,
            to_jsonb(OLD),
            to_jsonb(NEW),
            inet_client_addr(),
            current_setting('request.headers', true)::json->>'user-agent'
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM log_audit_event(
            auth.uid(),
            'delete',
            TG_TABLE_NAME::resource_type,
            OLD.id,
            to_jsonb(OLD),
            NULL,
            inet_client_addr(),
            current_setting('request.headers', true)::json->>'user-agent'
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers for main tables
CREATE TRIGGER audit_deals_trigger
    AFTER INSERT OR UPDATE OR DELETE ON deals
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_resellers_trigger
    AFTER INSERT OR UPDATE OR DELETE ON resellers
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_end_users_trigger
    AFTER INSERT OR UPDATE OR DELETE ON end_users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_products_trigger
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_staff_users_trigger
    AFTER INSERT OR UPDATE OR DELETE ON staff_users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_eligibility_rules_trigger
    AFTER INSERT OR UPDATE OR DELETE ON eligibility_rules
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Function to clean up expired data based on retention policies
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS INTEGER AS $$
DECLARE
    policy RECORD;
    deleted_count INTEGER := 0;
    total_deleted INTEGER := 0;
BEGIN
    FOR policy IN SELECT * FROM data_retention_policies WHERE is_active = true LOOP
        EXECUTE format(
            'DELETE FROM %I WHERE created_at < NOW() - INTERVAL ''%s days''',
            policy.table_name,
            policy.retention_days
        );

        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        total_deleted := total_deleted + deleted_count;

        -- Log the cleanup operation
        PERFORM log_audit_event(
            NULL,
            'delete',
            policy.table_name::resource_type,
            NULL,
            NULL,
            jsonb_build_object('deleted_count', deleted_count, 'retention_days', policy.retention_days),
            NULL,
            'system-cleanup'
        );
    END LOOP;

    RETURN total_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job for data cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-expired-data', '0 2 * * *', 'SELECT cleanup_expired_data();');

-- Views for easier permission checking
CREATE VIEW user_permissions AS
SELECT
    ur.user_id,
    su.email,
    su.name as user_name,
    r.name as role_name,
    p.name as permission_name,
    p.resource_type,
    p.action,
    ur.is_active as role_active,
    ur.expires_at
FROM user_roles ur
JOIN staff_users su ON ur.user_id = su.id
JOIN roles r ON ur.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE ur.is_active = true
AND (ur.expires_at IS NULL OR ur.expires_at > NOW());

-- View for security dashboard
CREATE VIEW security_dashboard AS
SELECT
    (SELECT COUNT(*) FROM security_events WHERE created_at > NOW() - INTERVAL '24 hours') as events_24h,
    (SELECT COUNT(*) FROM security_events WHERE severity >= 3 AND resolved = false) as critical_unresolved,
    (SELECT COUNT(*) FROM audit_logs WHERE created_at > NOW() - INTERVAL '24 hours') as audit_events_24h,
    (SELECT COUNT(*) FROM user_sessions WHERE is_active = true) as active_sessions,
    (SELECT COUNT(*) FROM rate_limits WHERE blocked_until > NOW()) as blocked_ips,
    (SELECT COUNT(*) FROM staff_users WHERE failed_login_attempts >= 3) as locked_accounts;

-- Comments for documentation
COMMENT ON TABLE permissions IS 'Defines granular permissions for the RBAC system';
COMMENT ON TABLE roles IS 'User roles with hierarchical structure support';
COMMENT ON TABLE user_roles IS 'Many-to-many relationship between users and roles';
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all user actions';
COMMENT ON TABLE security_events IS 'Security-related events and incidents';
COMMENT ON TABLE api_keys IS 'API keys for system integrations with rate limiting';
COMMENT ON TABLE rate_limits IS 'Rate limiting tracking per identifier and endpoint';
COMMENT ON TABLE data_retention_policies IS 'Configurable data retention and cleanup policies';

COMMENT ON FUNCTION has_permission IS 'Check if a user has a specific permission';
COMMENT ON FUNCTION log_audit_event IS 'Log an audit event with comprehensive metadata';
COMMENT ON FUNCTION log_security_event IS 'Log a security event for monitoring';
COMMENT ON FUNCTION check_rate_limit IS 'Check and enforce rate limits';
COMMENT ON FUNCTION cleanup_expired_data IS 'Clean up expired data based on retention policies';
