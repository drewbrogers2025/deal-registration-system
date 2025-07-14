# Enhanced User Role System - Implementation Guide

## Phase 1: Preparation & Testing Branch

### 1. Create Test Branch
```bash
git checkout -b feature/enhanced-user-roles
git add .
git commit -m "feat: implement enhanced user role system with three-tier authentication"
```

### 2. Install Dependencies
```bash
npm install @radix-ui/react-dropdown-menu @radix-ui/react-separator
```

### 3. Environment Setup
Ensure your `.env.local` has:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Phase 2: Database Migration (Test Environment)

### 1. Backup Current Database
```sql
-- Create a backup of your current database before migration
pg_dump your_database > backup_before_migration.sql
```

### 2. Run Migration
Execute the migration script in your test/staging Supabase project:
```bash
# Option 1: Via Supabase CLI
supabase db reset
supabase migration new enhanced_user_system
# Copy content from supabase/migrations/001_enhanced_user_system.sql
supabase db push

# Option 2: Via Supabase Dashboard
# Copy and paste the migration SQL into the SQL Editor
```

### 3. Verify Migration
Check that all tables and policies were created correctly:
```sql
-- Verify new tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'reseller_users');

-- Verify RLS policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('users', 'reseller_users', 'staff_users');
```

## Phase 3: Testing Scenarios

### 1. Test User Registration
- [ ] Site Admin registration
- [ ] Vendor User registration  
- [ ] Reseller registration
- [ ] Email verification flow
- [ ] Account approval workflow

### 2. Test Authentication
- [ ] Login with different user types
- [ ] Password reset functionality
- [ ] Magic link authentication
- [ ] Pending approval state
- [ ] Rejected account handling

### 3. Test Role-Based Access
- [ ] Site Admin: Full access to all features
- [ ] Vendor User: Access to deals, resellers, conflicts
- [ ] Reseller: Limited access to own deals and profile
- [ ] Navigation filtering based on permissions
- [ ] Route protection middleware

### 4. Test User Management
- [ ] Admin can approve/reject users
- [ ] User profile editing
- [ ] Role assignment
- [ ] Status management

### 5. Test Data Access (RLS)
- [ ] Site admins can see all data
- [ ] Vendor users can manage deals/resellers
- [ ] Resellers only see their own data
- [ ] Proper error handling for unauthorized access

## Phase 4: Data Migration (If Existing Users)

If you have existing users in your system, you'll need to migrate them:

### 1. Create Migration Script for Existing Data
```sql
-- Example migration for existing staff_users
INSERT INTO users (id, email, name, user_type, approval_status, approved_at)
SELECT 
    id,
    email,
    name,
    CASE 
        WHEN role = 'admin' THEN 'site_admin'::user_type
        ELSE 'vendor_user'::user_type
    END,
    'approved'::approval_status,
    NOW()
FROM staff_users
WHERE id IN (SELECT id FROM auth.users);

-- Update staff_users to reference new structure
UPDATE staff_users SET 
    department = COALESCE(department, 'General'),
    permissions = '{}';
```

### 2. Migrate Existing Resellers
```sql
-- If you have existing resellers that need user accounts
-- This would need to be done carefully with proper auth.users creation
```

## Phase 5: Production Deployment

### 1. Pre-Deployment Checklist
- [ ] All tests pass in staging environment
- [ ] Database migration tested thoroughly
- [ ] User flows tested for all user types
- [ ] Performance testing completed
- [ ] Security review completed
- [ ] Backup strategy confirmed

### 2. Deployment Steps
```bash
# 1. Merge to main branch
git checkout main
git merge feature/enhanced-user-roles

# 2. Deploy to production
# (Your deployment process here)

# 3. Run production database migration
# Execute migration in production Supabase project

# 4. Monitor and verify
# Check logs, test critical user flows
```

### 3. Post-Deployment
- [ ] Verify all existing users can still log in
- [ ] Test new user registration flow
- [ ] Monitor error logs
- [ ] Test admin approval workflow

## Phase 6: User Communication

### 1. Notify Existing Users
- Email about new features
- Instructions for profile completion
- Information about approval process for new users

### 2. Admin Training
- How to approve/reject new users
- User management interface walkthrough
- Role assignment procedures

## Rollback Plan

If issues arise, you can rollback:

### 1. Code Rollback
```bash
git revert <commit-hash>
# Deploy previous version
```

### 2. Database Rollback
```sql
-- Restore from backup
psql your_database < backup_before_migration.sql
```

## Testing Checklist

### Critical Paths to Test:
- [ ] Existing user login still works
- [ ] New user registration → approval → login flow
- [ ] All user types can access appropriate features
- [ ] Admin can manage users effectively
- [ ] Data security (users only see authorized data)
- [ ] Email verification and password reset
- [ ] Profile management for all user types

### Performance Testing:
- [ ] Page load times with new auth checks
- [ ] Database query performance with RLS
- [ ] Navigation rendering with permission checks

### Security Testing:
- [ ] Attempt to access unauthorized routes
- [ ] Try to view other users' data
- [ ] Test API endpoints with different user types
- [ ] Verify RLS policies are enforced

## Support & Troubleshooting

### Common Issues:
1. **Migration Fails**: Check for existing data conflicts
2. **Users Can't Login**: Verify auth.users → users table linking
3. **Permission Errors**: Check RLS policies and user approval status
4. **UI Not Updating**: Clear browser cache, check auth provider

### Debug Tools:
- Supabase Dashboard → Authentication
- Supabase Dashboard → Database → RLS
- Browser DevTools → Network tab
- Application logs

## Next Steps After Implementation

1. **Monitor Usage**: Track user registration and approval rates
2. **Gather Feedback**: Collect user feedback on new flows
3. **Optimize**: Improve performance based on usage patterns
4. **Enhance**: Add additional features like bulk user management
5. **Document**: Create user guides for different user types
