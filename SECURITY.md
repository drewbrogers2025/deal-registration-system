# Security Implementation Guide

This document outlines the comprehensive security implementation for the Deal Registration System, including Role-Based Access Control (RBAC), data security, API security, and compliance features.

## Table of Contents

1. [Overview](#overview)
2. [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
3. [Data Security](#data-security)
4. [API Security](#api-security)
5. [User Security](#user-security)
6. [Audit & Compliance](#audit--compliance)
7. [Implementation Guide](#implementation-guide)
8. [Security Configuration](#security-configuration)

## Overview

The security implementation provides:

- **Granular RBAC system** with resource-level permissions
- **Enhanced RLS policies** for data protection
- **Comprehensive audit logging** for all user actions
- **Rate limiting and API security** measures
- **GDPR compliance features** and data retention policies
- **Security monitoring and alerting**

## Role-Based Access Control (RBAC)

### System Roles

1. **Admin** - Full system access
2. **Manager** - Elevated permissions for deal management
3. **Staff** - Basic operational permissions
4. **Viewer** - Read-only access
5. **API User** - Programmatic access

### Permission Structure

Permissions follow the format: `resource.action`

**Resources:**
- `deals` - Deal management
- `resellers` - Reseller management
- `end_users` - End user management
- `products` - Product catalog
- `conflicts` - Conflict resolution
- `staff_users` - User management
- `eligibility_rules` - Business rules
- `audit_logs` - Audit trail access
- `system_settings` - System configuration
- `reports` - Reporting and analytics

**Actions:**
- `create` - Create new records
- `read` - View records
- `update` - Modify existing records
- `delete` - Remove records
- `assign` - Assign deals/conflicts
- `approve` - Approve deals
- `reject` - Reject deals
- `export` - Export data

### Usage Examples

```typescript
// Check single permission
const { allowed } = usePermission({
  resource: 'deals',
  action: 'create'
})

// Check multiple permissions
const { hasAnyPermission } = usePermissions([
  { resource: 'deals', action: 'create' },
  { resource: 'deals', action: 'update' }
])

// Component-level protection
<PermissionGuard permission={{ resource: 'deals', action: 'delete' }}>
  <DeleteButton />
</PermissionGuard>

// Admin-only content
<AdminOnly>
  <AdminPanel />
</AdminOnly>
```

## Data Security

### Row Level Security (RLS)

All tables have RLS enabled with policies that:
- Restrict access based on user roles
- Implement context-aware permissions
- Protect sensitive data fields
- Log all access attempts

### Data Encryption

Sensitive fields are encrypted using AES-256:
- Password hashes
- Two-factor authentication secrets
- API keys
- Personal identifiable information (PII)

### Data Classification

Data is classified into four levels:
- **Public** (0) - No restrictions
- **Internal** (1) - Company internal use
- **Confidential** (2) - Restricted access, encryption required
- **Restricted** (3) - Highest security, audit required

## API Security

### Security Middleware

All API routes are protected with comprehensive middleware:

```typescript
export const GET = withSecurity(
  async (req, context) => {
    // Your handler logic
  },
  {
    requireAuth: true,
    permissions: [{ resource: 'deals', action: 'read' }],
    rateLimit: { requests: 100, windowMs: 60000 },
    validateInput: true,
    logAccess: true
  }
)
```

### Rate Limiting

Configurable rate limits per endpoint:
- Authentication endpoints: 5 requests/15 minutes
- Data modification: 50 requests/hour
- Data export: 5 requests/hour
- General API: 100 requests/hour

### Input Validation

Automatic validation for:
- SQL injection patterns
- XSS attempts
- Payload size limits
- Data type validation

### Security Headers

All responses include security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy` with strict policies

## User Security

### Password Policy

Enforced password requirements:
- Minimum 8 characters
- Uppercase and lowercase letters
- Numbers and special characters
- Maximum age of 90 days
- Common password detection

### Account Security

- Failed login attempt tracking
- Automatic account lockout (5 attempts)
- Session management with timeouts
- Concurrent session limits
- Two-factor authentication support

### Session Management

- Secure session tokens
- Configurable session duration
- Idle timeout protection
- Session invalidation on logout

## Audit & Compliance

### Audit Logging

Comprehensive logging of:
- All user actions (CRUD operations)
- Authentication events
- Permission changes
- Data exports
- System configuration changes

### Security Events

Monitoring and alerting for:
- Failed login attempts
- Permission violations
- Suspicious activity patterns
- Rate limit violations
- Critical system events

### GDPR Compliance

Features for GDPR compliance:
- Data subject rights management
- Data retention policies
- Audit trail for data processing
- Data export capabilities
- Right to be forgotten implementation

### Data Retention

Configurable retention policies:
- Audit logs: 7 years (standard), 10 years (critical)
- Security events: 3 years (resolved), 7 years (unresolved)
- User sessions: 90 days
- Deal data: 7-10 years based on status

## Implementation Guide

### 1. Database Setup

Run the security schema migration:

```sql
-- Apply the security schema
\i supabase/security-schema.sql
```

### 2. Environment Variables

Add required environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. API Route Protection

Wrap your API routes with security middleware:

```typescript
import { withSecurity } from '@/lib/security/middleware'

export const GET = withSecurity(handler, config)
```

### 4. Component Protection

Use RBAC components in your UI:

```typescript
import { PermissionGuard, AdminOnly } from '@/components/rbac/permission-guard'
```

### 5. Security Dashboard

Add the security dashboard for monitoring:

```typescript
import { SecurityDashboard } from '@/components/security/security-dashboard'
```

## Security Configuration

### Rate Limiting Configuration

```typescript
// In src/lib/security/config.ts
export const securityConfig = {
  rateLimiting: {
    defaultLimit: 100,
    windowMinutes: 60,
    endpoints: {
      '/api/auth/login': { limit: 5, window: 15 },
      '/api/export/*': { limit: 5, window: 60 }
    }
  }
}
```

### Permission Configuration

```typescript
// Assign permissions to roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'manager'
AND p.name IN ('deals.create', 'deals.read', 'deals.update')
```

### Security Monitoring

Monitor security metrics:
- Active user sessions
- Failed login attempts
- Security events by severity
- Rate limit violations
- Audit log volume

## Best Practices

1. **Principle of Least Privilege** - Grant minimum required permissions
2. **Defense in Depth** - Multiple security layers
3. **Regular Audits** - Review permissions and access logs
4. **Security Training** - Educate users on security practices
5. **Incident Response** - Have procedures for security incidents
6. **Regular Updates** - Keep dependencies and security measures current

## Security Checklist

- [ ] RLS policies enabled on all tables
- [ ] Audit logging configured
- [ ] Rate limiting implemented
- [ ] Input validation active
- [ ] Security headers configured
- [ ] Password policy enforced
- [ ] Session management configured
- [ ] Permission system tested
- [ ] Security dashboard deployed
- [ ] Incident response plan ready

## Support

For security-related questions or to report vulnerabilities:
- Create an issue in the repository
- Contact the security team
- Follow responsible disclosure practices

## License

This security implementation is part of the Deal Registration System and follows the same license terms.
