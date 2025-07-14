'use client'

import * as React from "react"
import { useMobileDetection, useOrientation } from '@/hooks/use-mobile-detection'
import { cn } from '@/lib/utils'

interface MobileLayoutProps {
  children: React.ReactNode
  className?: string
}

export function MobileLayout({ children, className }: MobileLayoutProps) {
  const { isMobile, isTablet } = useMobileDetection()
  const orientation = useOrientation()

  return (
    <div
      className={cn(
        "min-h-screen",
        isMobile && "text-sm",
        isTablet && orientation === 'landscape' && "text-base",
        className
      )}
    >
      {children}
    </div>
  )
}

interface MobileCardProps {
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function MobileCard({ children, className, padding = 'md' }: MobileCardProps) {
  const { isMobile } = useMobileDetection()

  const paddingClasses = {
    none: '',
    sm: isMobile ? 'p-3' : 'p-4',
    md: isMobile ? 'p-4' : 'p-6',
    lg: isMobile ? 'p-6' : 'p-8',
  }

  return (
    <div
      className={cn(
        "bg-white rounded-lg border shadow-sm",
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  )
}

interface MobileGridProps {
  children: React.ReactNode
  columns?: {
    mobile?: number
    tablet?: number
    desktop?: number
  }
  gap?: 'sm' | 'md' | 'lg'
  className?: string
}

export function MobileGrid({
  children,
  columns = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 'md',
  className,
}: MobileGridProps) {
  const { isMobile, isTablet, isDesktop } = useMobileDetection()

  const getGridCols = () => {
    if (isMobile) return `grid-cols-${columns.mobile || 1}`
    if (isTablet) return `grid-cols-${columns.tablet || 2}`
    if (isDesktop) return `grid-cols-${columns.desktop || 3}`
    return 'grid-cols-1'
  }

  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  }

  return (
    <div
      className={cn(
        "grid",
        getGridCols(),
        gapClasses[gap],
        className
      )}
    >
      {children}
    </div>
  )
}

interface MobileStackProps {
  children: React.ReactNode
  spacing?: 'sm' | 'md' | 'lg'
  className?: string
}

export function MobileStack({ children, spacing = 'md', className }: MobileStackProps) {
  const spacingClasses = {
    sm: 'space-y-2',
    md: 'space-y-4',
    lg: 'space-y-6',
  }

  return (
    <div className={cn("flex flex-col", spacingClasses[spacing], className)}>
      {children}
    </div>
  )
}

interface MobileButtonGroupProps {
  children: React.ReactNode
  orientation?: 'horizontal' | 'vertical'
  fullWidth?: boolean
  className?: string
}

export function MobileButtonGroup({
  children,
  orientation = 'horizontal',
  fullWidth = false,
  className,
}: MobileButtonGroupProps) {
  const { isMobile } = useMobileDetection()

  // Force vertical orientation on mobile for better touch targets
  const actualOrientation = isMobile ? 'vertical' : orientation

  return (
    <div
      className={cn(
        "flex",
        actualOrientation === 'vertical' ? "flex-col space-y-2" : "flex-row space-x-2",
        fullWidth && "w-full",
        isMobile && actualOrientation === 'vertical' && "[&>*]:w-full",
        className
      )}
    >
      {children}
    </div>
  )
}

interface MobileListProps {
  children: React.ReactNode
  dividers?: boolean
  padding?: 'none' | 'sm' | 'md'
  className?: string
}

export function MobileList({
  children,
  dividers = true,
  padding = 'md',
  className,
}: MobileListProps) {
  const { isMobile } = useMobileDetection()

  const paddingClasses = {
    none: '',
    sm: isMobile ? 'py-2 px-3' : 'py-3 px-4',
    md: isMobile ? 'py-3 px-4' : 'py-4 px-6',
  }

  return (
    <div className={cn("bg-white rounded-lg border", className)}>
      {React.Children.map(children, (child, index) => (
        <div
          key={index}
          className={cn(
            paddingClasses[padding],
            dividers && index > 0 && "border-t",
            "first:rounded-t-lg last:rounded-b-lg"
          )}
        >
          {child}
        </div>
      ))}
    </div>
  )
}

interface MobileListItemProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  icon?: React.ReactNode
  onClick?: () => void
  className?: string
}

export function MobileListItem({
  title,
  subtitle,
  action,
  icon,
  onClick,
  className,
}: MobileListItemProps) {
  const { isMobile } = useMobileDetection()

  return (
    <div
      className={cn(
        "flex items-center space-x-3",
        onClick && "cursor-pointer hover:bg-gray-50 active:bg-gray-100",
        isMobile && "min-h-[48px]", // Minimum touch target size
        className
      )}
      onClick={onClick}
    >
      {icon && (
        <div className="flex-shrink-0">
          {icon}
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-medium text-gray-900 truncate",
          isMobile ? "text-sm" : "text-base"
        )}>
          {title}
        </p>
        {subtitle && (
          <p className={cn(
            "text-gray-500 truncate",
            isMobile ? "text-xs" : "text-sm"
          )}>
            {subtitle}
          </p>
        )}
      </div>
      
      {action && (
        <div className="flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  )
}

interface MobileTabsProps {
  tabs: Array<{
    id: string
    label: string
    content: React.ReactNode
    badge?: string | number
  }>
  activeTab: string
  onTabChange: (tabId: string) => void
  className?: string
}

export function MobileTabs({
  tabs,
  activeTab,
  onTabChange,
  className,
}: MobileTabsProps) {
  const { isMobile } = useMobileDetection()

  return (
    <div className={cn("space-y-4", className)}>
      {/* Tab Navigation */}
      <div className={cn(
        "flex border-b",
        isMobile ? "overflow-x-auto scrollbar-hide" : "flex-wrap"
      )}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
              activeTab === tab.id
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
              isMobile && "min-w-[80px] justify-center"
            )}
          >
            <span>{tab.label}</span>
            {tab.badge && (
              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {tabs.find(tab => tab.id === activeTab)?.content}
      </div>
    </div>
  )
}

// Hook for managing mobile-specific state
export function useMobileState() {
  const { isMobile, isTablet } = useMobileDetection()
  const [isMenuOpen, setIsMenuOpen] = React.useState(false)
  const [activeSheet, setActiveSheet] = React.useState<string | null>(null)

  // Close menu when switching to desktop
  React.useEffect(() => {
    if (!isMobile && !isTablet) {
      setIsMenuOpen(false)
      setActiveSheet(null)
    }
  }, [isMobile, isTablet])

  return {
    isMobile,
    isTablet,
    isMenuOpen,
    setIsMenuOpen,
    activeSheet,
    setActiveSheet,
  }
}
