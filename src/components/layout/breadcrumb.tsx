'use client'

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Home } from "lucide-react"
import { cn } from "@/lib/utils"

export interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ComponentType<{ className?: string }>
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[]
  className?: string
  showHome?: boolean
  separator?: React.ReactNode
}

// Route mapping for automatic breadcrumb generation
const routeMap: Record<string, string> = {
  '/': 'Dashboard',
  '/deals': 'Deals',
  '/deals/new': 'New Deal',
  '/deals/[id]': 'Deal Details',
  '/conflicts': 'Conflicts',
  '/resellers': 'Resellers',
  '/resellers/new': 'New Reseller',
  '/resellers/[id]': 'Reseller Details',
  '/end-users': 'End Users',
  '/end-users/new': 'New End User',
  '/end-users/[id]': 'End User Details',
  '/products': 'Products',
  '/products/new': 'New Product',
  '/products/[id]': 'Product Details',
  '/reports': 'Reports',
  '/settings': 'Settings',
  '/profile': 'Profile',
}

function generateBreadcrumbsFromPath(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs: BreadcrumbItem[] = []

  // Add home
  breadcrumbs.push({
    label: 'Dashboard',
    href: '/',
    icon: Home,
  })

  // Build breadcrumbs from path segments
  let currentPath = ''
  
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`
    
    // Check if this is a dynamic route (UUID pattern)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)
    
    let label = segment
    let href = currentPath
    
    if (isUuid) {
      // For UUID segments, use the parent route's label + "Details"
      const parentPath = segments.slice(0, index).join('/')
      const parentLabel = routeMap[`/${parentPath}`] || parentPath
      label = `${parentLabel} Details`
    } else {
      // Try to get label from route map
      label = routeMap[currentPath] || routeMap[`/${segment}`] || formatSegment(segment)
    }
    
    // Don't add href for the last item (current page)
    if (index === segments.length - 1) {
      href = undefined
    }
    
    breadcrumbs.push({
      label,
      href,
    })
  })

  return breadcrumbs
}

function formatSegment(segment: string): string {
  return segment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function Breadcrumb({
  items,
  className,
  showHome = true,
  separator = <ChevronRight className="h-4 w-4 text-gray-400" />,
}: BreadcrumbProps) {
  const pathname = usePathname()
  
  // Use provided items or generate from pathname
  const breadcrumbItems = items || generateBreadcrumbsFromPath(pathname)
  
  // Filter out home if showHome is false
  const filteredItems = showHome ? breadcrumbItems : breadcrumbItems.slice(1)
  
  if (filteredItems.length <= 1) {
    return null
  }

  return (
    <nav
      className={cn("flex items-center space-x-1 text-sm", className)}
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center space-x-1">
        {filteredItems.map((item, index) => {
          const isLast = index === filteredItems.length - 1
          const Icon = item.icon

          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <span className="mx-2 flex-shrink-0">
                  {separator}
                </span>
              )}
              
              <div className="flex items-center">
                {Icon && (
                  <Icon className="mr-1 h-4 w-4 flex-shrink-0" />
                )}
                
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className={cn(
                      "font-medium",
                      isLast ? "text-gray-900" : "text-gray-500"
                    )}
                  >
                    {item.label}
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// Hook for managing breadcrumbs
export function useBreadcrumbs() {
  const pathname = usePathname()
  const [customItems, setCustomItems] = React.useState<BreadcrumbItem[]>([])

  const setBreadcrumbs = React.useCallback((items: BreadcrumbItem[]) => {
    setCustomItems(items)
  }, [])

  const addBreadcrumb = React.useCallback((item: BreadcrumbItem) => {
    setCustomItems(prev => [...prev, item])
  }, [])

  const clearBreadcrumbs = React.useCallback(() => {
    setCustomItems([])
  }, [])

  const items = customItems.length > 0 ? customItems : generateBreadcrumbsFromPath(pathname)

  return {
    items,
    setBreadcrumbs,
    addBreadcrumb,
    clearBreadcrumbs,
  }
}
