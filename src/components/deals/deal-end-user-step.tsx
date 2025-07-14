'use client'

import { useEffect, useState } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { DealStep2, EndUser } from '@/lib/types'
import { Search, Plus, AlertTriangle } from 'lucide-react'

interface DealEndUserStepProps {
  form: UseFormReturn<DealStep2>
  onDataChange: (data: Partial<DealStep2>) => void
}

export function DealEndUserStep({ form, onDataChange }: DealEndUserStepProps) {
  const { register, watch, setValue, formState: { errors } } = form
  const [searchResults, setSearchResults] = useState<EndUser[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showCreateNew, setShowCreateNew] = useState(false)
  const [duplicateWarnings, setDuplicateWarnings] = useState<string[]>([])

  const watchedValues = watch()

  useEffect(() => {
    onDataChange(watchedValues)
  }, [watchedValues, onDataChange])

  const searchEndUsers = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/end-users?search=${encodeURIComponent(query)}&limit=10`)
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.data || [])
        
        // Check for potential duplicates
        const warnings = data.data
          ?.filter((user: EndUser) => 
            user.company_name.toLowerCase().includes(query.toLowerCase()) ||
            user.contact_email.toLowerCase().includes(query.toLowerCase())
          )
          .map((user: EndUser) => 
            `Similar company found: ${user.company_name} (${user.territory})`
          ) || []
        
        setDuplicateWarnings(warnings)
      }
    } catch (error) {
      console.error('Error searching end users:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const selectEndUser = (endUser: EndUser) => {
    setValue('end_user.id', endUser.id)
    setValue('end_user.company_name', endUser.company_name)
    setValue('end_user.contact_name', endUser.contact_name)
    setValue('end_user.contact_email', endUser.contact_email)
    setValue('end_user.territory', endUser.territory)
    setSearchResults([])
    setShowCreateNew(false)
    setDuplicateWarnings([])
  }

  const clearSelection = () => {
    setValue('end_user.id', undefined)
    setValue('end_user.company_name', '')
    setValue('end_user.contact_name', '')
    setValue('end_user.contact_email', '')
    setValue('end_user.territory', '')
    setShowCreateNew(true)
    setDuplicateWarnings([])
  }

  const handleCompanyNameChange = (value: string) => {
    setValue('end_user.company_name', value)
    if (value.length >= 3) {
      searchEndUsers(value)
    } else {
      setSearchResults([])
      setDuplicateWarnings([])
    }
  }

  return (
    <div className="space-y-6">
      {/* Search existing end users */}
      <div className="space-y-2">
        <Label>Search Existing End Users</Label>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by company name or email..."
            className="pl-10"
            onChange={(e) => searchEndUsers(e.target.value)}
          />
        </div>
        
        {isSearching && (
          <p className="text-sm text-gray-500">Searching...</p>
        )}

        {searchResults.length > 0 && (
          <Card className="mt-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Existing End Users Found</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {searchResults.map((endUser) => (
                <div
                  key={endUser.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => selectEndUser(endUser)}
                >
                  <div>
                    <div className="font-medium">{endUser.company_name}</div>
                    <div className="text-sm text-gray-600">
                      {endUser.contact_name} • {endUser.contact_email}
                    </div>
                    <div className="text-sm text-gray-500">{endUser.territory}</div>
                  </div>
                  <Button variant="outline" size="sm">
                    Select
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Duplicate warnings */}
      {duplicateWarnings.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center text-yellow-800">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Potential Duplicates Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {duplicateWarnings.map((warning, index) => (
                <p key={index} className="text-sm text-yellow-700">{warning}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create new or show selected */}
      {!watchedValues.end_user?.id && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">End User Information</h3>
          <Button
            variant="outline"
            onClick={() => setShowCreateNew(true)}
            disabled={showCreateNew}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New End User
          </Button>
        </div>
      )}

      {/* Selected end user display */}
      {watchedValues.end_user?.id && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between text-green-800">
              Selected End User
              <Button variant="outline" size="sm" onClick={clearSelection}>
                Change
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Company:</span> {watchedValues.end_user.company_name}
              </div>
              <div>
                <span className="font-medium">Contact:</span> {watchedValues.end_user.contact_name}
              </div>
              <div>
                <span className="font-medium">Email:</span> {watchedValues.end_user.contact_email}
              </div>
              <div>
                <span className="font-medium">Territory:</span> {watchedValues.end_user.territory}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* End user form */}
      {(showCreateNew || !watchedValues.end_user?.id) && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name *</Label>
              <Input
                {...register('end_user.company_name')}
                placeholder="Enter company name"
                onChange={(e) => handleCompanyNameChange(e.target.value)}
              />
              {errors.end_user?.company_name && (
                <p className="text-red-500 text-sm">{errors.end_user.company_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_name">Contact Name *</Label>
              <Input
                {...register('end_user.contact_name')}
                placeholder="Enter contact name"
              />
              {errors.end_user?.contact_name && (
                <p className="text-red-500 text-sm">{errors.end_user.contact_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_email">Contact Email *</Label>
              <Input
                {...register('end_user.contact_email')}
                type="email"
                placeholder="Enter contact email"
              />
              {errors.end_user?.contact_email && (
                <p className="text-red-500 text-sm">{errors.end_user.contact_email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="territory">Territory *</Label>
              <Input
                {...register('end_user.territory')}
                placeholder="Enter territory"
              />
              {errors.end_user?.territory && (
                <p className="text-red-500 text-sm">{errors.end_user.territory.message}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Step 2: End User Information</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Search for existing end users to avoid duplicates</li>
          <li>• Select an existing end user or create a new one</li>
          <li>• Ensure territory information is accurate for proper assignment</li>
          <li>• Contact information will be used for deal communications</li>
        </ul>
      </div>
    </div>
  )
}
