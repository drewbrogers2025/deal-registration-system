import type { SecurityConfig } from '@/lib/rbac/types'

/**
 * Security configuration for the application
 */
export const securityConfig: SecurityConfig = {
  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAge: 90 // days
  },

  sessionPolicy: {
    maxDuration: 24 * 60, // 24 hours in minutes
    idleTimeout: 30, // 30 minutes
    maxConcurrentSessions: 3
  },

  rateLimiting: {
    defaultLimit: 100, // requests per window
    windowMinutes: 60, // 1 hour window
    endpoints: {
      '/api/auth/login': { limit: 5, window: 15 }, // 5 attempts per 15 minutes
      '/api/auth/register': { limit: 3, window: 60 }, // 3 attempts per hour
      '/api/auth/reset-password': { limit: 3, window: 60 },
      '/api/deals': { limit: 200, window: 60 }, // Higher limit for main API
      '/api/resellers': { limit: 100, window: 60 },
      '/api/products': { limit: 100, window: 60 },
      '/api/conflicts': { limit: 50, window: 60 },
      '/api/audit': { limit: 20, window: 60 }, // Lower limit for sensitive data
      '/api/export': { limit: 5, window: 60 }, // Very low limit for exports
      '/api/admin': { limit: 50, window: 60 } // Admin endpoints
    }
  },

  auditPolicy: {
    retentionDays: 2555, // 7 years
    logLevel: 'detailed', // minimal | standard | detailed
    sensitiveFields: [
      'password',
      'password_hash',
      'two_factor_secret',
      'api_key',
      'session_token',
      'credit_card',
      'ssn',
      'tax_id'
    ]
  },

  twoFactorAuth: {
    enabled: true,
    required: false, // Can be enabled per user or role
    issuer: 'Deal Registration System'
  }
}

/**
 * CORS configuration
 */
export const corsConfig = {
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://deal-registration-system.vercel.app',
        'https://your-domain.com'
      ]
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-API-Key',
    'X-Session-ID'
  ],
  credentials: true,
  maxAge: 86400 // 24 hours
}

/**
 * Content Security Policy
 */
export const cspConfig = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Required for Next.js
    "'unsafe-eval'", // Required for development
    'https://vercel.live'
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for styled-components and CSS-in-JS
    'https://fonts.googleapis.com'
  ],
  'font-src': [
    "'self'",
    'https://fonts.gstatic.com'
  ],
  'img-src': [
    "'self'",
    'data:',
    'https:',
    'blob:'
  ],
  'connect-src': [
    "'self'",
    'https://*.supabase.co',
    'wss://*.supabase.co',
    'https://vercel.live'
  ],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'upgrade-insecure-requests': []
}

/**
 * Security headers configuration
 */
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Content-Security-Policy': Object.entries(cspConfig)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ')
}

/**
 * API endpoint security configurations
 */
export const endpointSecurity = {
  '/api/auth/*': {
    requireAuth: false,
    rateLimit: { requests: 5, windowMs: 15 * 60 * 1000 }, // 15 minutes
    validateInput: true,
    logAccess: true
  },
  '/api/deals': {
    requireAuth: true,
    permissions: [{ resource: 'deals', action: 'read' }],
    rateLimit: { requests: 200, windowMs: 60 * 60 * 1000 }, // 1 hour
    validateInput: true,
    logAccess: true
  },
  '/api/deals/*': {
    requireAuth: true,
    permissions: [{ resource: 'deals', action: 'update' }],
    rateLimit: { requests: 100, windowMs: 60 * 60 * 1000 },
    validateInput: true,
    logAccess: true
  },
  '/api/resellers': {
    requireAuth: true,
    permissions: [{ resource: 'resellers', action: 'read' }],
    rateLimit: { requests: 100, windowMs: 60 * 60 * 1000 },
    validateInput: true,
    logAccess: true
  },
  '/api/products': {
    requireAuth: true,
    permissions: [{ resource: 'products', action: 'read' }],
    rateLimit: { requests: 100, windowMs: 60 * 60 * 1000 },
    validateInput: true,
    logAccess: false // Products are read frequently
  },
  '/api/conflicts': {
    requireAuth: true,
    permissions: [{ resource: 'conflicts', action: 'read' }],
    rateLimit: { requests: 50, windowMs: 60 * 60 * 1000 },
    validateInput: true,
    logAccess: true
  },
  '/api/audit': {
    requireAuth: true,
    permissions: [{ resource: 'audit_logs', action: 'read' }],
    rateLimit: { requests: 20, windowMs: 60 * 60 * 1000 },
    validateInput: true,
    logAccess: true
  },
  '/api/export/*': {
    requireAuth: true,
    permissions: [{ resource: 'deals', action: 'export' }],
    rateLimit: { requests: 5, windowMs: 60 * 60 * 1000 },
    validateInput: true,
    logAccess: true
  },
  '/api/admin/*': {
    requireAuth: true,
    permissions: [{ resource: 'system_settings', action: 'update' }],
    rateLimit: { requests: 50, windowMs: 60 * 60 * 1000 },
    validateInput: true,
    logAccess: true
  }
}

