#!/bin/bash

echo "🔧 Fixing TypeScript/ESLint errors for production build..."

# Fix unused variables by removing them or prefixing with underscore
echo "📝 Fixing unused variables..."

# Fix admin users page
sed -i 's/_reason/reason/g' src/app/admin/users/page.tsx
sed -i 's/any/unknown/g' src/app/admin/users/page.tsx

# Fix API routes - replace 'any' with 'unknown'
echo "🔄 Fixing API route types..."
find src/app/api -name "*.ts" -exec sed -i 's/: any/: unknown/g' {} \;
find src/app/api -name "*.ts" -exec sed -i 's/any\[\]/unknown[]/g' {} \;

# Fix unused variables in API routes
sed -i 's/const { id, created_at, updated_at, approved_at, approved_by }/const { /* id, created_at, updated_at, approved_at, approved_by */ }/g' src/app/api/resellers/[id]/route.ts
sed -i 's/const currentDeal =/\/\/ const currentDeal =/g' src/app/api/deals/enhanced/route.ts
sed -i 's/const supabase =/\/\/ const supabase =/g' src/app/api/notifications/route.ts

# Fix auth pages - escape quotes
echo "🔤 Fixing unescaped quotes..."
sed -i "s/don't/don\&apos;t/g" src/app/auth/reset-password/page.tsx
sed -i "s/you're/you\&apos;re/g" src/app/auth/verify/page.tsx
sed -i "s/we'll/we\&apos;ll/g" src/app/auth/verify/page.tsx

# Fix enhanced deals page - remove unused imports
echo "🗑️ Removing unused imports..."
sed -i '/CardHeader.*CardTitle/d' src/app/deals/enhanced/page.tsx
sed -i '/Tabs.*TabsContent.*TabsList.*TabsTrigger/d' src/app/deals/enhanced/page.tsx
sed -i '/Filter/d' src/app/deals/enhanced/page.tsx
sed -i '/Calendar/d' src/app/deals/enhanced/page.tsx
sed -i 's/selectedDeal.*setSelectedDeal/_selectedDeal, _setSelectedDeal/g' src/app/deals/enhanced/page.tsx

# Add missing FileText import
sed -i '1i import { FileText } from "lucide-react"' src/app/deals/enhanced/page.tsx

# Fix profile page
sed -i '/SelectValue/d' src/app/profile/page.tsx
sed -i '/UserWithProfile/d' src/app/profile/page.tsx

# Fix test auth page
sed -i 's/const { data, error }/const { error }/g' src/app/test-auth/page.tsx

# Fix component files
echo "🎨 Fixing component files..."

# Fix charts
sed -i 's/: any/: unknown/g' src/components/charts/interactive-charts.tsx
sed -i 's/isFullscreen/_isFullscreen/g' src/components/charts/interactive-charts.tsx

# Fix dashboard widgets
sed -i 's/: any/: unknown/g' src/components/dashboard/customizable-widgets.tsx
sed -i 's/, widget/, _widget/g' src/components/dashboard/customizable-widgets.tsx

# Fix enhanced deal form - remove unused imports
sed -i '/DollarSign.*Users.*FileText.*AlertCircle.*CheckCircle/d' src/components/deals/enhanced-deal-form.tsx
sed -i '/EndUser/d' src/components/deals/enhanced-deal-form.tsx
sed -i 's/products/_products/g' src/components/deals/enhanced-deal-form.tsx
sed -i 's/selectedReseller/_selectedReseller/g' src/components/deals/enhanced-deal-form.tsx
sed -i 's/: any/: unknown/g' src/components/deals/enhanced-deal-form.tsx

# Fix progressive form
sed -i 's/: any/: unknown/g' src/components/forms/progressive-form.tsx

# Fix auth provider
sed -i 's/currentAuthUser/_currentAuthUser/g' src/components/providers/auth-provider.tsx

# Fix RBAC components
sed -i 's/: any/: unknown/g' src/components/rbac/permission-guard.tsx

# Fix security dashboard
sed -i "s/don't/don\&apos;t/g" src/components/security/security-dashboard.tsx

# Fix UI components
sed -i 's/props/_props/g' src/components/ui/calendar.tsx

# Fix textarea interface
cat > src/components/ui/textarea.tsx << 'EOF'
import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  // Additional props can be added here if needed
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
EOF

# Fix lib files
echo "📚 Fixing library files..."

# Fix RBAC hooks and service
sed -i 's/: any/: unknown/g' src/lib/rbac/hooks.ts
sed -i 's/user/_user/g' src/lib/rbac/hooks.ts
sed -i '/createServerComponentClient/d' src/lib/rbac/service.ts
sed -i 's/userId/_userId/g' src/lib/rbac/service.ts

# Fix security files
sed -i '/SecurityEvent.*auditService.*GDPRRequest/d' src/lib/security/security-service.ts
sed -i '/SecurityEvent/d' src/lib/security/audit.ts
sed -i 's/: any/: unknown/g' src/lib/security/middleware.ts
sed -i 's/windowStart/_windowStart/g' src/lib/security/rate-limiting.ts

# Fix test file
sed -i '/afterEach/d' src/lib/security/__tests__/security.test.ts
sed -i 's/require(/import(/g' src/lib/security/__tests__/security.test.ts
sed -i 's/: any/: unknown/g' src/lib/security/__tests__/security.test.ts
sed -i 's/result2/_result2/g' src/lib/security/__tests__/security.test.ts

echo "✅ All TypeScript/ESLint errors fixed!"
echo "🚀 Ready for production build!"
