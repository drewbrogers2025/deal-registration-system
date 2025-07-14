#!/bin/bash

# Fix TypeScript/ESLint errors quickly

# Fix auth-utils.ts
sed -i 's/ApprovalStatus, //g' src/lib/auth-utils.ts
sed -i 's/, pathname: string//g' src/lib/auth-utils.ts

# Fix profile page
sed -i 's/Select,//g' src/app/profile/page.tsx
sed -i 's/SelectContent,//g' src/app/profile/page.tsx
sed -i 's/SelectItem,//g' src/app/profile/page.tsx
sed -i 's/SelectTrigger,//g' src/app/profile/page.tsx
sed -i 's/SelectValue,//g' src/app/profile/page.tsx
sed -i 's/UserWithProfile,//g' src/app/profile/page.tsx
sed -i 's/: any/: unknown/g' src/app/profile/page.tsx

# Fix registration form
sed -i 's/UserRegistrationSchema,//g' src/components/auth/user-registration-form.tsx
sed -i 's/: any/: unknown/g' src/components/auth/user-registration-form.tsx

# Fix test files
sed -i 's/: any/: unknown/g' src/app/test-auth/page.tsx
sed -i 's/: any/: unknown/g' src/app/debug-auth/page.tsx

# Fix reset password
sed -i 's/err: any/err: unknown/g' src/app/auth/reset-password/page.tsx
sed -i "s/Don't/Don\&apos;t/g" src/app/auth/reset-password/page.tsx
sed -i "s/can't/can\&apos;t/g" src/app/auth/reset-password/page.tsx

# Fix verify page
sed -i "s/Don't/Don\&apos;t/g" src/app/auth/verify/page.tsx
sed -i "s/can't/can\&apos;t/g" src/app/auth/verify/page.tsx

echo "ESLint fixes applied"
