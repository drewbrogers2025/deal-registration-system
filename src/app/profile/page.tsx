'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
   
   
   
   
} from '@/components/ui/select'
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  MapPin, 
  Globe, 
  FileText,
  Shield,
  Users,
  Save,
  Edit
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

export default function ProfilePage() {
  const { authUser, refreshUser } = useAuth()
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    company_position: '',
    // Reseller company fields
    company_address: '',
    company_phone: '',
    website: '',
    business_license: '',
    tax_id: '',
    // Staff fields
    department: '',
  })

  const supabase = createClientComponentClient()

  useEffect(() => {
    if (authUser) {
      setFormData({
        name: authUser.name || '',
        phone: authUser.phone || '',
        company_position: authUser.company_position || '',
        company_address: '',
        company_phone: '',
        website: '',
        business_license: '',
        tax_id: '',
        department: authUser.staff_user?.department || '',
      })
      
      // Fetch additional reseller company data if user is a reseller
      if (authUser.user_type === 'reseller' && authUser.reseller_user) {
        fetchResellerCompanyData(authUser.reseller_user.reseller_id)
      }
    }
  }, [authUser, fetchResellerCompanyData])

  const fetchResellerCompanyData = async (resellerId: string) => {
    try {
      const { data: resellerData, error } = await supabase
        .from('resellers')
        .select('company_address, company_phone, website, business_license, tax_id')
        .eq('id', resellerId)
        .single()

      if (error) {
        console.error('Error fetching reseller data:', error)
        return
      }

      if (resellerData) {
        setFormData(prev => ({
          ...prev,
          company_address: resellerData.company_address || '',
          company_phone: resellerData.company_phone || '',
          website: resellerData.website || '',
          business_license: resellerData.business_license || '',
          tax_id: resellerData.tax_id || '',
        }))
      }
    } catch (_err) {
      console.error('Error fetching reseller company data:', err)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
    setSuccess(null)
  }

  const handleSave = async () => {
    if (!authUser) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Update user profile
      const { error: userError } = await supabase
        .from('users')
        .update({
          name: formData.name,
          phone: formData.phone || null,
          company_position: formData.company_position || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', authUser.id)

      if (userError) {
        throw userError
      }

      // Update staff user data if applicable
      if (authUser.user_type === 'site_admin' || authUser.user_type === 'vendor_user') {
        const { error: staffError } = await supabase
          .from('staff_users')
          .update({
            department: formData.department || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', authUser.id)

        if (staffError) {
          console.error('Error updating staff data:', staffError)
          // Don't fail the whole update for this
        }
      }

      // Update reseller company data if applicable
      if (authUser.user_type === 'reseller' && authUser.reseller_user) {
        const { error: resellerError } = await supabase
          .from('resellers')
          .update({
            company_address: formData.company_address || null,
            company_phone: formData.company_phone || null,
            website: formData.website || null,
            business_license: formData.business_license || null,
            tax_id: formData.tax_id || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', authUser.reseller_user.reseller_id)

        if (resellerError) {
          console.error('Error updating reseller data:', resellerError)
          // Don't fail the whole update for this
        }
      }

      // Refresh user data
      await refreshUser()
      
      setSuccess('Profile updated successfully!')
      setEditing(false)

    } catch (err: unknown) {
      console.error('Error updating profile:', err)
      setError(err.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const getUserTypeIcon = () => {
    if (!authUser) return <User className="h-5 w-5" />
    
    switch (authUser.user_type) {
      case 'site_admin':
        return <Shield className="h-5 w-5 text-red-600" />
      case 'vendor_user':
        return <Users className="h-5 w-5 text-blue-600" />
      case 'reseller':
        return <Building2 className="h-5 w-5 text-green-600" />
      default:
        return <User className="h-5 w-5" />
    }
  }

  const getUserTypeLabel = () => {
    if (!authUser) return 'User'
    
    switch (authUser.user_type) {
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

  const getStatusBadge = () => {
    if (!authUser) return null
    
    switch (authUser.approval_status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      case 'pending':
        return <Badge variant="secondary">Pending Approval</Badge>
    }
  }

  if (!authUser) {
    return (
      <MainLayout title="Profile" subtitle="Manage your account information">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading profile...</div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout title="Profile" subtitle="Manage your account information">
      <div className="max-w-4xl mx-auto space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Profile Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {getUserTypeIcon()}
                  <div>
                    <CardTitle className="text-2xl">{authUser.name}</CardTitle>
                    <p className="text-gray-600">{getUserTypeLabel()}</p>
                  </div>
                </div>
                {getStatusBadge()}
              </div>
              <Button
                onClick={() => editing ? handleSave() : setEditing(true)}
                disabled={loading}
              >
                {editing ? (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </>
                ) : (
                  <>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Profile
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                {editing ? (
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                  />
                ) : (
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <User className="h-4 w-4 text-gray-400" />
                    <span>{authUser.name}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span>{authUser.email}</span>
                  <Badge variant="outline" className="ml-auto">Read Only</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                {editing ? (
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                  />
                ) : (
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{authUser.phone || 'Not provided'}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Position/Title</Label>
                {editing ? (
                  <Input
                    id="position"
                    value={formData.company_position}
                    onChange={(e) => handleInputChange('company_position', e.target.value)}
                  />
                ) : (
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span>{authUser.company_position || 'Not provided'}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Staff Information */}
        {(authUser.user_type === 'site_admin' || authUser.user_type === 'vendor_user') && (
          <Card>
            <CardHeader>
              <CardTitle>Staff Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <Shield className="h-4 w-4 text-gray-400" />
                    <span className="capitalize">{authUser.staff_user?.role || 'Not assigned'}</span>
                    <Badge variant="outline" className="ml-auto">System Assigned</Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  {editing ? (
                    <Input
                      id="department"
                      value={formData.department}
                      onChange={(e) => handleInputChange('department', e.target.value)}
                      placeholder="e.g., Sales, IT, Marketing"
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <span>{authUser.staff_user?.department || 'Not specified'}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reseller Information */}
        {authUser.user_type === 'reseller' && authUser.reseller_user && (
          <Card>
            <CardHeader>
              <CardTitle>Reseller Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <span>{authUser.reseller_user.reseller?.name || 'Not available'}</span>
                    <Badge variant="outline" className="ml-auto">Company Profile</Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Territory</Label>
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span>{authUser.reseller_user.reseller?.territory || 'Not assigned'}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Partner Tier</Label>
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <Shield className="h-4 w-4 text-gray-400" />
                    <span className="capitalize">{authUser.reseller_user.reseller?.tier || 'Not assigned'}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Deal Creation</Label>
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span>{authUser.reseller_user.can_create_deals ? 'Enabled' : 'Disabled'}</span>
                    <Badge
                      variant={authUser.reseller_user.can_create_deals ? "default" : "secondary"}
                      className="ml-auto"
                    >
                      {authUser.reseller_user.can_create_deals ? 'Active' : 'Restricted'}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Company Details</h4>

                <div className="space-y-2">
                  <Label htmlFor="company-address">Company Address</Label>
                  {editing ? (
                    <Textarea
                      id="company-address"
                      value={formData.company_address}
                      onChange={(e) => handleInputChange('company_address', e.target.value)}
                      rows={3}
                    />
                  ) : (
                    <div className="p-2 bg-gray-50 rounded min-h-[80px]">
                      <span>{formData.company_address || 'Not provided'}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-phone">Company Phone</Label>
                    {editing ? (
                      <Input
                        id="company-phone"
                        type="tel"
                        value={formData.company_phone}
                        onChange={(e) => handleInputChange('company_phone', e.target.value)}
                      />
                    ) : (
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span>{formData.company_phone || 'Not provided'}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    {editing ? (
                      <Input
                        id="website"
                        type="url"
                        value={formData.website}
                        onChange={(e) => handleInputChange('website', e.target.value)}
                        placeholder="https://example.com"
                      />
                    ) : (
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <Globe className="h-4 w-4 text-gray-400" />
                        {formData.website ? (
                          <a
                            href={formData.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {formData.website}
                          </a>
                        ) : (
                          <span>Not provided</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="business-license">Business License</Label>
                    {editing ? (
                      <Input
                        id="business-license"
                        value={formData.business_license}
                        onChange={(e) => handleInputChange('business_license', e.target.value)}
                      />
                    ) : (
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span>{formData.business_license || 'Not provided'}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tax-id">Tax ID</Label>
                    {editing ? (
                      <Input
                        id="tax-id"
                        value={formData.tax_id}
                        onChange={(e) => handleInputChange('tax_id', e.target.value)}
                      />
                    ) : (
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span>{formData.tax_id || 'Not provided'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Account Created</Label>
                <div className="p-2 bg-gray-50 rounded">
                  <span>{new Date(authUser.created_at!).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Last Updated</Label>
                <div className="p-2 bg-gray-50 rounded">
                  <span>{new Date(authUser.updated_at!).toLocaleDateString()}</span>
                </div>
              </div>

              {authUser.approved_at && (
                <div className="space-y-2">
                  <Label>Approved Date</Label>
                  <div className="p-2 bg-gray-50 rounded">
                    <span>{new Date(authUser.approved_at).toLocaleDateString()}</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {editing && (
          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setEditing(false)
                setError(null)
                setSuccess(null)
                // Reset form data
                if (authUser) {
                  setFormData({
                    name: authUser.name || '',
                    phone: authUser.phone || '',
                    company_position: authUser.company_position || '',
                    company_address: formData.company_address,
                    company_phone: formData.company_phone,
                    website: formData.website,
                    business_license: formData.business_license,
                    tax_id: formData.tax_id,
                    department: authUser.staff_user?.department || '',
                  })
                }
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
