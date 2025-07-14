import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount)
}

// Date formatting utilities
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}



// String utilities
export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Fuzzy matching for duplicate detection
export function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1
  
  if (longer.length === 0) return 1.0
  
  const distance = levenshteinDistance(longer, shorter)
  return (longer.length - distance) / longer.length
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = []
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  
  return matrix[str2.length][str1.length]
}

// Company name normalization for better matching
export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(inc|corp|corporation|ltd|limited|llc|co)\b\.?/g, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Territory overlap detection
export function checkTerritoryOverlap(territory1: string, territory2: string): boolean {
  const t1 = territory1.toLowerCase().trim()
  const t2 = territory2.toLowerCase().trim()
  
  // Exact match
  if (t1 === t2) return true
  
  // Check for common territory patterns
  const patterns = [
    /^(north|south|east|west)\s*(america|us|usa|united states)$/,
    /^(northeast|northwest|southeast|southwest)\s*(region|territory)?$/,
    /^(global|worldwide|international)$/,
    /^(enterprise|commercial|federal)$/,
  ]
  
  for (const pattern of patterns) {
    if (pattern.test(t1) && pattern.test(t2)) return true
  }
  
  return false
}

// Deal value comparison with tolerance
export function isDealValueSimilar(value1: number, value2: number, tolerance = 0.1): boolean {
  const diff = Math.abs(value1 - value2)
  const avg = (value1 + value2) / 2
  return diff / avg <= tolerance
}

// Time window checking
export function isWithinTimeWindow(date1: string | Date, date2: string | Date, windowDays = 90): boolean {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  const diffTime = Math.abs(d2.getTime() - d1.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays <= windowDays
}

// Validation utilities
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// Array utilities
export function groupBy<T, K extends keyof Record<string, unknown>>(array: T[], key: (item: T) => K): Record<K, T[]> {
  return array.reduce((groups, item) => {
    const group = key(item)
    groups[group] = groups[group] || []
    groups[group].push(item)
    return groups
  }, {} as Record<K, T[]>)
}

export function sortBy<T>(array: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[key]
    const bVal = b[key]
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1
    if (aVal > bVal) return direction === 'asc' ? 1 : -1
    return 0
  })
}

// Debounce utility for search
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Error handling
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'An unknown error occurred'
}

// Status badge colors
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    assigned: 'bg-green-100 text-green-800',
    disputed: 'bg-red-100 text-red-800',
    approved: 'bg-blue-100 text-blue-800',
    rejected: 'bg-gray-100 text-gray-800',
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    resolved: 'bg-green-100 text-green-800',
    dismissed: 'bg-gray-100 text-gray-800',
  }
  
  return colors[status] || 'bg-gray-100 text-gray-800'
}

// Priority calculation for conflicts
export function calculateConflictPriority(
  dealValue: number,
  conflictType: string,
  daysSinceSubmission: number
): 'high' | 'medium' | 'low' {
  let score = 0

  // Deal value weight
  if (dealValue > 100000) score += 3
  else if (dealValue > 50000) score += 2
  else score += 1

  // Conflict type weight
  if (conflictType === 'duplicate_end_user') score += 3
  else if (conflictType === 'territory_overlap') score += 2
  else score += 1

  // Time weight
  if (daysSinceSubmission > 7) score += 2
  else if (daysSinceSubmission > 3) score += 1

  if (score >= 7) return 'high'
  if (score >= 4) return 'medium'
  return 'low'
}

// Pricing utilities
export function calculateDiscountAmount(
  basePrice: number,
  discountType: 'percentage' | 'fixed_amount',
  discountValue: number,
  quantity: number = 1
): number {
  if (discountType === 'percentage') {
    return (basePrice * quantity * discountValue) / 100
  } else {
    return discountValue * quantity
  }
}

export function formatPriceRange(minPrice: number, maxPrice: number): string {
  if (minPrice === maxPrice) {
    return formatCurrency(minPrice)
  }
  return `${formatCurrency(minPrice)} - ${formatCurrency(maxPrice)}`
}

export function calculateMargin(costPrice: number, sellPrice: number): number {
  if (costPrice === 0) return 0
  return ((sellPrice - costPrice) / sellPrice) * 100
}

export function formatMargin(margin: number): string {
  return `${margin.toFixed(1)}%`
}

// Product utilities
export function generateSKU(productName: string, category: string): string {
  const nameCode = productName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, 3)

  const categoryCode = category
    .substring(0, 3)
    .toUpperCase()

  const timestamp = Date.now().toString().slice(-4)

  return `${categoryCode}-${nameCode}-${timestamp}`
}

export function getProductStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'active':
      return 'bg-green-100 text-green-800'
    case 'discontinued':
      return 'bg-red-100 text-red-800'
    case 'coming_soon':
      return 'bg-blue-100 text-blue-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function getCategoryColor(category: string): string {
  switch (category.toLowerCase()) {
    case 'software':
      return 'bg-blue-100 text-blue-800'
    case 'hardware':
      return 'bg-green-100 text-green-800'
    case 'services':
      return 'bg-purple-100 text-purple-800'
    case 'support':
      return 'bg-orange-100 text-orange-800'
    case 'training':
      return 'bg-indigo-100 text-indigo-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}
