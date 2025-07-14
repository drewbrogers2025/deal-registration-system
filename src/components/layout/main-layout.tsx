import { RoleBasedNavigation } from './role-based-navigation'
import { Header } from './header'
import { Breadcrumb } from './breadcrumb'
import { useMobileDetection } from '@/hooks/use-mobile-detection'
import { cn } from '@/lib/utils'

interface MainLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
  showBreadcrumbs?: boolean
  className?: string
}

export function MainLayout({
  children,
  title,
  subtitle,
  showBreadcrumbs = true,
  className
}: MainLayoutProps) {
  const { isMobile } = useMobileDetection()

  return (
    <div className="flex h-screen bg-gray-100">
      <RoleBasedNavigation />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title={title} subtitle={subtitle} />

        {showBreadcrumbs && (
          <div className="border-b bg-white px-6 py-2">
            <Breadcrumb />
          </div>
        )}

        <main className={cn(
          "flex-1 overflow-auto",
          isMobile ? "p-4" : "p-6",
          className
        )}>
          {children}
        </main>
      </div>
    </div>
  )
}
