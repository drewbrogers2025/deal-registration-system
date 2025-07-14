'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { UserRegistrationSchema, ResellerRegistrationSchema, StaffRegistrationSchema } from '@/lib/types'
import { UserPlus, Building2, Shield, Users } from 'lucide-react'
import type { UserType } from '@/lib/types'

interface UserRegistrationFormProps {
  userType?: UserType['_type']
  onSuccess?: () => void
}

export function UserRegistrationForm({ userType, onSuccess }: UserRegistrationFormProps) {
  console.log('🔧 UserRegistrationForm component loaded')

  const [selectedUserType, setSelectedUserType] = useState<UserType['_type']>(userType || 'reseller')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    company_position: '',
    // Reseller specific fields
    reseller_company_name: '',
    reseller_territory: '',
    reseller_tier: 'bronze' as const,
    company_address: '',
    company_phone: '',
    website: '',
    business_license: '',
    tax_id: '',
    // Staff specific fields
    role: 'staff' as const,
    department: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  const validateForm = () => {
    console.log('🔍 Starting form validation...')
    if (formData.password !== formData.confirmPassword) {
      console.log('❌ Password mismatch')
      setError('Passwords do not match')
      return false
    }

    try {
      const baseData = {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        user_type: selectedUserType,
        phone: formData.phone || undefined,
        company_position: formData.company_position || undefined,
      }

      if (selectedUserType === 'reseller') {
        ResellerRegistrationSchema.parse({
          ...baseData,
          reseller_company_name: formData.reseller_company_name,
          reseller_territory: formData.reseller_territory,
          reseller_tier: formData.reseller_tier,
          company_address: formData.company_address || undefined,
          company_phone: formData.company_phone || undefined,
          website: formData.website || undefined,
          business_license: formData.business_license || undefined,
          tax_id: formData.tax_id || undefined,
        })
      } else {
        StaffRegistrationSchema.parse({
          ...baseData,
          role: formData.role,
          department: formData.department || undefined,
        })
      }
      return true
    } catch (err: any) {
      setError(err.errors?.[0]?.message || 'Please check your input')
      return false
    }
  }

  const handleMagicLinkSignup = async () => {
    if (!formData.email || !formData.name) {
      setError('Please fill in at least email and name for magic link signup')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const supabase = createClientComponentClient()

      // Send magic link
      const { data, error } = await supabase.auth.signInWithOtp({
        email: formData.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/verify`,
          data: {
            name: formData.name,
            user_type: selectedUserType,
            phone: formData.phone,
            company_position: formData.company_position,
          }
        }
      })

      if (error) {
        if (error.message.includes('429') || error.message.includes('rate')) {
          setError('Rate limit reached. Please wait a few minutes and try again.')
        } else {
          setError(error.message)
        }
        return
      }

      setSuccess('Magic link sent! Check your email and click the link to complete registration.')
    } catch (err: any) {
      console.error('Magic link error:', err)
      setError('An unexpected error occurred during magic link signup')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('🚀 Registration form submitted - ENTRY POINT')

    try {
      e.preventDefault()
      console.log('✅ Event prevented successfully')

      console.log('📝 Form data:', formData)
      console.log('👤 Selected user type:', selectedUserType)

      if (!validateForm()) {
        console.log('❌ Form validation failed')
        return
      }

      console.log('✅ Form validation passed')
      setLoading(true)
      setError(null)
      setSuccess(null) // Clear any previous success messages
      console.log('✅ State updated successfully')
      console.log('🔧 Creating Supabase client...')
      const supabase = createClientComponentClient()

      // Debug: Check if client is properly configured
      console.log('🔧 Supabase client created, checking configuration...')
      console.log('🔧 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.log('🔧 Anon key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

      console.log('📧 Attempting to create auth user with minimal signup...')

      let authData, authError
      try {
        // Try the most basic signup possible
        const result = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password
        })
        authData = result.data
        authError = result.error
        console.log('📧 Signup completed without throwing error')
      } catch (signupException) {
        console.error('💥 Signup threw an exception:', signupException)
        setError(`Signup failed with exception: ${signupException.message}`)
        setLoading(false)
        return
      }

      console.log('📧 Auth signup response:', { authData, authError })

      if (authError) {
        console.error('❌ Auth error details:', authError)
        console.error('❌ Error message:', authError.message)
        console.error('❌ Error status:', authError.status)
        console.error('❌ Error code:', authError.__isAuthError ? 'AuthError' : 'Unknown')
        console.error('❌ Full error object:', JSON.stringify(authError, null, 2))

        if (authError.message.includes('429') || authError.message.includes('rate')) {
          setError('Rate limit reached. Please wait a few minutes and try again, or use the Magic Link option below.')
        } else if (authError.message.includes('invalid')) {
          setError('Please use a valid email address (e.g., yourname@gmail.com)')
        } else {
          setError(authError.message)
        }
        setLoading(false)
        return
      }

      if (!authData.user) {
        console.error('❌ No user data returned from auth signup')
        setError('Failed to create user account')
        setLoading(false)
        return
      }

      console.log('✅ Auth user created successfully!')
      console.log('📧 User ID:', authData.user.id)
      console.log('📧 User email:', authData.user.email)
      console.log('📧 User created_at:', authData.user.created_at)
      console.log('📧 User email_confirmed_at:', authData.user.email_confirmed_at)
      console.log('📧 Session exists:', !!authData.session)
      console.log('📧 Full user object:', authData.user)

      // Wait a moment for auth user to be fully committed
      console.log('⏳ Waiting for auth user to be committed...')
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Skip the getUser check since it seems to hang, go directly to sign-in
      console.log('🔍 Skipping user verification, proceeding to sign-in...')

      // Email confirmation is disabled, so user should be automatically authenticated
      console.log('✅ Auth user created successfully!')
      console.log('📧 Session details:', authData.session)

      // Check if user was actually created by trying to sign them in
      console.log('🔐 Attempting to sign in the newly created user...')

      let signInData, signInError
      try {
        const result = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        })
        signInData = result.data
        signInError = result.error
        console.log('🔐 Sign in completed without throwing error')
      } catch (signInException) {
        console.error('💥 Sign in threw an exception:', signInException)
        setError(`Sign in failed with exception: ${signInException.message}`)
        setLoading(false)
        return
      }

      console.log('🔐 Sign in result:', { signInData, signInError })

      if (signInError) {
        console.error('❌ Sign in failed:', signInError)

        // Handle email confirmation requirement
        if (signInError.message.includes('Email not confirmed') || signInError.message.includes('Invalid login credentials')) {
          console.log('📧 Email confirmation is required')
          setSuccess('Registration successful! Please check your email and click the confirmation link to activate your account. After confirming, you can sign in.')

          setTimeout(() => {
            router.push('/auth/login?message=Please check your email and confirm your account before signing in.')
          }, 3000)

          setLoading(false)
          return
        } else {
          setError(`Registration completed but sign-in failed: ${signInError.message}`)
          setLoading(false)
          return
        }
      }

      if (signInData.session && signInData.user) {
        console.log('🎉 User successfully signed in! Creating profile...')

        // Now create the user profile since they're authenticated
        try {
          // Create profile in the profiles table (linked to auth.users)
          const profileData = {
            id: authData.user.id,
            full_name: formData.name,
            role: selectedUserType,
            company_name: selectedUserType === 'reseller' ? formData.reseller_company_name : null,
            territory: selectedUserType === 'reseller' ? formData.reseller_territory : null,
            tier: selectedUserType === 'reseller' ? formData.reseller_tier : null,
            staff_role: selectedUserType !== 'reseller' ? formData.role || 'staff' : null,
          }

          console.log('👤 Creating user profile:', profileData)
          const { error: profileError } = await supabase
            .from('profiles')
            .insert(profileData)

          if (profileError) {
            console.error('❌ Profile creation error:', profileError)
            setError(`Profile creation failed: ${profileError.message}`)
            setLoading(false)
            return
          }

          console.log('✅ User profile created successfully!')

          // For resellers, also create entry in resellers table if needed
          if (selectedUserType === 'reseller') {
            const resellerData = {
              name: formData.reseller_company_name,
              email: formData.email,
              territory: formData.reseller_territory,
              tier: formData.reseller_tier,
              company_address: formData.company_address || null,
              company_phone: formData.company_phone || null,
              website: formData.website || null,
              business_license: formData.business_license || null,
              tax_id: formData.tax_id || null,
              primary_contact_name: formData.name,
              primary_contact_email: formData.email,
              primary_contact_phone: formData.phone || null,
            }

            console.log('🏢 Creating reseller company:', resellerData)
            const { data: resellerResult, error: resellerError } = await supabase
              .from('resellers')
              .insert(resellerData)
              .select()
              .single()

            if (resellerError) {
              console.error('❌ Reseller creation error:', resellerError)
              setError(`Reseller company creation failed: ${resellerError.message}`)
              setLoading(false)
              return
            }

            console.log('✅ Reseller company created successfully!')
          }

          setSuccess('Registration successful! Your account has been created and you are now signed in.')

          if (onSuccess) {
            onSuccess()
          } else {
            setTimeout(() => {
              router.push('/')
            }, 2000)
          }

        } catch (profileErr: any) {
          console.error('💥 Profile creation error:', profileErr)
          setError(`Failed to create user profile: ${profileErr.message}`)
        }
      } else {
        console.log('⚠️ No session created - user needs to sign in manually')
        setSuccess('Registration successful! You can now sign in with your credentials.')

        setTimeout(() => {
          router.push('/auth/login?message=Registration successful! You can now sign in.')
        }, 3000)
      }

      setLoading(false)
      return

    } catch (err: any) {
      console.error('💥 Unexpected registration error:', err)
      setError(`An unexpected error occurred during registration: ${err.message}`)
    } finally {
      console.log('🏁 Registration process finished, setting loading to false')
      setLoading(false)
    }
  }

  const getUserTypeIcon = (type: UserType['_type']) => {
    switch (type) {
      case 'site_admin':
        return Shield
      case 'vendor_user':
        return Users
      case 'reseller':
        return Building2
      default:
        return UserPlus
    }
  }

  const getUserTypeLabel = (type: UserType['_type']) => {
    switch (type) {
      case 'site_admin':
        return 'Site Administrator'
      case 'vendor_user':
        return 'Vendor User'
      case 'reseller':
        return 'Reseller Partner'
      default:
        return 'User'
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {React.createElement(getUserTypeIcon(selectedUserType), { className: "h-5 w-5" })}
          Register as {getUserTypeLabel(selectedUserType)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* User Type Selection (if not pre-selected) */}
          {!userType && (
            <div className="space-y-2">
              <Label htmlFor="user-type">User Type</Label>
              <Select value={selectedUserType} onValueChange={(value: UserType['_type']) => setSelectedUserType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reseller">Reseller Partner</SelectItem>
                  <SelectItem value="vendor_user">Vendor User</SelectItem>
                  <SelectItem value="site_admin">Site Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password *</Label>
              <Input
                id="confirm-password"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                required
                minLength={8}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-position">Position/Title</Label>
              <Input
                id="company-position"
                type="text"
                value={formData.company_position}
                onChange={(e) => handleInputChange('company_position', e.target.value)}
              />
            </div>
          </div>

          {/* Reseller-specific fields */}
          {selectedUserType === 'reseller' && (
            <>
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Company Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Company Name *</Label>
                    <Input
                      id="company-name"
                      type="text"
                      value={formData.reseller_company_name}
                      onChange={(e) => handleInputChange('reseller_company_name', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="territory">Territory *</Label>
                    <Input
                      id="territory"
                      type="text"
                      value={formData.reseller_territory}
                      onChange={(e) => handleInputChange('reseller_territory', e.target.value)}
                      required
                      placeholder="e.g., North America, EMEA, APAC"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="tier">Partner Tier</Label>
                    <Select value={formData.reseller_tier} onValueChange={(value: 'gold' | 'silver' | 'bronze') => handleInputChange('reseller_tier', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bronze">Bronze</SelectItem>
                        <SelectItem value="silver">Silver</SelectItem>
                        <SelectItem value="gold">Gold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-phone">Company Phone</Label>
                    <Input
                      id="company-phone"
                      type="tel"
                      value={formData.company_phone}
                      onChange={(e) => handleInputChange('company_phone', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <Label htmlFor="company-address">Company Address</Label>
                  <Textarea
                    id="company-address"
                    value={formData.company_address}
                    onChange={(e) => handleInputChange('company_address', e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      type="url"
                      value={formData.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      placeholder="https://example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business-license">Business License</Label>
                    <Input
                      id="business-license"
                      type="text"
                      value={formData.business_license}
                      onChange={(e) => handleInputChange('business_license', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <Label htmlFor="tax-id">Tax ID</Label>
                  <Input
                    id="tax-id"
                    type="text"
                    value={formData.tax_id}
                    onChange={(e) => handleInputChange('tax_id', e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {/* Staff-specific fields */}
          {(selectedUserType === 'site_admin' || selectedUserType === 'vendor_user') && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium mb-4">Staff Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={formData.role} onValueChange={(value: 'admin' | 'manager' | 'staff') => handleInputChange('role', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    type="text"
                    value={formData.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    placeholder="e.g., Sales, IT, Marketing"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>

            <div className="text-center text-sm text-gray-600">
              Having trouble with signup? Try magic link instead:
            </div>

            <Button
              type="button"
              onClick={handleMagicLinkSignup}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              {loading ? 'Sending Magic Link...' : 'Send Magic Link'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default UserRegistrationForm