/**
 * Data classification levels
 */
export const dataClassification = {
  PUBLIC: 0,
  INTERNAL: 1,
  CONFIDENTIAL: 2,
  RESTRICTED: 3
}

/**
 * Field-level security classification
 */
export const fieldSecurity = {
  // Staff users
  'staff_users.email': dataClassification.CONFIDENTIAL,
  'staff_users.password_hash': dataClassification.RESTRICTED,
  'staff_users.two_factor_secret': dataClassification.RESTRICTED,
  
  // Resellers
  'resellers.email': dataClassification.CONFIDENTIAL,
  'resellers.territory': dataClassification.INTERNAL,
  
  // End users
  'end_users.contact_email': dataClassification.CONFIDENTIAL,
  'end_users.contact_name': dataClassification.CONFIDENTIAL,
  'end_users.company_name': dataClassification.INTERNAL,
  
  // Deals
  'deals.deal_value': dataClassification.CONFIDENTIAL,
  'deals.notes': dataClassification.INTERNAL,
  
  // Audit logs
  'audit_logs.*': dataClassification.CONFIDENTIAL,
  
  // Security events
  'security_events.*': dataClassification.RESTRICTED
}

/**
 * Encryption requirements by data classification
 */
export const encryptionRequirements = {
  [dataClassification.PUBLIC]: { required: false, algorithm: null },
  [dataClassification.INTERNAL]: { required: false, algorithm: null },
  [dataClassification.CONFIDENTIAL]: { required: true, algorithm: 'AES-256' },
  [dataClassification.RESTRICTED]: { required: true, algorithm: 'AES-256' }
}

/**
 * Access logging requirements by data classification
 */
export const accessLoggingRequirements = {
  [dataClassification.PUBLIC]: false,
  [dataClassification.INTERNAL]: false,
  [dataClassification.CONFIDENTIAL]: true,
  [dataClassification.RESTRICTED]: true
}

/**
 * Data retention policies by classification
 */
export const retentionPolicies = {
  [dataClassification.PUBLIC]: { days: 365, archive: false },
  [dataClassification.INTERNAL]: { days: 2555, archive: true }, // 7 years
  [dataClassification.CONFIDENTIAL]: { days: 2555, archive: true },
  [dataClassification.RESTRICTED]: { days: 3650, archive: true } // 10 years
}

/**
 * Get security configuration for an endpoint
 */
export function getEndpointSecurity(path: string) {
  // Find the most specific match
  const matches = Object.keys(endpointSecurity)
    .filter(pattern => {
      if (pattern.endsWith('*')) {
        return path.startsWith(pattern.slice(0, -1))
      }
      return path === pattern
    })
    .sort((a, b) => b.length - a.length) // Most specific first

  return matches.length > 0 ? endpointSecurity[matches[0] as keyof typeof endpointSecurity] : null
}

/**
 * Get field security classification
 */
export function getFieldSecurity(tableName: string, fieldName: string): number {
  const key = `${tableName}.${fieldName}`
  const wildcardKey = `${tableName}.*`
  
  return fieldSecurity[key as keyof typeof fieldSecurity] || 
         fieldSecurity[wildcardKey as keyof typeof fieldSecurity] || 
         dataClassification.INTERNAL
}
